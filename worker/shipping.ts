// Envíos: agencias de Shalom, consulta de DNI (apisPeru) y ticket de compra por correo.

// ---------- Agencias de Shalom ----------
// Shalom no publica una API oficial; esta es la lista pública que usa su web (shalom.com.pe/agencias).
// Se guarda en la caché de Cloudflare por 12 horas para no depender de ella en cada compra.

const SHALOM_AGENCIES_URL = 'https://newwebservices.shalomcontrol.com/api/v1/web/agencias/listar';
const SHALOM_CACHE_KEY = 'https://cache.systecfl.site/shalom-agencias-v1';
const SHALOM_CACHE_SECONDS = 12 * 60 * 60;

export interface ShalomAgency {
    id: number;
    departamento: string;
    provincia: string;
    distrito: string;
    nombre: string;
    direccion: string;
    horario: string;
}

let memoryAgencies: { at: number; list: ShalomAgency[] } | null = null;

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

function mapAgencies(raw: any[]): ShalomAgency[] {
    return raw
        .filter((a) => a && a.destino === 1 && a.ter_id && a.departamento && a.provincia)
        .map((a) => {
            const parts = clean(a.nombre).split(' / ');
            return {
                id: Number(a.ter_id),
                departamento: clean(a.departamento),
                provincia: clean(a.provincia),
                distrito: parts[2] || clean(a.zona),
                nombre: clean(a.lugar_over) || clean(a.zona) || parts[parts.length - 1] || '',
                direccion: clean(a.direccion),
                horario: clean(a.hora_atencion),
            };
        })
        .sort((x, y) => x.departamento.localeCompare(y.departamento) || x.provincia.localeCompare(y.provincia) || x.nombre.localeCompare(y.nombre));
}

/** Lista de agencias de Shalom que reciben envíos (caché en memoria + Cache API de Cloudflare) */
export async function getShalomAgencies(): Promise<ShalomAgency[]> {
    if (memoryAgencies && Date.now() - memoryAgencies.at < SHALOM_CACHE_SECONDS * 1000) return memoryAgencies.list;

    const cache = (caches as unknown as { default: Cache }).default;
    const cached = await cache.match(SHALOM_CACHE_KEY);
    if (cached) {
        const list = (await cached.json()) as ShalomAgency[];
        memoryAgencies = { at: Date.now(), list };
        return list;
    }

    const r = await fetch(SHALOM_AGENCIES_URL, { method: 'POST', headers: { Accept: 'application/json' } });
    const data = (await r.json().catch(() => null)) as { success?: boolean; data?: any[] } | null;
    if (!r.ok || !data?.success || !Array.isArray(data.data)) throw new Error(`Shalom respondió ${r.status}`);
    const list = mapAgencies(data.data);
    if (list.length === 0) throw new Error('Shalom devolvió una lista vacía');

    memoryAgencies = { at: Date.now(), list };
    await cache.put(SHALOM_CACHE_KEY, new Response(JSON.stringify(list), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${SHALOM_CACHE_SECONDS}` },
    }));
    return list;
}

// ---------- DNI (apisPeru) ----------

export interface DniResult { dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string }

/** Consulta un DNI en apisPeru. Devuelve null si no existe. */
export async function fetchDni(token: string, dni: string): Promise<DniResult | null> {
    const r = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${encodeURIComponent(token)}`, {
        headers: { Accept: 'application/json' },
    });
    const data = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    if (r.status === 401 || r.status === 403) throw new Error(`apisPeru rechazó el token (${r.status})`);
    if (!r.ok && r.status !== 404) throw new Error(`apisPeru respondió ${r.status}`);
    if (!data || data.success === false || !data.nombres) return null;
    return {
        dni,
        nombres: clean(data.nombres),
        apellidoPaterno: clean(data.apellidoPaterno),
        apellidoMaterno: clean(data.apellidoMaterno),
    };
}

// ---------- Ticket de compra ----------

export interface TicketData {
    saleId: string;
    date: Date;
    paymentLabel: string;
    paymentRef: string;
    total: number;
    items: { name: string; quantity: number; price: number }[];
    shipping: {
        recipientName: string; dni: string; phone: string; email: string;
        department: string; province: string; agency: { nombre: string; direccion?: string; distrito?: string };
    };
}

const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (n: number) => `S/ ${n.toFixed(2)}`;

export function buildTicketEmail(t: TicketData) {
    const code = t.saleId.slice(-8).toUpperCase();
    const fecha = t.date.toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' });
    const rows = t.items.map((i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(i.price * i.quantity)}</td>
        </tr>`).join('');
    const a = t.shipping.agency;
    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
  <div style="background:#111827;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:22px;color:#ef4444">SYSTEC FDC</h1>
    <p style="margin:4px 0 0;color:#d1d5db">¡Gracias por tu compra!</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">
    <p style="margin:0 0 4px"><b>Pedido:</b> #${esc(code)}</p>
    <p style="margin:0 0 4px"><b>Fecha:</b> ${esc(fecha)}</p>
    <p style="margin:0 0 16px"><b>Pago:</b> ${esc(t.paymentLabel)} · Ref. ${esc(t.paymentRef)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="color:#6b7280;text-align:left">
        <th style="padding-bottom:6px">Producto</th><th style="padding-bottom:6px;text-align:center">Cant.</th><th style="padding-bottom:6px;text-align:right">Importe</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right;font-size:18px;margin:16px 0"><b>Total pagado: ${money(t.total)}</b></p>
    <div style="background:#f9fafb;border-radius:8px;padding:14px;font-size:14px">
      <p style="margin:0 0 6px"><b>Envío por Shalom</b></p>
      <p style="margin:0">${esc(t.shipping.recipientName)} · DNI ${esc(t.shipping.dni)} · Cel. ${esc(t.shipping.phone)}</p>
      <p style="margin:4px 0 0">Agencia: ${esc(t.shipping.department)} / ${esc(t.shipping.province)} / ${esc(a.nombre)}</p>
      ${a.direccion ? `<p style="margin:4px 0 0;color:#6b7280">${esc(a.direccion)}</p>` : ''}
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:16px">
      Te escribiremos por WhatsApp al ${esc(t.shipping.phone)} con el número de guía de Shalom cuando tu pedido sea enviado.
    </p>
  </div>
</div>`;
    const text = [
        `SYSTEC FDC - Pedido #${code}`, `Fecha: ${fecha}`, `Pago: ${t.paymentLabel} (Ref. ${t.paymentRef})`, '',
        ...t.items.map((i) => `${i.quantity} x ${i.name} - ${money(i.price * i.quantity)}`), '',
        `Total pagado: ${money(t.total)}`, '',
        `Envío por Shalom a: ${t.shipping.recipientName} (DNI ${t.shipping.dni}, cel. ${t.shipping.phone})`,
        `Agencia: ${t.shipping.department} / ${t.shipping.province} / ${a.nombre}${a.direccion ? ` - ${a.direccion}` : ''}`,
    ].join('\n');
    return { subject: `Tu compra en SYSTEC FDC - Pedido #${code}`, html, text };
}
