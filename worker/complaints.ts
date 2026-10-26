// Libro de Reclamaciones virtual: validación de la hoja, plazo de respuesta y correos.
// Base legal: Ley 29571 (Código de Protección y Defensa del Consumidor) y su reglamento del Libro de Reclamaciones.

import { BUSINESS, POLICIES } from '../shared/business';

export interface ComplaintInput {
    type: 'reclamo' | 'queja';
    consumerName: string;
    documentType: 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';
    documentNumber: string;
    address: string;
    phone: string;
    email: string;
    guardianName: string | null;
    itemType: 'producto' | 'servicio';
    itemDescription: string;
    amount: number | null;
    orderCode: string | null;
    detail: string;
    request: string;
}

const t = (v: unknown, max: number) => String(v ?? '').trim().replace(/[ \t]+/g, ' ').slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOC_RE: Record<ComplaintInput['documentType'], RegExp> = {
    DNI: /^\d{8}$/, CE: /^[A-Za-z0-9]{8,12}$/, PASAPORTE: /^[A-Za-z0-9]{6,12}$/, RUC: /^(10|20)\d{9}$/,
};

/** Valida la hoja; devuelve el mensaje de error o los datos limpios */
export function parseComplaint(b: any): { error: string } | { data: ComplaintInput } {
    const type = b?.type === 'queja' ? 'queja' : b?.type === 'reclamo' ? 'reclamo' : null;
    const documentType = (['DNI', 'CE', 'PASAPORTE', 'RUC'] as const).find((d) => d === b?.documentType);
    const itemType = b?.itemType === 'servicio' ? 'servicio' : b?.itemType === 'producto' ? 'producto' : null;
    const data = {
        consumerName: t(b?.consumerName, 150),
        documentNumber: t(b?.documentNumber, 15).replace(/\s/g, ''),
        address: t(b?.address, 250),
        phone: t(b?.phone, 20).replace(/[^\d+]/g, ''),
        email: t(b?.email, 150).toLowerCase(),
        guardianName: b?.isMinor ? t(b?.guardianName, 150) : '',
        itemDescription: t(b?.itemDescription, 500),
        orderCode: t(b?.orderCode, 40),
        detail: String(b?.detail ?? '').trim().slice(0, 3000),
        request: String(b?.request ?? '').trim().slice(0, 2000),
    };
    const amount = b?.amount === '' || b?.amount === null || b?.amount === undefined ? null : Number(b.amount);

    if (!type) return { error: 'Indica si es un reclamo o una queja' };
    if (data.consumerName.length < 3) return { error: 'Ingresa tu nombre completo' };
    if (!documentType || !DOC_RE[documentType].test(data.documentNumber)) return { error: 'Ingresa un número de documento válido' };
    if (data.address.length < 5) return { error: 'Ingresa tu domicilio' };
    if (data.phone.replace(/\D/g, '').length < 7) return { error: 'Ingresa un teléfono válido' };
    if (!EMAIL_RE.test(data.email)) return { error: 'Ingresa un correo electrónico válido' };
    if (b?.isMinor && data.guardianName.length < 3) return { error: 'Ingresa el nombre del padre, madre o apoderado' };
    if (!itemType) return { error: 'Indica si se trata de un producto o un servicio' };
    if (data.itemDescription.length < 3) return { error: 'Describe el producto o servicio' };
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000)) return { error: 'El monto reclamado no es válido' };
    if (data.detail.length < 10) return { error: 'Describe el detalle de tu reclamo o queja' };
    if (data.request.length < 3) return { error: 'Indica tu pedido' };

    return {
        data: {
            ...data, type, documentType, itemType,
            amount: amount === null ? null : Math.round(amount * 100) / 100,
            guardianName: data.guardianName || null,
            orderCode: data.orderCode || null,
        },
    };
}

/** N° de hoja: correlativo de 6 dígitos y año, ej. 000001-2026 */
export const complaintCode = (number: number, createdAt: Date) =>
    `${String(number).padStart(6, '0')}-${createdAt.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' })}`;

/**
 * Fecha límite de respuesta: N días hábiles después del registro. Solo descuenta sábados y domingos
 * (no feriados), así el plazo mostrado nunca es más largo que el legal.
 */
export function responseDeadline(from: Date, businessDays = POLICIES.complaintResponseDays) {
    const d = new Date(from);
    let added = 0;
    while (added < businessDays) {
        d.setUTCDate(d.getUTCDate() + 1);
        const wd = new Date(d.getTime() - 5 * 3600_000).getUTCDay(); // día de la semana en Lima (UTC-5)
        if (wd !== 0 && wd !== 6) added++;
    }
    return d;
}

const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmtDate = (d: Date) => d.toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' });
const fmtDay = (d: Date) => d.toLocaleDateString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long' });
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

interface StoredComplaint extends ComplaintInput { number: number; createdAt: Date }

const row = (label: string, value: unknown) =>
    `<tr><td style="padding:4px 8px 4px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0">${value}</td></tr>`;

