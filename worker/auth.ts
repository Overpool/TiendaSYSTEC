// Utilidades de autenticación: hash de contraseñas (PBKDF2) y sesiones (JWT HS256 en cookie HttpOnly).
// Todo usa Web Crypto, que está disponible de forma nativa en Cloudflare Workers.

const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000; // máximo permitido por Workers

const toB64Url = (buf: ArrayBuffer | Uint8Array) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (str: string) => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
};

async function derive(password: string, salt: Uint8Array, iterations: number) {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        key,
        256
    );
    return new Uint8Array(bits);
}

/** Devuelve un hash con formato: pbkdf2$<iteraciones>$<salt>$<hash> */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64Url(salt)}$${toB64Url(hash)}`;
}

export const isHashed = (stored: string | null | undefined) => !!stored && stored.startsWith('pbkdf2$');

/**
 * Verifica una contraseña. Si la contraseña guardada todavía está en texto plano
 * (datos migrados desde Supabase), la compara directamente; el llamador debe re-hashearla.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
    if (!stored) return false;
    if (!isHashed(stored)) {
        return timingSafeEqual(enc.encode(password), enc.encode(stored));
    }
    const [, iter, saltB64, hashB64] = stored.split('$');
    const hash = await derive(password, fromB64Url(saltB64), Number(iter));
    return timingSafeEqual(hash, fromB64Url(hashB64));
}

// ---------- JWT ----------

async function hmacKey(secret: string) {
    return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds: number) {
    const header = toB64Url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const now = Math.floor(Date.now() / 1000);
    const body = toB64Url(enc.encode(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds })));
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${header}.${body}`));
    return `${header}.${body}.${toB64Url(sig)}`;
}

export async function verifyJwt<T = Record<string, unknown>>(token: string, secret: string): Promise<T | null> {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64Url(sig), enc.encode(`${header}.${body}`));
    if (!ok) return null;
    try {
        const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body)));
        if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload as T;
    } catch {
        return null;
    }
}

export const SESSION_COOKIE = 'systec_session';
export const SESSION_TTL = 60 * 60 * 24 * 7; // 7 días

export function sessionCookie(token: string, maxAge = SESSION_TTL) {
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function readCookie(request: Request, name: string) {
    const header = request.headers.get('Cookie') || '';
    for (const part of header.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k === name) return v.join('=');
    }
    return null;
}

/** Código numérico de 6 dígitos para recuperar contraseña */
export function randomCode() {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    return n.toString().padStart(6, '0');
}

export async function sha256Hex(text: string) {
    const d = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
