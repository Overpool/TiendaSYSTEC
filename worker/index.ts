// API de TiendaSYSTEC en Cloudflare Workers.
// - Sirve el frontend (React/Vite) como assets estáticos (configurado en wrangler.jsonc)
// - Atiende todo lo que empieza con /api/* usando Neon (Postgres) y R2 (imágenes)

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
    hashPassword, isHashed, verifyPassword, signJwt, verifyJwt,
    sessionCookie, readCookie, SESSION_COOKIE, SESSION_TTL, randomCode, sha256Hex,
} from './auth';

export interface Env {
    DATABASE_URL: string;      // secreto: cadena de conexión de Neon
    JWT_SECRET: string;        // secreto: cadena aleatoria larga
    IMAGES: R2Bucket;          // bucket R2 para imágenes de productos
    RESEND_API_KEY?: string;   // opcional: para enviar el código de recuperación por correo
    MAIL_FROM?: string;        // opcional: remitente, ej. "SYSTEC <no-reply@systecfl.site>"
}

type Sql = NeonQueryFunction<false, false>;
type Role = 'admin' | 'employee' | 'shopper';
interface DbUser {
    id: string; name: string; email: string; password: string; role: Role;
    permissions: string[] | null; wishlist: string[] | null;
    dni: string | null; phone: string | null; address: string | null; city: string | null;
    zip_code: string | null; country: string | null; created_at: string;
}

class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const assertUuid = (id: string) => { if (!UUID_RE.test(id)) throw new HttpError(400, 'ID de producto inválido'); return id; };

const json = (data: unknown, init: ResponseInit = {}) => Response.json(data, init);
const num = (v: unknown) => (v === null || v === undefined ? v : Number(v));

// ---------- Mapeos DB (snake_case) -> Frontend (camelCase) ----------

const mapProduct = (p: any) => ({
    id: p.id, code: p.code, name: p.name, brand: p.brand, category: p.category,
    price: num(p.price), cost: num(p.cost), stock: Number(p.stock), minStock: Number(p.min_stock ?? 0),
    description: p.description, image: p.image, isSale: Boolean(p.is_sale),
    discountPrice: num(p.discount_price) ?? 0,
});

const mapSale = (s: any) => ({
    id: s.id, userId: s.user_id, total: num(s.total), paymentMethod: s.payment_method, date: s.date, items: s.items ?? [],
});

const mapPurchase = (p: any) => ({
    id: p.id, supplier: p.supplier, total: num(p.total), date: p.date, items: p.items ?? [],
});

// Nunca devolvemos la contraseña al navegador
const mapUser = (u: DbUser) => ({
    id: u.id, name: u.name, email: u.email, role: u.role, permissions: u.permissions ?? [],
    wishlist: u.wishlist ?? [], dni: u.dni, phone: u.phone, address: u.address, city: u.city,
    zipCode: u.zip_code, country: u.country, createdAt: u.created_at,
});

// ---------- Sesión y permisos ----------

async function getSessionUser(req: Request, env: Env, sql: Sql): Promise<DbUser | null> {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return null;
    const payload = await verifyJwt<{ sub: string }>(token, env.JWT_SECRET);
    if (!payload?.sub) return null;
    const rows = (await sql`select * from users where id = ${payload.sub}`) as DbUser[];
    return rows[0] ?? null;
}

const isStaff = (u: DbUser | null) => !!u && (u.role === 'admin' || u.role === 'employee');

/** admin siempre puede; employee necesita el permiso indicado (o solo ser staff si perm es undefined) */
function requireStaff(u: DbUser | null, perm?: string): DbUser {
    if (!u) throw new HttpError(401, 'No autenticado');
    if (u.role === 'admin') return u;
    if (u.role === 'employee' && (!perm || (u.permissions ?? []).includes(perm))) return u;
    throw new HttpError(403, 'No autorizado');
}

async function body<T = any>(req: Request): Promise<T> {
    try { return (await req.json()) as T; } catch { throw new HttpError(400, 'JSON inválido'); }
}

// ---------- Router ----------