function sheetHtml(c: StoredComplaint) {
    return `
    <h3 style="margin:16px 0 4px;font-size:15px">Proveedor</h3>
    <table style="font-size:14px">${row('Razón social', esc(BUSINESS.legalName))}${row('RUC', esc(BUSINESS.ruc))}${row('Domicilio', esc(BUSINESS.address))}</table>
    <h3 style="margin:16px 0 4px;font-size:15px">1. Identificación del consumidor reclamante</h3>
    <table style="font-size:14px">
      ${row('Nombre', esc(c.consumerName))}${row('Documento', `${esc(c.documentType)} ${esc(c.documentNumber)}`)}
      ${row('Domicilio', esc(c.address))}${row('Teléfono', esc(c.phone))}${row('Correo', esc(c.email))}
      ${c.guardianName ? row('Padre, madre o apoderado', esc(c.guardianName)) : ''}
    </table>
    <h3 style="margin:16px 0 4px;font-size:15px">2. Identificación del bien contratado</h3>
    <table style="font-size:14px">
      ${row('Tipo', c.itemType === 'producto' ? 'Producto' : 'Servicio')}${row('Descripción', esc(c.itemDescription))}
      ${c.amount !== null ? row('Monto reclamado', `S/ ${c.amount.toFixed(2)}`) : ''}${c.orderCode ? row('N° de pedido', esc(c.orderCode)) : ''}
    </table>
    <h3 style="margin:16px 0 4px;font-size:15px">3. Detalle de la reclamación y pedido del consumidor</h3>
    <table style="font-size:14px">
      ${row('Tipo', c.type === 'reclamo' ? 'Reclamo' : 'Queja')}${row('Detalle', nl2br(c.detail))}${row('Pedido', nl2br(c.request))}
    </table>`;
}

const LEGAL_NOTES = `
    <p style="font-size:12px;color:#6b7280;margin-top:16px">
      <b>Reclamo:</b> disconformidad relacionada a los productos o servicios. <b>Queja:</b> disconformidad no relacionada a los
      productos o servicios, o malestar o descontento respecto a la atención al público.<br>
      La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para
      interponer una denuncia ante el INDECOPI.<br>
      El proveedor deberá dar respuesta al reclamo o queja en un plazo no mayor a ${POLICIES.complaintResponseDays} días hábiles improrrogables.
    </p>`;

const wrap = (title: string, inner: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#1f2937">
  <div style="background:#111827;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:20px;color:#ef4444">${esc(BUSINESS.tradeName)}</h1>
    <p style="margin:4px 0 0;color:#d1d5db">${esc(title)}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">${inner}</div>
</div>`;

/** Constancia para el consumidor (copia de la hoja registrada) */
export function complaintReceiptEmail(c: StoredComplaint) {
    const code = complaintCode(c.number, c.createdAt);
    const due = responseDeadline(c.createdAt);
    const html = wrap(`Libro de Reclamaciones - Hoja N° ${code}`, `
    <p>Hola ${esc(c.consumerName)}, registramos tu ${c.type} el <b>${esc(fmtDate(c.createdAt))}</b>.
    Esta es la copia de tu hoja de reclamación.</p>
    <p style="background:#fef3c7;padding:10px 12px;border-radius:8px;font-size:14px">
      Te responderemos a este correo a más tardar el <b>${esc(fmtDay(due))}</b>.
    </p>
    ${sheetHtml(c)}${LEGAL_NOTES}`);
    return {
        subject: `Hoja de reclamación N° ${code} - ${BUSINESS.tradeName}`,
        html,
        text: `Registramos tu ${c.type} (Hoja N° ${code}) el ${fmtDate(c.createdAt)}. Te responderemos a más tardar el ${fmtDay(due)}.`,
    };
}

/** Aviso interno para la tienda */
export function complaintNoticeEmail(c: StoredComplaint) {
    const code = complaintCode(c.number, c.createdAt);
    const due = responseDeadline(c.createdAt);
    return {
        subject: `Nuevo ${c.type} N° ${code} - responder antes del ${fmtDay(due)}`,
        html: wrap(`Nuevo ${c.type} en el Libro de Reclamaciones`, `
        <p>Se registró la hoja <b>N° ${code}</b>. Respóndela desde el panel (Reclamaciones) a más tardar el
        <b>${esc(fmtDay(due))}</b>.</p>${sheetHtml(c)}`),
        text: `Nuevo ${c.type} N° ${code} de ${c.consumerName}. Responder antes del ${fmtDay(due)}.`,
    };
}

/** Respuesta del proveedor al consumidor */
export function complaintResponseEmail(c: StoredComplaint, response: string, respondedAt: Date) {
    const code = complaintCode(c.number, c.createdAt);
    return {
        subject: `Respuesta a tu hoja de reclamación N° ${code} - ${BUSINESS.tradeName}`,
        html: wrap(`Respuesta a la hoja N° ${code}`, `
        <p>Hola ${esc(c.consumerName)}, esta es nuestra respuesta a tu ${c.type} registrado el ${esc(fmtDate(c.createdAt))}.</p>
        <h3 style="margin:16px 0 4px;font-size:15px">4. Observaciones y acciones adoptadas por el proveedor</h3>
        <p style="font-size:14px">${nl2br(response)}</p>
        <p style="font-size:13px;color:#6b7280">Fecha de comunicación de la respuesta: ${esc(fmtDate(respondedAt))}</p>
        ${sheetHtml(c)}${LEGAL_NOTES}`),
        text: `Respuesta a tu hoja N° ${code}:\n\n${response}`,
    };
}

/** Hoja para el panel (camelCase, con N° y fecha límite) */
export const complaintToApi = (r: any) => {
    const createdAt = new Date(r.created_at);
    return {
        ...mapComplaintRow(r),
        id: r.id,
        code: complaintCode(Number(r.number), createdAt),
        status: r.status,
        response: r.response,
        respondedAt: r.responded_at,
        respondedBy: r.responded_by,
        dueDate: responseDeadline(createdAt).toISOString(),
    };
};

export const mapComplaintRow = (r: any): StoredComplaint => ({
    type: r.type, consumerName: r.consumer_name, documentType: r.document_type, documentNumber: r.document_number,
    address: r.address, phone: r.phone, email: r.email, guardianName: r.guardian_name, itemType: r.item_type,
    itemDescription: r.item_description, amount: r.amount === null ? null : Number(r.amount), orderCode: r.order_code,
    detail: r.detail, request: r.request, number: Number(r.number), createdAt: new Date(r.created_at),
});
