// Cliente para la API del Worker de Cloudflare (reemplaza a supabase-js).
// Las rutas son relativas (/api/...), así funciona igual en local, en *.workers.dev y en tu dominio.

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
    const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
    if (data instanceof FormData) {
        init.body = data;
    } else if (data !== undefined) {
        (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
        init.body = JSON.stringify(data);
    }
    const res = await fetch(`/api${path}`, init);
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, payload?.error || `Error ${res.status}`);
    return payload as T;
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, data?: unknown) => request<T>('POST', path, data),
    patch: <T>(path: string, data?: unknown) => request<T>('PATCH', path, data),
    put: <T>(path: string, data?: unknown) => request<T>('PUT', path, data),
    del: <T>(path: string) => request<T>('DELETE', path),
};
