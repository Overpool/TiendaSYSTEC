import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, MapPin, MessageCircle, Save, Package } from 'lucide-react';
import Swal from 'sweetalert2';
import { api } from '../../lib/api';
import { paymentLabel } from '../../lib/payments';
import type { Shipment, ShipmentStatus } from '../../types';

const STATUSES: { id: ShipmentStatus; label: string; badge: string }[] = [
    { id: 'pendiente', label: 'Pendiente', badge: 'bg-amber-100 text-amber-800' },
    { id: 'preparando', label: 'Preparando', badge: 'bg-blue-100 text-blue-800' },
    { id: 'enviado', label: 'Enviado', badge: 'bg-indigo-100 text-indigo-800' },
    { id: 'en_agencia', label: 'En agencia', badge: 'bg-teal-100 text-teal-800' },
    { id: 'entregado', label: 'Entregado', badge: 'bg-green-100 text-green-800' },
    { id: 'cancelado', label: 'Cancelado', badge: 'bg-slate-200 text-slate-700' },
];
const statusInfo = (s: ShipmentStatus) => STATUSES.find((x) => x.id === s) ?? STATUSES[0];
const orderCode = (saleId: string) => saleId.slice(-8).toUpperCase();

/** Mensaje de WhatsApp listo para enviar al cliente según el estado del envío */
function whatsappLink(s: Shipment) {
    const firstName = s.recipientName.split(' ')[0];
    const code = orderCode(s.saleId);
    const agency = `${s.agency.nombre}${s.agency.direccion ? ` (${s.agency.direccion})` : ''}, ${s.province}`;
    const msg = s.trackingCode
        ? `Hola ${firstName}, te escribimos de SYSTEC FDC. Tu pedido #${code} fue enviado por Shalom.\n` +
          `N° de orden/guía: ${s.trackingCode}\nAgencia de destino: ${agency}.\n` +
          `Recuerda llevar tu DNI ${s.dni} para recogerlo. ¡Gracias por tu compra!`
        : `Hola ${firstName}, te escribimos de SYSTEC FDC por tu pedido #${code}, que enviaremos por Shalom a la agencia ${agency}.`;
    return `https://wa.me/51${s.phone}?text=${encodeURIComponent(msg)}`;
}

const ShipmentCard = ({ shipment, onSaved }: { shipment: Shipment; onSaved: (s: Shipment) => void }) => {
    const [status, setStatus] = useState(shipment.status);
    const [trackingCode, setTrackingCode] = useState(shipment.trackingCode ?? '');
    const [notes, setNotes] = useState(shipment.notes ?? '');
    const [saving, setSaving] = useState(false);
    const dirty = status !== shipment.status || trackingCode !== (shipment.trackingCode ?? '') || notes !== (shipment.notes ?? '');

    const save = async () => {
        setSaving(true);
        try {
            const updated = await api.patch<Shipment>(`/shipments/${shipment.id}`, { status, trackingCode, notes });
            onSaved(updated);
            Swal.fire({ icon: 'success', title: 'Envío actualizado', timer: 1200, showConfirmButton: false });
        } catch (error: any) {
            Swal.fire('Error', error?.message || 'No se pudo actualizar el envío', 'error');
        } finally {
            setSaving(false);
        }
    };

    const info = statusInfo(shipment.status);
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <span className="font-bold text-slate-800">Pedido #{orderCode(shipment.saleId)}</span>
                    <span className="text-sm text-slate-500 ml-2">{new Date(shipment.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{paymentLabel(shipment.sale.paymentMethod)} · <b>S/ {shipment.sale.total.toFixed(2)}</b></span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${info.badge}`}>{info.label.toUpperCase()}</span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Cliente</p>
                    <p className="font-medium text-slate-800">{shipment.recipientName}</p>
                    <p className="text-slate-600">DNI {shipment.dni}</p>
                    <p className="text-slate-600">{shipment.email}</p>
                    <a href={whatsappLink(shipment)} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                        <MessageCircle size={16} /> WhatsApp {shipment.phone}
                    </a>
                </div>
                <div>
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Destino (Shalom)</p>
                    <p className="text-slate-800">{shipment.department} / {shipment.province}</p>
                    <p className="flex gap-1 text-slate-600">
                        <MapPin size={14} className="text-red-600 shrink-0 mt-0.5" />
                        <span>
                            <b>{shipment.agency.nombre}</b>
                            {shipment.agency.direccion && <span className="block">{shipment.agency.direccion}</span>}
                        </span>
                    </p>
                </div>
                <div>
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Productos</p>
                    <ul className="text-slate-600 space-y-0.5">
                        {shipment.sale.items.map((i) => <li key={i.id}>{i.quantity}x {i.name}</li>)}
                    </ul>
                </div>
            </div>

            <div className="grid md:grid-cols-[180px_1fr_1fr_auto] gap-3 items-start pt-3 border-t border-slate-100">
                <select value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="N° de orden / guía Shalom"
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas (clave de recojo, etc.)"
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                <button onClick={save} disabled={!dirty || saving}
                    className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition disabled:opacity-40">
                    <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};

export const Shipments = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<ShipmentStatus | 'todos'>('todos');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setShipments(await api.get<Shipment[]>('/shipments'));
        } catch (error: any) {
            Swal.fire('Error', error?.message || 'No se pudieron cargar los envíos', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { todos: shipments.length };
        for (const s of shipments) c[s.status] = (c[s.status] ?? 0) + 1;
        return c;
    }, [shipments]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return shipments.filter((s) =>
            (filter === 'todos' || s.status === filter) &&
            (!q || [s.recipientName, s.dni, s.phone, s.email, s.trackingCode ?? '', orderCode(s.saleId), s.province, s.department]
                .some((v) => v.toLowerCase().includes(q))));
    }, [shipments, filter, search]);

    const replace = (updated: Shipment) => setShipments((list) => list.map((s) => (s.id === updated.id ? updated : s)));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Envíos</h2>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <input type="text" placeholder="Buscar cliente, DNI, celular, guía…" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <button onClick={load} title="Actualizar"
                        className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {[{ id: 'todos' as const, label: 'Todos' }, ...STATUSES].map((s) => (
                    <button key={s.id} onClick={() => setFilter(s.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filter === s.id ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {s.label} <span className="opacity-70">({counts[s.id] ?? 0})</span>
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
                    <Package size={40} className="mx-auto mb-2" />
                    {loading ? 'Cargando envíos…' : 'No hay envíos con estos filtros'}
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((s) => <ShipmentCard key={`${s.id}-${s.updatedAt}`} shipment={s} onSaved={replace} />)}
                </div>
            )}
        </div>
    );
};
