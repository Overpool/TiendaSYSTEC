// Widget de Cloudflare Turnstile (anti-bots). La site key se obtiene de /api/config.
// Cada token sirve una sola vez: el padre debe volver a montarlo (cambiando su `key`) tras cada envío.

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
            remove: (widgetId: string) => void;
        };
    }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;
const loadScript = () => {
    scriptPromise ??= new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SCRIPT_URL;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { scriptPromise = null; reject(new Error('No se pudo cargar Turnstile')); };
        document.head.appendChild(s);
    });
    return scriptPromise;
};

let siteKeyPromise: Promise<string | null> | null = null;
const getSiteKey = () => {
    siteKeyPromise ??= api.get<{ turnstileSiteKey: string | null }>('/config')
        .then((c) => c.turnstileSiteKey)
        .catch(() => { siteKeyPromise = null; return null; });
    return siteKeyPromise;
};

interface TurnstileProps {
    action: 'login' | 'register' | 'forgot' | 'verify';
    onToken: (token: string | null) => void;
}

export const Turnstile = ({ action, onToken }: TurnstileProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const onTokenRef = useRef(onToken);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { onTokenRef.current = onToken; }, [onToken]);

    useEffect(() => {
        let widgetId: string | null = null;
        let cancelled = false;
        onTokenRef.current(null);

        Promise.all([getSiteKey(), loadScript()])
            .then(([siteKey]) => {
                if (cancelled || !ref.current || !window.turnstile) return;
                if (!siteKey) { setError('La verificación de seguridad no está disponible.'); return; }
                widgetId = window.turnstile.render(ref.current, {
                    sitekey: siteKey,
                    action,
                    language: 'es',
                    callback: (token: string) => onTokenRef.current(token),
                    'expired-callback': () => onTokenRef.current(null),
                    'error-callback': () => { onTokenRef.current(null); setError('No se pudo completar la verificación. Recarga la página.'); },
                });
            })
            .catch(() => !cancelled && setError('No se pudo cargar la verificación de seguridad.'));

        return () => {
            cancelled = true;
            if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
        };
    }, [action]);

    return (
        <div className="flex flex-col items-center">
            <div ref={ref} />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
    );
};
