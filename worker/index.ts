// API de TiendaSYSTEC en Cloudflare Workers.
// - Sirve el frontend (React/Vite) como assets estáticos (configurado en wrangler.jsonc)
// - Atiende todo lo que empieza con /api/* usando Neon (Postgres) y R2 (imágenes)

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
    hashPassword, isHashed, verifyPassword, signJwt, verifyJwt,
    sessionCookie, readCookie, SESSION_COOKIE, SESSION_TTL, randomCode, sha256Hex,
} from './auth';
import { culqiRequest, culqiUserMessage, pick3DS, WALLET_MIN_CENTS, WALLET_MAX_CENTS } from './culqi';
import { getShalomAgencies, fetchDni, buildTicketEmail } from './shipping';
import {
    parseComplaint, complaintCode, responseDeadline, complaintToApi, mapComplaintRow,
    complaintReceiptEmail, complaintNoticeEmail, complaintResponseEmail,
} from './complaints';
import { BUSINESS } from '../shared/business';

export interface Env {
    DATABASE_URL: string;      // secreto: cadena de conexión de Neon
    JWT_SECRET: string;        // secreto: cadena aleatoria larga
    IMAGES: R2Bucket;          // bucket R2 para imágenes de productos
    RESEND_API_KEY?: string;   // opcional: para enviar el código de recuperación por correo
    MAIL_FROM?: string;        // opcional: remitente, ej. "SYSTEC <no-reply@systecfl.site>"
    TURNSTILE_SITE_KEY?: string;   // pública: clave del widget de Turnstile (vars)
    TURNSTILE_SECRET_KEY?: string; // secreto: valida los tokens de Turnstile en el servidor
    DEV_LOG_CODES?: string;        // solo en .dev.vars: "true" muestra el código en la consola si no hay Resend
    CULQI_PUBLIC_KEY?: string;     // pública: llave pk_test_/pk_live_ de Culqi (vars)
    CULQI_SECRET_KEY?: string;     // secreto: llave sk_test_/sk_live_ de Culqi para cobrar
    CULQI_WEBHOOK_USER?: string;     // opcional: usuario de la autenticación del webhook en CulqiPanel
    CULQI_WEBHOOK_PASSWORD?: string; // opcional: contraseña de la autenticación del webhook
    APISPERU_TOKEN?: string;       // secreto: token de apisPeru para consultar DNI
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
    paymentRef: s.payment_ref ?? null, customer: s.customer ?? null,
});

const SHIPMENT_STATUSES = ['pendiente', 'preparando', 'enviado', 'en_agencia', 'entregado', 'cancelado'];

