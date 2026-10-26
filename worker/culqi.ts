// Cliente mínimo de la API de Culqi (v2). Solo se usa desde el Worker: la llave secreta nunca llega al navegador.
// Docs: https://docs.culqi.com y https://apidocs.culqi.com

const CULQI_API = 'https://api.culqi.com/v2';

export interface CulqiResponse<T = Record<string, any>> {
    status: number;
    data: T;
}

export async function culqiRequest<T = Record<string, any>>(
    secretKey: string, method: 'GET' | 'POST', path: string, body?: unknown
): Promise<CulqiResponse<T>> {
    const r = await fetch(`${CULQI_API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as T;
    return { status: r.status, data };
}

/** Mensaje para el cliente a partir de un error de Culqi (user_message) */
export const culqiUserMessage = (data: Record<string, any> | null | undefined, fallback: string) =>
    (typeof data?.user_message === 'string' && data.user_message) ||
    (typeof data?.outcome?.user_message === 'string' && data.outcome.user_message) ||
    fallback;

/** Parámetros que devuelve Culqi 3DS tras autenticar; solo se reenvían estos campos */
export function pick3DS(p: unknown) {
    if (!p || typeof p !== 'object') return undefined;
    const src = p as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ['eci', 'xid', 'cavv', 'protocolVersion', 'directoryServerTransactionId']) {
        if (typeof src[k] === 'string' && src[k]) out[k] = src[k] as string;
    }
    return Object.keys(out).length ? out : undefined;
}

/** Billeteras (Yape/Plin por QR): Culqi solo acepta entre S/ 6 y S/ 500 */
export const WALLET_MIN_CENTS = 600;
export const WALLET_MAX_CENTS = 50000;
