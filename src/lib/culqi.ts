// Integración del navegador con Culqi: Checkout Custom (tarjeta, Yape con código y billeteras por QR) y Culqi 3DS.
// El navegador solo obtiene tokens u órdenes; el cobro lo hace el Worker con la llave secreta.
// Docs: https://docs.culqi.com/es/documentacion/checkout/checkout-custom y .../culqi-3ds/v1/configuracion

import { loadScript } from './config';

const CHECKOUT_SCRIPT = 'https://js.culqi.com/checkout-js';
const THREEDS_SCRIPT = 'https://3ds.culqi.com';

export type CulqiMethod = 'tarjeta' | 'yape' | 'billetera';

interface CulqiInstance {
    culqi: () => void;
    open: () => void;
    close: () => void;
    token?: { id: string; email?: string } | null;
    order?: unknown;
    error?: { user_message?: string; merchant_message?: string } | null;
}

export interface Parameters3DS {
    eci?: string; xid?: string; cavv?: string; protocolVersion?: string; directoryServerTransactionId?: string;
}

interface Culqi3DSApi {
    publicKey: string;
    settings: unknown;
    options: unknown;
    generateDevice: () => Promise<string | null>;
    initAuthentication: (tokenId: string) => void;
    reset: () => void;
}

declare global {
    interface Window {
        CulqiCheckout?: new (publicKey: string, config: unknown) => CulqiInstance;
        Culqi3DS?: Culqi3DSApi;
    }
}

export interface CheckoutCallbacks {
    onToken: (tokenId: string) => void;
    onOrder?: () => void;
    onError: (message: string) => void;
}

/** Abre el checkout de Culqi mostrando solo el medio de pago elegido. Devuelve la instancia para poder cerrarla. */
export async function openCulqiCheckout(opts: {
    publicKey: string;
    amountCents: number;
    email: string;
    method: CulqiMethod;
    orderId?: string;
} & CheckoutCallbacks) {
    await loadScript(CHECKOUT_SCRIPT);
    if (!window.CulqiCheckout) throw new Error('No se pudo cargar el checkout de Culqi');

    const paymentMethods = {
        tarjeta: opts.method === 'tarjeta',
        yape: opts.method === 'yape',
        billetera: opts.method === 'billetera',
        bancaMovil: false,
        agente: false,
        cuotealo: false,
    };
    const culqi = new window.CulqiCheckout(opts.publicKey, {
        settings: {
            title: 'SYSTEC FDC',
            currency: 'PEN',
            amount: opts.amountCents,
            ...(opts.orderId ? { order: opts.orderId } : {}),
        },
        client: { email: opts.email },
        options: {
            lang: 'auto',
            installments: false,
            modal: true,
            paymentMethods,
            paymentMethodsSort: Object.keys(paymentMethods),
        },
        appearance: {
            theme: 'default',
            menuType: 'sidebar',
            buttonCardPayText: 'Pagar',
            defaultStyle: { bannerColor: '#111827', buttonBackground: '#dc2626', buttonTextColor: '#FFFFFF', priceColor: '#dc2626' },
        },
    });
    culqi.culqi = () => {
        if (culqi.token?.id) {
            culqi.close();
            opts.onToken(culqi.token.id);
        } else if (culqi.order) {
            opts.onOrder?.();
        } else if (culqi.error) {
            opts.onError(culqi.error.user_message || culqi.error.merchant_message || 'No se pudo procesar el pago');
        }
    };
    culqi.open();
    return culqi;
}

/** Huella del dispositivo para el antifraude de Culqi (opcional: si falla, el cobro sigue sin ella) */
export async function getCulqiDeviceId(publicKey: string): Promise<string | undefined> {
    try {
        await loadScript(THREEDS_SCRIPT);
        if (!window.Culqi3DS) return undefined;
        window.Culqi3DS.publicKey = publicKey;
        return (await window.Culqi3DS.generateDevice()) ?? undefined;
    } catch {
        return undefined;
    }
}

/** Autenticación 3DS cuando el banco la pide (Culqi respondió REVIEW). Resuelve con los parámetros para reintentar el cobro. */
export async function authenticate3DS(opts: { publicKey: string; tokenId: string; amountCents: number; email: string }) {
    await loadScript(THREEDS_SCRIPT);
    const c3ds = window.Culqi3DS;
    if (!c3ds) throw new Error('No se pudo cargar la verificación 3DS');
    c3ds.publicKey = opts.publicKey;
    c3ds.options = { showModal: true, showLoading: true, showIcon: true };
    c3ds.settings = {
        charge: { totalAmount: opts.amountCents, returnUrl: window.location.href, currency: 'PEN' },
        card: { email: opts.email },
    };

    return new Promise<Parameters3DS>((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') return;
            const { parameters3DS, error } = event.data as { parameters3DS?: Parameters3DS; error?: string };
            if (parameters3DS) { cleanup(); resolve(parameters3DS); }
            else if (error) { cleanup(); reject(new Error(typeof error === 'string' ? error : 'La verificación 3DS falló')); }
        };
        const cleanup = () => { window.removeEventListener('message', onMessage); c3ds.reset(); };
        window.addEventListener('message', onMessage);
        c3ds.initAuthentication(opts.tokenId);
    });
}
