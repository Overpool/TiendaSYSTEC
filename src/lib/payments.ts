import type { Sale } from '../types';

/** Nombre legible del método de pago de una venta */
export const paymentLabel = (method: Sale['paymentMethod']) => ({
    cash: 'Efectivo',
    card: 'Tarjeta',
    yape: 'Yape',
    plin: 'Plin',
    billetera: 'Yape/Plin QR',
}[method] ?? 'Otro');