const mapShipment = (r: any) => ({
    id: r.id, saleId: r.sale_id, status: r.status, dni: r.dni, recipientName: r.recipient_name, phone: r.phone,
    email: r.email, department: r.department, province: r.province, agency: r.agency, trackingCode: r.tracking_code,
    notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
    sale: { total: num(r.total), items: r.items ?? [], paymentMethod: r.payment_method, paymentRef: r.payment_ref, date: r.date },
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

// ---------- Ventas y pagos ----------

type SaleItem = ReturnType<typeof mapProduct> & { quantity: number };

/** Precios reales desde la base de datos (nunca los del navegador). Junta líneas repetidas del mismo producto. */
async function priceCart(sql: Sql, rawItems: unknown, checkStock: boolean) {
    const items: any[] = Array.isArray(rawItems) ? rawItems : [];
    if (items.length === 0) throw new HttpError(400, 'La venta no tiene productos');
    if (items.length > 100) throw new HttpError(400, 'Demasiados productos en una sola venta');
    const qtyById = new Map<string, number>();
    for (const i of items) {
        const id = assertUuid(String(i?.id));
        qtyById.set(id, (qtyById.get(id) ?? 0) + Math.max(1, Math.floor(Number(i.quantity) || 1)));
    }
    const dbProducts = await sql`select * from products where id = any(${[...qtyById.keys()]}::uuid[])`;
    const byId = new Map(dbProducts.map((p: any) => [p.id, p]));
    let totalCents = 0;
    const cleanItems: SaleItem[] = [...qtyById].map(([id, qty]) => {
        const p: any = byId.get(id);
        if (!p) throw new HttpError(400, 'Uno de los productos ya no existe. Actualiza tu carrito.');
        if (checkStock && Number(p.stock) < qty) {
            throw new HttpError(409, `Stock insuficiente para "${String(p.name).trim()}" (disponibles: ${Math.max(0, Number(p.stock))})`);
        }
        const unit = p.is_sale && Number(p.discount_price) > 0 ? Number(p.discount_price) : Number(p.price);
        totalCents += Math.round(unit * 100) * qty;
        return { ...mapProduct(p), price: unit, quantity: qty };
    });
    return { cleanItems, totalCents, total: totalCents / 100 };
}

interface Customer { firstName: string; lastName: string; email: string; phone: string; dni: string }
interface Shipping {
    dni: string; recipientName: string; phone: string; email: string; department: string; province: string;
    agency: { id: number | null; nombre: string; direccion: string; distrito: string; horario: string };
}

/** Inserta la venta, su envío (ventas online) y descuenta el stock (para usar dentro de sql.transaction) */
function saleQueries(sql: Sql, s: {
    id: string; userId: string | null; total: number; paymentMethod: string; items: SaleItem[];
    paymentRef?: string | null; customer?: Customer | null; shipping?: Shipping | null;
}) {
    const sh = s.shipping;
    return [
        sql`insert into sales (id, user_id, total, payment_method, date, items, payment_ref, customer)
            values (${s.id}, ${s.userId}, ${s.total}, ${s.paymentMethod}, now(), ${JSON.stringify(s.items)}::jsonb,
                    ${s.paymentRef ?? null}, ${s.customer ? JSON.stringify(s.customer) : null}::jsonb)
            returning *`,
        ...(sh ? [sql`insert into shipments (sale_id, dni, recipient_name, phone, email, department, province, agency)
                      values (${s.id}, ${sh.dni}, ${sh.recipientName}, ${sh.phone}, ${sh.email}, ${sh.department},
                              ${sh.province}, ${JSON.stringify(sh.agency)}::jsonb)`] : []),
        ...s.items.map((i) => sql`update products set stock = stock - ${i.quantity} where id = ${i.id}`),
    ];
}

const cleanText = (v: unknown, max: number) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

/**
 * Comprador online: debe haber iniciado sesión (el correo es el de su cuenta) y el nombre se toma
 * del DNI verificado con apisPeru, no del navegador. La agencia se valida contra la lista de Shalom.
 */
async function parseCheckout(sql: Sql, me: DbUser | null, raw: any): Promise<{ customer: Customer; shipping: Shipping }> {
    if (!me) throw new HttpError(401, 'Inicia sesión o regístrate para comprar');
    const dni = String(raw?.dni ?? '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(dni)) throw new HttpError(400, 'Ingresa un DNI válido de 8 dígitos');
    const person = (await sql`select * from dni_lookups where dni = ${dni}`)[0];
    if (!person) throw new HttpError(400, 'Verifica tu DNI antes de pagar');
    const phone = String(raw?.phone ?? '').replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, '');
    if (!/^9\d{8}$/.test(phone)) throw new HttpError(400, 'Ingresa un número de celular válido (9 dígitos)');

    let department: string, province: string, agency: Shipping['agency'];
    if (raw?.agencyId !== undefined && raw?.agencyId !== null) {
        const list = await getShalomAgencies().catch(() => null);
        if (!list) throw new HttpError(503, 'No pudimos cargar las agencias de Shalom. Inténtalo en unos minutos.');
        const a = list.find((x) => x.id === Number(raw.agencyId));
        if (!a) throw new HttpError(400, 'Selecciona una agencia de Shalom válida');
        department = a.departamento;
        province = a.provincia;
        agency = { id: a.id, nombre: a.nombre, direccion: a.direccion, distrito: a.distrito, horario: a.horario };
    } else {
        // Respaldo si la lista de Shalom no carga: el cliente escribe el destino y la agencia
        department = cleanText(raw?.department, 60);
        province = cleanText(raw?.province, 60);
        const nombre = cleanText(raw?.agencyName, 150);
        if (!department || !province || !nombre) throw new HttpError(400, 'Indica el destino y la agencia de Shalom');
        agency = { id: null, nombre, direccion: '', distrito: '', horario: '' };
    }

    const firstName = String(person.nombres);
    const lastName = `${person.apellido_paterno} ${person.apellido_materno}`.trim();
    const email = String(me.email).trim().toLowerCase();
    return {
        customer: { firstName, lastName, email, phone, dni },
        shipping: { dni, recipientName: `${firstName} ${lastName}`, phone, email, department, province, agency },
    };
}

const PAYMENT_LABELS: Record<string, string> = { card: 'Tarjeta', yape: 'Yape', billetera: 'Yape/Plin (QR)' };

/** Envía el ticket de compra al correo del cliente. Nunca hace fallar la compra. */
async function sendTicket(env: Env, sale: any, shipping: Shipping) {
    try {
        const t = buildTicketEmail({
            saleId: String(sale.id),
            date: new Date(sale.date),
            paymentLabel: PAYMENT_LABELS[sale.payment_method] ?? String(sale.payment_method),
            paymentRef: String(sale.payment_ref ?? ''),
            total: Number(sale.total),
            items: (sale.items ?? []).map((i: any) => ({ name: String(i.name), quantity: Number(i.quantity), price: Number(i.price) })),
            shipping,
        });
        if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
            console.log(`[DEV] Ticket para ${shipping.email}: ${t.subject}`);
            return;
        }
        if (!(await sendMail(env, shipping.email, t.subject, t.html, t.text))) console.error('No se pudo enviar el ticket', sale.id);
    } catch (err) {
        console.error('Error al preparar el ticket', sale?.id, err);
    }
}

const culqiKey = (env: Env) => {
    if (!env.CULQI_SECRET_KEY) throw new HttpError(503, 'Los pagos en línea no están configurados. Inténtalo más tarde.');
    return env.CULQI_SECRET_KEY;
};

const ORDER_ID_RE = /^ord_(test|live)_[A-Za-z0-9]+$/;
const ORDER_TTL_SECONDS = 20 * 60; // vigencia del QR de Yape/Plin

/**
 * Consulta la orden en Culqi (no se confía en el webhook ni en el navegador) y, si está pagada,
 * registra la venta y su envío, descuenta el stock y envía el ticket, una sola vez.
 * Devuelve el estado local o null si no existe.
 */
async function syncCulqiOrder(sql: Sql, env: Env, ctx: ExecutionContext, orderId: string) {
    const read = async () => {
        const rows = await sql`select status, sale_id from culqi_orders where id = ${orderId}`;
        const r = rows[0] as { status: string; sale_id: string | null } | undefined;
        return r ? { status: r.status, saleId: r.sale_id } : null;
    };
    const local = await read();
    if (!local || local.status !== 'pending') return local;

    const { status, data } = await culqiRequest(culqiKey(env), 'GET', `/orders/${encodeURIComponent(orderId)}`);
    if (status !== 200) {
        console.error('Culqi: no se pudo consultar la orden', orderId, status, data);
        return local;
    }
    if (data.state === 'paid') {
        // Una sola sentencia: solo la primera llamada (webhook o consulta del navegador) pasa de pending a paid
        const created = await sql`
            with o as (
                update culqi_orders set status = 'paid', paid_at = now(), sale_id = gen_random_uuid()
                where id = ${orderId} and status = 'pending' and amount_cents = ${Number(data.amount)}
                returning *
            ), s as (
                insert into sales (id, user_id, total, payment_method, date, items, payment_ref, customer)
                select sale_id, user_id, round(amount_cents / 100.0, 2), 'billetera', now(), items, id, customer from o
                returning *
            ), sh as (
                insert into shipments (sale_id, dni, recipient_name, phone, email, department, province, agency)
                select sale_id, shipping->>'dni', shipping->>'recipientName', shipping->>'phone', shipping->>'email',
                       shipping->>'department', shipping->>'province', shipping->'agency'
                from o where shipping is not null
                returning id
            ), st as (
                update products p set stock = p.stock - (i->>'quantity')::int
                from s cross join lateral jsonb_array_elements(s.items) i
                where p.id = (i->>'id')::uuid
                returning p.id
            )
            select s.*, o.shipping, (select count(*) from sh) as shipments, (select count(*) from st) as stock_rows
            from s join o on o.sale_id = s.id`;
        if (created[0]?.shipping) ctx.waitUntil(sendTicket(env, created[0], created[0].shipping as Shipping));
        const after = await read();
        if (after?.status === 'pending') console.error('Culqi: orden pagada con monto distinto', orderId, data.amount);
        return after;
    }
    if (data.state === 'expired' || data.state === 'deleted') {
        await sql`update culqi_orders set status = 'expired' where id = ${orderId} and status = 'pending'`;
    }
    return read();
}

// ---------- Turnstile (anti-bots) ----------

/** Valida en el servidor el token del widget de Turnstile. Falla cerrado si no está configurado. */
async function verifyTurnstile(req: Request, env: Env, token: unknown, action: string) {
    if (!env.TURNSTILE_SECRET_KEY) throw new HttpError(503, 'La verificación anti-bots no está configurada');
    if (typeof token !== 'string' || !token || token.length > 2048) {
        throw new HttpError(400, 'Completa la verificación de seguridad');
    }
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET_KEY);
    form.append('response', token);
    const ip = req.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = (await r.json().catch(() => null)) as { success?: boolean; action?: string; 'error-codes'?: string[] } | null;
    // Las claves de prueba de Turnstile no devuelven action; con claves reales debe coincidir con el formulario
    if (!data?.success || (data.action && data.action !== action)) {
        if (data?.['error-codes']?.length) console.warn('Turnstile rechazado', data['error-codes']);
        throw new HttpError(403, 'La verificación de seguridad falló o expiró. Inténtalo de nuevo');
    }
}

