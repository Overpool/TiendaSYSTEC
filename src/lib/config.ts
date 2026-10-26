// Configuración pública que entrega el Worker (/api/config): claves públicas de Turnstile y Culqi.

import { api } from './api';

export interface PublicConfig {
    turnstileSiteKey: string | null;
    culqiPublicKey: string | null;
}

let configPromise: Promise<PublicConfig> | null = null;

export const getPublicConfig = () => {
    configPromise ??= api.get<PublicConfig>('/config').catch((err) => {
        configPromise = null; // permite reintentar
        throw err;
    });
    return configPromise;
};

/** Carga un script externo una sola vez */
const scripts = new Map<string, Promise<void>>();
export const loadScript = (src: string) => {
    let p = scripts.get(src);
    if (!p) {
        p = new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => { scripts.delete(src); reject(new Error(`No se pudo cargar ${src}`)); };
            document.head.appendChild(s);
        });
        scripts.set(src, p);
    }
    return p;
};