export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        const url = new URL(req.url);
        const path = url.pathname.replace(/\/+$/, '');
        const method = req.method;

        if (!path.startsWith('/api')) return new Response('Not found', { status: 404 });

        try {
            // Imágenes desde R2 (no necesitan base de datos)
            if (path.startsWith('/api/images/') && method === 'GET') {
                const key = decodeURIComponent(path.slice('/api/images/'.length));
                const obj = await env.IMAGES.get(key);
                if (!obj) return new Response('Not found', { status: 404 });
                const headers = new Headers();
                obj.writeHttpMetadata(headers);
                headers.set('etag', obj.httpEtag);
                headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                return new Response(obj.body, { headers });
            }

            const sql = neon(env.DATABASE_URL);
            const me = await getSessionUser(req, env, sql);
            const seg = path.split('/').slice(2); // ['products', ':id'] etc.

            // ===== PRODUCTOS =====
            // Catálogo público (se mantiene /api/productos que ya usa el frontend)
            if ((path === '/api/productos' || path === '/api/products') && method === 'GET') {
                const rows = await sql`select * from products order by name`;
                return json(rows.map(mapProduct), {
                    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
                });
            }

            if (seg[0] === 'products' && method === 'POST' && seg.length === 1) {
                requireStaff(me, 'inventory');
                const p = await body(req);
                const rows = await sql`
                    insert into products (code, name, brand, category, price, cost, stock, min_stock, description, image, is_sale, discount_price)
                    values (${p.code ?? null}, ${p.name}, ${p.brand ?? null}, ${p.category ?? null}, ${p.price}, ${p.cost},
                            ${p.stock ?? 0}, ${p.minStock ?? 0}, ${p.description ?? null}, ${p.image ?? null},
                            ${!!p.isSale}, ${p.discountPrice || null})
                    returning *`;
                return json(mapProduct(rows[0]), { status: 201 });
            }

            if (seg[0] === 'products' && seg[1] && method === 'PATCH') {
                requireStaff(me, 'inventory');
                assertUuid(seg[1]);
                const u = await body(req);
                const map: Record<string, string> = {
                    name: 'name', code: 'code', brand: 'brand', category: 'category', price: 'price', cost: 'cost',
                    stock: 'stock', minStock: 'min_stock', description: 'description', image: 'image',
                    isSale: 'is_sale', discountPrice: 'discount_price',
                };
                const sets: string[] = [];
                const params: unknown[] = [];
                for (const [k, col] of Object.entries(map)) {
                    if (u[k] !== undefined) { params.push(u[k]); sets.push(`${col} = $${params.length}`); }
                }
                if (sets.length === 0) return json({ ok: true });
                params.push(seg[1]);
                const rows = await sql.query(`update products set ${sets.join(', ')} where id = $${params.length} returning *`, params);
                return json(rows[0] ? mapProduct(rows[0]) : null);
            }

            if (seg[0] === 'products' && seg[1] && method === 'DELETE') {
                requireStaff(me, 'inventory');
                assertUuid(seg[1]);
                await sql`delete from products where id = ${seg[1]}`;
                return json({ ok: true });
            }

            // Subida de imagen a R2
            if (path === '/api/upload' && method === 'POST') {
                requireStaff(me, 'inventory');
                const form = await req.formData();
                const file = form.get('file');
                if (!(file instanceof File)) throw new HttpError(400, 'Falta el archivo');
                if (!file.type.startsWith('image/')) throw new HttpError(400, 'Solo se permiten imágenes');
                if (file.size > 5 * 1024 * 1024) throw new HttpError(400, 'La imagen supera 5 MB');
                const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
                const key = `products/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
                await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
                return json({ url: `/api/images/${key}` }, { status: 201 });
            }

            // ===== VENTAS =====
            if (path === '/api/sales' && method === 'GET') {
                requireStaff(me);
                const rows = await sql`select * from sales order by date desc`;
                return json(rows.map(mapSale));
            }

            // Crear venta: tienda online (invitado o cliente) y POS.
            // El total y el descuento de stock se calculan en el servidor con los precios reales.
            if (path === '/api/sales' && method === 'POST') {
                const s = await body(req);
                const items: any[] = Array.isArray(s.items) ? s.items : [];
                if (items.length === 0) throw new HttpError(400, 'La venta no tiene productos');
                const allowed = ['cash', 'card', 'yape', 'plin'];
                if (!allowed.includes(s.paymentMethod)) throw new HttpError(400, 'Método de pago inválido');
                if (s.paymentMethod === 'cash' && !isStaff(me)) throw new HttpError(403, 'Pago en efectivo solo en POS');

                const ids = items.map((i) => assertUuid(String(i.id)));
                const dbProducts = await sql`select * from products where id = any(${ids}::uuid[])`;
                const byId = new Map(dbProducts.map((p: any) => [p.id, p]));
                let total = 0;
                const cleanItems = items.map((i) => {
                    const p: any = byId.get(String(i.id));
                    if (!p) throw new HttpError(400, `Producto no existe: ${i.name ?? i.id}`);
                    const qty = Math.max(1, Math.floor(Number(i.quantity) || 1));
                    const unit = p.is_sale && Number(p.discount_price) > 0 ? Number(p.discount_price) : Number(p.price);
                    total += unit * qty;
                    return { ...mapProduct(p), price: unit, quantity: qty };
                });
                total = Math.round(total * 100) / 100;

                const results = await sql.transaction([
                    sql`insert into sales (user_id, total, payment_method, date, items)
                        values (${me?.id ?? null}, ${total}, ${s.paymentMethod}, now(), ${JSON.stringify(cleanItems)}::jsonb)
                        returning *`,
                    ...cleanItems.map((i) => sql`update products set stock = stock - ${i.quantity} where id = ${i.id}`),
                ]);
                return json(mapSale((results[0] as any[])[0]), { status: 201 });
            }

            // ===== COMPRAS =====
            if (path === '/api/purchases' && method === 'GET') {
                requireStaff(me, 'inventory');
                const rows = await sql`select * from purchases order by date desc`;
                return json(rows.map(mapPurchase));
            }

            if (path === '/api/purchases' && method === 'POST') {
                requireStaff(me, 'inventory');
                const p = await body(req);
                const items: any[] = Array.isArray(p.items) ? p.items : [];
                if (!p.supplier || items.length === 0) throw new HttpError(400, 'Compra incompleta');
                const id = String(p.id || crypto.randomUUID());
                const results = await sql.transaction([
                    sql`insert into purchases (id, supplier, total, date, items)
                        values (${id}, ${p.supplier}, ${Number(p.total) || 0}, ${p.date ?? new Date().toISOString()}, ${JSON.stringify(items)}::jsonb)
                        returning *`,
                    ...items.filter((i) => UUID_RE.test(String(i.id))).map((i) => sql`update products set stock = stock + ${Math.floor(Number(i.quantity) || 0)} where id = ${i.id}`),
                ]);
                return json(mapPurchase((results[0] as any[])[0]), { status: 201 });
            }

            // ===== AUTENTICACIÓN =====
            if (path === '/api/auth/me' && method === 'GET') {
                return json({ user: me ? mapUser(me) : null });
            }

            if (path === '/api/auth/login' && method === 'POST') {
                const { email, password } = await body(req);
                const rows = (await sql`select * from users where lower(email) = lower(${String(email || '')})`) as DbUser[];
                const user = rows[0];
                if (!user || !(await verifyPassword(String(password || ''), user.password))) {
                    throw new HttpError(401, 'Credenciales inválidas');
                }
                // Migración transparente: si la contraseña venía en texto plano desde Supabase, se hashea ahora
                if (!isHashed(user.password)) {
                    await sql`update users set password = ${await hashPassword(String(password))} where id = ${user.id}`;
                }
                const token = await signJwt({ sub: user.id }, env.JWT_SECRET, SESSION_TTL);
                return json({ user: mapUser(user) }, { headers: { 'Set-Cookie': sessionCookie(token) } });
            }

            if (path === '/api/auth/logout' && method === 'POST') {
                return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
            }

            if (path === '/api/auth/register' && method === 'POST') {
                const { name, email, password } = await body(req);
                if (!name || !email || !password || String(password).length < 6) {
                    throw new HttpError(400, 'Datos incompletos (la contraseña debe tener al menos 6 caracteres)');
                }
                const exists = await sql`select 1 from users where lower(email) = lower(${email})`;
                if (exists.length) throw new HttpError(409, 'Ya existe una cuenta con este correo');
                const rows = (await sql`
                    insert into users (id, name, email, password, role, permissions, wishlist)
                    values (${Date.now().toString()}, ${name}, ${email}, ${await hashPassword(password)}, 'shopper', '{}', '{}')
                    returning *`) as DbUser[];
                return json({ user: mapUser(rows[0]) }, { status: 201 });
            }

            // Recuperación de contraseña: paso 1, enviar código al correo
            if (path === '/api/auth/forgot' && method === 'POST') {
                const { email } = await body(req);
                const rows = (await sql`select * from users where lower(email) = lower(${String(email || '')})`) as DbUser[];
                if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
                    throw new HttpError(503, 'El envío de correos no está configurado. Contacta al administrador.');
                }
                // Respondemos igual exista o no el correo, para no revelar qué cuentas existen
                if (rows[0]) {
                    const code = randomCode();
                    await sql`insert into password_resets (email, code_hash, expires_at)
                              values (${rows[0].email}, ${await sha256Hex(code)}, now() + interval '15 minutes')`;
                    const r = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: env.MAIL_FROM,
                            to: rows[0].email,
                            subject: 'Tu código para restablecer la contraseña - SYSTEC',
                            html: `<p>Hola ${rows[0].name},</p><p>Tu código es: <b style="font-size:20px">${code}</b></p><p>Vence en 15 minutos. Si no lo pediste, ignora este correo.</p>`,
                        }),
                    });
                    if (!r.ok) console.error('Resend error', r.status, await r.text());
                }
                return json({ ok: true });
            }

            // Recuperación de contraseña: paso 2, validar código y guardar nueva contraseña
            if (path === '/api/auth/reset' && method === 'POST') {
                const { email, code, password } = await body(req);
                if (!password || String(password).length < 6) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
                const rows = await sql`
                    select id from password_resets
                    where lower(email) = lower(${String(email || '')}) and code_hash = ${await sha256Hex(String(code || ''))}
                      and used = false and expires_at > now()
                    order by created_at desc limit 1`;
                if (!rows[0]) throw new HttpError(400, 'El código es inválido o ha expirado');
                await sql.transaction([
                    sql`update password_resets set used = true where id = ${rows[0].id}`,
                    sql`update users set password = ${await hashPassword(password)} where lower(email) = lower(${email})`,
                ]);
                return json({ ok: true });
            }

            // ===== USUARIOS =====
            if (path === '/api/users' && method === 'GET') {
                requireStaff(me, 'users');
                const rows = (await sql`select * from users order by created_at`) as DbUser[];
                return json(rows.map(mapUser));
            }

            if (path === '/api/users' && method === 'POST') {
                const admin = requireStaff(me, 'users');
                const u = await body(req);
                if (!u.name || !u.email || !u.password) throw new HttpError(400, 'Datos incompletos');
                // Solo un admin puede crear otro admin
                const role: Role = ['admin', 'employee', 'shopper'].includes(u.role) ? u.role : 'employee';
                if (role === 'admin' && admin.role !== 'admin') throw new HttpError(403, 'Solo un admin puede crear administradores');
                const rows = (await sql`
                    insert into users (id, name, email, password, role, permissions, wishlist)
                    values (${Date.now().toString()}, ${u.name}, ${u.email}, ${await hashPassword(u.password)}, ${role},
                            ${u.permissions ?? []}, '{}')
                    returning *`) as DbUser[];
                return json(mapUser(rows[0]), { status: 201 });
            }

            if (seg[0] === 'users' && seg[1] && method === 'PATCH') {
                if (!me) throw new HttpError(401, 'No autenticado');
                const targetId = seg[1];
                const isSelf = me.id === targetId;
                const u = await body(req);
                // Un usuario puede editar su propio perfil; para editar a otros necesita permiso 'users'
                if (!isSelf) requireStaff(me, 'users');

                const profileFields: Record<string, string> = {
                    name: 'name', dni: 'dni', phone: 'phone', address: 'address', city: 'city', zipCode: 'zip_code', country: 'country',
                };
                const adminFields: Record<string, string> = { email: 'email', role: 'role', permissions: 'permissions' };
                const sets: string[] = [];
                const params: unknown[] = [];
                for (const [k, col] of Object.entries(profileFields)) {
                    if (u[k] !== undefined) { params.push(u[k]); sets.push(`${col} = $${params.length}`); }
                }
                if (!isSelf || me.role === 'admin') {
                    for (const [k, col] of Object.entries(adminFields)) {
                        if (u[k] === undefined) continue;
                        if (k === 'role' && u[k] === 'admin' && me.role !== 'admin') throw new HttpError(403, 'No autorizado');
                        params.push(u[k]); sets.push(`${col} = $${params.length}`);
                    }
                }
                if (u.password) { params.push(await hashPassword(String(u.password))); sets.push(`password = $${params.length}`); }
                if (sets.length === 0) return json({ ok: true });
                params.push(targetId);
                const rows = (await sql.query(`update users set ${sets.join(', ')} where id = $${params.length} returning *`, params)) as DbUser[];
                return json(rows[0] ? mapUser(rows[0]) : null);
            }

            if (seg[0] === 'users' && seg[1] && method === 'DELETE') {
                requireStaff(me, 'users');
                await sql`delete from users where id = ${seg[1]} and role <> 'admin'`;
                return json({ ok: true });
            }

            // Lista de deseos del usuario actual
            if (path === '/api/me/wishlist' && method === 'PUT') {
                if (!me) throw new HttpError(401, 'No autenticado');
                const { wishlist } = await body(req);
                const list = Array.isArray(wishlist) ? wishlist.map(String) : [];
                await sql`update users set wishlist = ${list} where id = ${me.id}`;
                return json({ wishlist: list });
            }

            return json({ error: 'Ruta no encontrada' }, { status: 404 });
        } catch (err: any) {
            if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
            console.error(err);
            return json({ error: 'Error interno del servidor' }, { status: 500 });
        }
    },
} satisfies ExportedHandler<Env>;