// ---------- Recuperación de contraseña ----------

const RESET_CODE_MINUTES = 15;   // vigencia del código enviado por correo
const RESET_MAX_ATTEMPTS = 5;    // intentos fallidos antes de invalidar el código
const RESET_RESEND_SECONDS = 60; // espera mínima entre dos códigos para el mismo correo
const RESET_TOKEN_TTL = 10 * 60; // tiempo para poner la nueva contraseña tras validar el código

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Envía un correo con Resend. Devuelve false si Resend lo rechaza. */
async function sendMail(env: Env, to: string, subject: string, html: string, text: string) {
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html, text }),
    });
    if (!r.ok) console.error('Resend error', r.status, await r.text());
    return r.ok;
}

/** Envía el código por correo con Resend. En local (DEV_LOG_CODES) lo muestra en la consola. */
async function sendResetCode(env: Env, to: string, name: string, code: string) {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
        if (env.DEV_LOG_CODES === 'true') { console.log(`[DEV] Código de recuperación para ${to}: ${code}`); return; }
        throw new HttpError(503, 'El envío de correos no está configurado. Contacta al administrador.');
    }
    const sent = await sendMail(env, to,
        `${code} es tu código para restablecer la contraseña - SYSTEC`,
        `<p>Hola ${escapeHtml(name)},</p>
         <p>Tu código para restablecer la contraseña es:</p>
         <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
         <p>Vence en ${RESET_CODE_MINUTES} minutos y solo se puede usar una vez.
         Si no lo pediste, ignora este correo: tu contraseña no cambiará.</p>`,
        `Hola ${name}, tu código para restablecer la contraseña es ${code}. Vence en ${RESET_CODE_MINUTES} minutos.`);
    if (!sent) throw new HttpError(502, 'No se pudo enviar el correo. Inténtalo de nuevo en unos minutos.');
}

// ---------- Router ----------

export default {
    async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

            // Configuración pública para el frontend (la site key de Turnstile no es secreta)
            if (path === '/api/config' && method === 'GET') {
                return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null, culqiPublicKey: env.CULQI_PUBLIC_KEY ?? null }, {
                    headers: { 'Cache-Control': 'public, max-age=300' },
                });
            }

            // Agencias de Shalom que reciben envíos (para elegir destino en el carrito)
            if (path === '/api/shalom/agencias' && method === 'GET') {
                const list = await getShalomAgencies().catch((err) => {
                    console.error('Shalom: no se pudo obtener la lista de agencias', err);
                    throw new HttpError(503, 'No pudimos cargar las agencias de Shalom');
                });
                return json(list, { headers: { 'Cache-Control': 'public, max-age=3600' } });
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

            // Crear venta desde el POS (solo personal). Las ventas online se registran únicamente
            // cuando Culqi confirma el cobro (rutas /api/checkout/*).
            if (path === '/api/sales' && method === 'POST') {
                requireStaff(me);
                const s = await body(req);
                const allowed = ['cash', 'card', 'yape', 'plin'];
                if (!allowed.includes(s.paymentMethod)) throw new HttpError(400, 'Método de pago inválido');
                const { cleanItems, total } = await priceCart(sql, s.items, false);
                const results = await sql.transaction(saleQueries(sql, {
                    id: crypto.randomUUID(), userId: me?.id ?? null, total, paymentMethod: s.paymentMethod, items: cleanItems,
                }));
                return json(mapSale((results[0] as any[])[0]), { status: 201 });
            }

            // ===== PAGOS ONLINE (Culqi) =====
            // Requieren sesión: el correo es el de la cuenta y el nombre el del DNI verificado.
            // Tarjeta o Yape con código de aprobación: el navegador obtiene un token con el checkout de Culqi
            // y aquí se cobra con la llave secreta. Si el banco pide 3DS, Culqi responde REVIEW y el navegador
            // reintenta con los parámetros de autenticación.
            if (path === '/api/checkout/charge' && method === 'POST') {
                const b = await body(req);
                const sk = culqiKey(env);
                const { customer, shipping } = await parseCheckout(sql, me, b.shipping);
                const token = String(b.token || '');
                if (!/^(tkn|ype)_(test|live)_[A-Za-z0-9]+$/.test(token)) throw new HttpError(400, 'Token de pago inválido');
                const { cleanItems, totalCents, total } = await priceCart(sql, b.items, true);
                const auth3DS = pick3DS(b.parameters3DS);
                const deviceId = typeof b.deviceId === 'string' && b.deviceId.length <= 200 ? b.deviceId : undefined;

                const charge = await culqiRequest(sk, 'POST', '/charges', {
                    amount: totalCents,
                    currency_code: 'PEN',
                    email: customer.email,
                    source_id: token,
                    description: 'Compra en SYSTEC FDC',
                    antifraud_details: {
                        first_name: customer.firstName,
                        last_name: customer.lastName,
                        phone_number: customer.phone,
                        ...(deviceId ? { device_finger_print_id: deviceId } : {}),
                    },
                    metadata: { user_id: String(me!.id), dni: customer.dni },
                    ...(auth3DS ? { authentication_3DS: auth3DS } : {}),
                });
                if (charge.status === 200 && charge.data.action_code === 'REVIEW') {
                    return json({ status: 'review', amountCents: totalCents });
                }
                if (charge.status !== 201) {
                    console.warn('Culqi: cargo rechazado', charge.status, charge.data?.merchant_message ?? charge.data);
                    throw new HttpError(402, culqiUserMessage(charge.data, 'El pago fue rechazado. Verifica tus datos o usa otro medio de pago.'));
                }

                const chargeId = String(charge.data.id);
                try {
                    const results = await sql.transaction(saleQueries(sql, {
                        id: crypto.randomUUID(), userId: me!.id, total, items: cleanItems, customer, shipping,
                        paymentRef: chargeId, paymentMethod: token.startsWith('ype_') ? 'yape' : 'card',
                    }));
                    const sale = (results[0] as any[])[0];
                    ctx.waitUntil(sendTicket(env, sale, shipping));
                    return json({
                        status: 'paid',
                        sale: mapSale(sale),
                        message: culqiUserMessage(charge.data, 'Su compra ha sido exitosa.'),
                    }, { status: 201 });
                } catch (err) {
                    console.error('Culqi: cobro aprobado pero la venta no se registró', chargeId, err);
                    throw new HttpError(500, `Tu pago fue aprobado (código ${chargeId}) pero no pudimos registrar el pedido. Contáctanos con ese código.`);
                }
            }

            // Yape/Plin con QR (billeteras): se crea una orden en Culqi y el carrito queda guardado hasta que se pague
            if (path === '/api/checkout/order' && method === 'POST') {
                const b = await body(req);
                const sk = culqiKey(env);
                const { customer, shipping } = await parseCheckout(sql, me, b.shipping);
                const { cleanItems, totalCents } = await priceCart(sql, b.items, true);
                if (totalCents < WALLET_MIN_CENTS || totalCents > WALLET_MAX_CENTS) {
                    throw new HttpError(400, 'El pago con QR de Yape/Plin solo está disponible para compras entre S/ 6 y S/ 500');
                }
                const order = await culqiRequest(sk, 'POST', '/orders', {
                    amount: totalCents,
                    currency_code: 'PEN',
                    description: 'Compra en SYSTEC FDC',
                    order_number: `systec-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
                    client_details: {
                        first_name: customer.firstName,
                        last_name: customer.lastName,
                        email: customer.email,
                        phone_number: `+51${customer.phone}`,
                    },
                    expiration_date: Math.floor(Date.now() / 1000) + ORDER_TTL_SECONDS,
                    metadata: { user_id: String(me!.id), dni: customer.dni },
                });
                const orderId = String(order.data?.id ?? '');
                if (order.status !== 201 || !ORDER_ID_RE.test(orderId)) {
                    console.error('Culqi: no se pudo crear la orden', order.status, order.data);
                    throw new HttpError(502, culqiUserMessage(order.data, 'No se pudo generar el pago con QR. Inténtalo de nuevo.'));
                }
                await sql`insert into culqi_orders (id, amount_cents, user_id, customer, shipping, items)
                          values (${orderId}, ${totalCents}, ${me!.id}, ${JSON.stringify(customer)}::jsonb,
                                  ${JSON.stringify(shipping)}::jsonb, ${JSON.stringify(cleanItems)}::jsonb)`;
                return json({ orderId, amountCents: totalCents }, { status: 201 });
            }

            // Estado de una orden (el navegador lo consulta mientras el cliente paga con el QR)
            if (seg[0] === 'checkout' && seg[1] === 'order' && seg[2] && method === 'GET') {
                if (!ORDER_ID_RE.test(seg[2])) throw new HttpError(400, 'Orden inválida');
                const state = await syncCulqiOrder(sql, env, ctx, seg[2]);
                if (!state) throw new HttpError(404, 'Orden no encontrada');
                return json(state, { headers: { 'Cache-Control': 'no-store' } });
            }

            // Webhook de Culqi (evento order.status.changed). Solo se usa el id de la orden:
            // el estado real se consulta a la API de Culqi con la llave secreta.
            if (path === '/api/culqi/webhook' && method === 'POST') {
                if (env.CULQI_WEBHOOK_USER && env.CULQI_WEBHOOK_PASSWORD) {
                    const expected = `Basic ${btoa(`${env.CULQI_WEBHOOK_USER}:${env.CULQI_WEBHOOK_PASSWORD}`)}`;
                    if (req.headers.get('Authorization') !== expected) return new Response('Unauthorized', { status: 401 });
                }
                const raw = await req.text();
                const ids = [...new Set(raw.match(/ord_(?:test|live)_[A-Za-z0-9]+/g) ?? [])].slice(0, 5);
                for (const id of ids) await syncCulqiOrder(sql, env, ctx, id);
                return json({ received: true });
            }

            // ===== ENVÍOS (Shalom) =====
            // Consulta de DNI para autocompletar el destinatario (requiere sesión; se guarda para no repetir consultas)
            if (seg[0] === 'dni' && seg[1] && method === 'GET') {
                if (!me) throw new HttpError(401, 'Inicia sesión para continuar');
                const dni = seg[1];
                if (!/^\d{8}$/.test(dni)) throw new HttpError(400, 'El DNI debe tener 8 dígitos');
                let person = (await sql`select * from dni_lookups where dni = ${dni}`)[0];
                if (!person) {
                    if (!env.APISPERU_TOKEN) throw new HttpError(503, 'La consulta de DNI no está configurada');
                    const found = await fetchDni(env.APISPERU_TOKEN, dni).catch((err) => {
                        console.error('apisPeru', err);
                        throw new HttpError(502, 'No se pudo consultar el DNI. Inténtalo de nuevo en unos minutos.');
                    });
                    if (!found) throw new HttpError(404, 'No encontramos ese DNI. Verifica el número.');
                    person = (await sql`
                        insert into dni_lookups (dni, nombres, apellido_paterno, apellido_materno)
                        values (${dni}, ${found.nombres}, ${found.apellidoPaterno}, ${found.apellidoMaterno})
                        on conflict (dni) do update set nombres = excluded.nombres, apellido_paterno = excluded.apellido_paterno,
                            apellido_materno = excluded.apellido_materno, fetched_at = now()
                        returning *`)[0];
                }
                return json({ dni, nombres: person.nombres, apellidos: `${person.apellido_paterno} ${person.apellido_materno}`.trim() });
            }

            // Panel: seguimiento de envíos
            if (path === '/api/shipments' && method === 'GET') {
                requireStaff(me, 'shipments');
                const rows = await sql`
                    select sh.*, s.total, s.items, s.payment_method, s.payment_ref, s.date
                    from shipments sh join sales s on s.id = sh.sale_id
                    order by sh.created_at desc limit 1000`;
                return json(rows.map(mapShipment));
            }

            if (seg[0] === 'shipments' && seg[1] && method === 'PATCH') {
                requireStaff(me, 'shipments');
                if (!UUID_RE.test(seg[1])) throw new HttpError(400, 'Envío inválido');
                const u = await body(req);
                if (u.status !== undefined && !SHIPMENT_STATUSES.includes(u.status)) throw new HttpError(400, 'Estado inválido');
                const sets: string[] = [];
                const params: unknown[] = [];
                const set = (col: string, v: unknown) => { params.push(v); sets.push(`${col} = $${params.length}`); };
                if (u.status !== undefined) set('status', u.status);
                if (u.trackingCode !== undefined) set('tracking_code', cleanText(u.trackingCode, 100) || null);
                if (u.notes !== undefined) set('notes', String(u.notes ?? '').trim().slice(0, 1000) || null);
                if (sets.length === 0) return json({ ok: true });
                params.push(seg[1]);
                const updated = await sql.query(
                    `update shipments set ${sets.join(', ')}, updated_at = now() where id = $${params.length} returning id`, params);
                if (!updated[0]) throw new HttpError(404, 'Envío no encontrado');
                const rows = await sql`
                    select sh.*, s.total, s.items, s.payment_method, s.payment_ref, s.date
                    from shipments sh join sales s on s.id = sh.sale_id where sh.id = ${seg[1]}`;
                return json(mapShipment(rows[0]));
            }

            // ===== LIBRO DE RECLAMACIONES =====
            // Registro público (con Turnstile). Se envía la constancia al consumidor y un aviso a la tienda.
            if (path === '/api/complaints' && method === 'POST') {
                const b = await body(req);
                await verifyTurnstile(req, env, b.turnstileToken, 'complaint');
                const parsed = parseComplaint(b);
                if ('error' in parsed) throw new HttpError(400, parsed.error);
                const c = parsed.data;
                const row = (await sql`
                    insert into complaints (type, consumer_name, document_type, document_number, address, phone, email,
                        guardian_name, item_type, item_description, amount, order_code, detail, request, user_id)
                    values (${c.type}, ${c.consumerName}, ${c.documentType}, ${c.documentNumber}, ${c.address}, ${c.phone},
                        ${c.email}, ${c.guardianName}, ${c.itemType}, ${c.itemDescription}, ${c.amount}, ${c.orderCode},
                        ${c.detail}, ${c.request}, ${me?.id ?? null})
                    returning *`)[0];
                const stored = mapComplaintRow(row);
                ctx.waitUntil((async () => {
                    for (const [to, mail] of [[stored.email, complaintReceiptEmail(stored)], [BUSINESS.email, complaintNoticeEmail(stored)]] as const) {
                        if (!env.RESEND_API_KEY || !env.MAIL_FROM) { console.log(`[DEV] Correo para ${to}: ${mail.subject}`); continue; }
                        if (!(await sendMail(env, to, mail.subject, mail.html, mail.text))) console.error('Libro de reclamaciones: no se pudo enviar a', to);
                    }
                })());
                return json({
                    code: complaintCode(stored.number, stored.createdAt),
                    createdAt: row.created_at,
                    dueDate: responseDeadline(stored.createdAt).toISOString(),
                }, { status: 201 });
            }

            if (path === '/api/complaints' && method === 'GET') {
                requireStaff(me, 'complaints');
                const rows = await sql`select * from complaints order by created_at desc limit 1000`;
                return json(rows.map(complaintToApi));
            }

            // Respuesta del proveedor: queda registrada (no se puede editar) y se envía al correo del consumidor
            if (seg[0] === 'complaints' && seg[1] && method === 'PATCH') {
                const staff = requireStaff(me, 'complaints');
                if (!UUID_RE.test(seg[1])) throw new HttpError(400, 'Hoja inválida');
                const response = String((await body(req)).response ?? '').trim().slice(0, 5000);
                if (response.length < 10) throw new HttpError(400, 'Escribe la respuesta para el consumidor');
                const row = (await sql`
                    update complaints set status = 'respondido', response = ${response}, responded_at = now(), responded_by = ${staff.name}
                    where id = ${seg[1]} and status = 'pendiente'
                    returning *`)[0];
                if (!row) throw new HttpError(409, 'Esta hoja ya fue respondida o no existe');
                const mail = complaintResponseEmail(mapComplaintRow(row), response, new Date(row.responded_at));
                let emailSent = false;
                if (env.RESEND_API_KEY && env.MAIL_FROM) emailSent = await sendMail(env, row.email, mail.subject, mail.html, mail.text);
                else console.log(`[DEV] Respuesta para ${row.email}: ${mail.subject}`);
                return json({ ...complaintToApi(row), emailSent });
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
                const { email, password, turnstileToken } = await body(req);
                await verifyTurnstile(req, env, turnstileToken, 'login');
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
                const { name, email, password, turnstileToken } = await body(req);
                if (!name || !email || !password || String(password).length < 6) {
                    throw new HttpError(400, 'Datos incompletos (la contraseña debe tener al menos 6 caracteres)');
                }
                await verifyTurnstile(req, env, turnstileToken, 'register');
                const exists = await sql`select 1 from users where lower(email) = lower(${email})`;
                if (exists.length) throw new HttpError(409, 'Ya existe una cuenta con este correo');
                const rows = (await sql`
                    insert into users (id, name, email, password, role, permissions, wishlist)
                    values (${Date.now().toString()}, ${name}, ${email}, ${await hashPassword(password)}, 'shopper', '{}', '{}')
                    returning *`) as DbUser[];
                return json({ user: mapUser(rows[0]) }, { status: 201 });
            }

            // Recuperación de contraseña, paso 1: comprobar que el correo existe y enviar un código de 6 dígitos
            if (path === '/api/auth/forgot' && method === 'POST') {
                const { email, turnstileToken } = await body(req);
                await verifyTurnstile(req, env, turnstileToken, 'forgot');
                const rows = (await sql`select * from users where lower(email) = lower(${String(email || '').trim()})`) as DbUser[];
                const user = rows[0];
                if (!user) throw new HttpError(404, 'No existe una cuenta registrada con este correo');

                const recent = await sql`
                    select 1 from password_resets
                    where lower(email) = lower(${user.email}) and created_at > now() - make_interval(secs => ${RESET_RESEND_SECONDS})`;
                if (recent.length) throw new HttpError(429, 'Ya te enviamos un código. Espera un minuto antes de pedir otro.');

                // Solo el último código es válido: se invalidan los anteriores
                const code = randomCode();
                const inserted = await sql.transaction([
                    sql`update password_resets set used = true where lower(email) = lower(${user.email}) and used = false`,
                    sql`insert into password_resets (email, code_hash, expires_at)
                        values (${user.email}, ${await sha256Hex(code)}, now() + make_interval(mins => ${RESET_CODE_MINUTES}))
                        returning id`,
                ]);
                try {
                    await sendResetCode(env, user.email, user.name, code);
                } catch (err) {
                    await sql`delete from password_resets where id = ${(inserted[1] as { id: string }[])[0].id}`;
                    throw err;
                }
                return json({ ok: true, expiresInMinutes: RESET_CODE_MINUTES });
            }

            // Recuperación de contraseña, paso 2: validar el código y entregar un permiso temporal para cambiar la contraseña
            if (path === '/api/auth/verify-code' && method === 'POST') {
                const { email, code, turnstileToken } = await body(req);
                await verifyTurnstile(req, env, turnstileToken, 'verify');
                const rows = await sql`
                    select id, code_hash, attempts from password_resets
                    where lower(email) = lower(${String(email || '').trim()}) and used = false and expires_at > now()
                    order by created_at desc limit 1`;
                const reset = rows[0] as { id: string; code_hash: string; attempts: number } | undefined;
                if (!reset) throw new HttpError(400, 'El código expiró o ya fue usado. Solicita uno nuevo.');

                if (reset.code_hash !== (await sha256Hex(String(code || '').trim()))) {
                    const left = RESET_MAX_ATTEMPTS - (reset.attempts + 1);
                    await sql`update password_resets set attempts = attempts + 1, used = ${left <= 0} where id = ${reset.id}`;
                    if (left <= 0) throw new HttpError(429, 'Demasiados intentos fallidos. Solicita un código nuevo.');
                    throw new HttpError(400, `Código incorrecto. ${left === 1 ? 'Te queda 1 intento' : `Te quedan ${left} intentos`}.`);
                }
                await sql`update password_resets set verified_at = now() where id = ${reset.id}`;
                const resetToken = await signJwt({ sub: String(reset.id), purpose: 'password-reset' }, env.JWT_SECRET, RESET_TOKEN_TTL);
                return json({ resetToken });
            }

            // Recuperación de contraseña, paso 3: guardar la nueva contraseña (requiere el permiso del paso 2)
            if (path === '/api/auth/reset' && method === 'POST') {
                const { resetToken, password } = await body(req);
                if (!password || String(password).length < 6) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
                const payload = await verifyJwt<{ sub: string; purpose: string }>(String(resetToken || ''), env.JWT_SECRET);
                if (payload?.purpose !== 'password-reset') throw new HttpError(400, 'La verificación expiró. Vuelve a solicitar un código.');
                // Una sola sentencia: marca el permiso como usado (used = false en el WHERE => solo sirve una vez) y cambia la contraseña
                const done = await sql`
                    with r as (
                        update password_resets set used = true
                        where id = ${payload.sub} and used = false and verified_at is not null
                        returning email
                    )
                    update users set password = ${await hashPassword(String(password))}
                    where lower(email) = (select lower(email) from r)
                    returning id`;
                if (!done[0]) throw new HttpError(400, 'La verificación expiró o ya fue usada. Vuelve a solicitar un código.');
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
