import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, BookOpen, Send, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { api } from '../../lib/api';

interface Complaint {
    id: string;
    code: string;
    type: 'reclamo' | 'queja';
    consumerName: string;
    documentType: string;
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
    status: 'pendiente' | 'respondido';
    response: string | null;
    respondedAt: string | null;
    respondedBy: string | null;
    createdAt: string;
    dueDate: string;
}

const fmtDay = (d: string) => new Date(d).toLocaleDateString('es-PE', { dateStyle: 'medium' });

const Deadline = ({ dueDate, now }: { dueDate: string; now: number }) => {
    const days = Math.ceil((new Date(dueDate).getTime() - now) / 86_400_000);
    const cls = days < 0 ? 'bg-red-600 text-white' : days <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${cls}`}>
            {days < 0 ? `VENCIDO (${fmtDay(dueDate)})` : `Responder antes del ${fmtDay(dueDate)}`}
        </span>
    );
};

const ComplaintCard = ({ c, now, onSaved }: { c: Complaint; now: number; onSaved: (c: Complaint) => void }) => {
    const [response, setResponse] = useState('');
    const [sending, setSending] = useState(false);

    const send = async () => {
        const ok = await Swal.fire({
            icon: 'question', title: '¿Enviar respuesta?', showCancelButton: true, confirmButtonText: 'Enviar', cancelButtonText: 'Revisar',
            text: `Se enviará a ${c.email} y quedará registrada en la hoja N° ${c.code}. No podrá modificarse después.`,
            confirmButtonColor: '#dc2626',
        });
        if (!ok.isConfirmed) return;
        setSending(true);
        try {
            const updated = await api.patch<Complaint & { emailSent: boolean }>(`/complaints/${c.id}`, { response });
            onSaved(updated);
            Swal.fire(updated.emailSent
                ? { icon: 'success', title: 'Respuesta enviada', text: `Se envió a ${c.email}.` }
                : { icon: 'warning', title: 'Respuesta guardada', text: `No se pudo enviar el correo a ${c.email}. Envíale la respuesta por otro medio y guarda la constancia.` });
        } catch (error: any) {
            Swal.fire('Error', error?.message || 'No se pudo guardar la respuesta', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <span className="font-bold text-slate-800">Hoja N° {c.code}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${c.type === 'reclamo' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.type.toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-500 ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                {c.status === 'pendiente'
                    ? <Deadline dueDate={c.dueDate} now={now} />
                    : <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">RESPONDIDO</span>}
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Consumidor</p>
                    <p className="font-medium text-slate-800">{c.consumerName}</p>
                    <p className="text-slate-600">{c.documentType} {c.documentNumber}</p>
                    <p className="text-slate-600">{c.address}</p>
                    <p className="text-slate-600">{c.phone} · {c.email}</p>
                    {c.guardianName && <p className="text-slate-600">Menor de edad · Apoderado: {c.guardianName}</p>}
                </div>
                <div>
                    <p className="text-xs uppercase text-slate-400 font-semibold mb-1">Bien contratado</p>
                    <p className="text-slate-800">{c.itemType === 'producto' ? 'Producto' : 'Servicio'}: {c.itemDescription}</p>
                    {c.amount !== null && <p className="text-slate-600">Monto reclamado: S/ {c.amount.toFixed(2)}</p>}
                    {c.orderCode && <p className="text-slate-600">Pedido: {c.orderCode}</p>}
                </div>
            </div>

            <div className="text-sm space-y-2">
                <div><p className="text-xs uppercase text-slate-400 font-semibold">Detalle</p><p className="whitespace-pre-line text-slate-700">{c.detail}</p></div>
                <div><p className="text-xs uppercase text-slate-400 font-semibold">Pedido del consumidor</p><p className="whitespace-pre-line text-slate-700">{c.request}</p></div>
            </div>

            {c.status === 'respondido' ? (
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                    <p className="text-xs uppercase text-green-700 font-semibold mb-1">
                        Respuesta del {c.respondedAt && new Date(c.respondedAt).toLocaleString()} {c.respondedBy && `por ${c.respondedBy}`}
                    </p>
                    <p className="whitespace-pre-line text-slate-700">{c.response}</p>
                </div>
            ) : (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                    <textarea value={response} onChange={(e) => setResponse(e.target.value)} maxLength={5000}
                        placeholder="Observaciones y acciones adoptadas por el proveedor (se enviará al consumidor)"
                        className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                    <button onClick={send} disabled={sending || response.trim().length < 10}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition disabled:opacity-40">
                        <Send size={16} /> {sending ? 'Enviando…' : 'Enviar respuesta'}
                    </button>
                </div>
            )}
        </div>
    );
};

export const Complaints = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pendiente' | 'respondido' | 'todos'>('pendiente');
    const [now, setNow] = useState(() => Date.now()); // hora de la última carga, para calcular plazos

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setComplaints(await api.get<Complaint[]>('/complaints'));
            setNow(Date.now());
        } catch (error: any) {
            Swal.fire('Error', error?.message || 'No se pudieron cargar las reclamaciones', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const pending = complaints.filter((c) => c.status === 'pendiente');
    const overdue = pending.filter((c) => new Date(c.dueDate).getTime() < now).length;
    const visible = useMemo(
        () => complaints.filter((c) => filter === 'todos' || c.status === filter),
        [complaints, filter]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Libro de Reclamaciones</h2>
                <button onClick={load} title="Actualizar" className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {overdue > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    <AlertTriangle size={18} /> Tienes {overdue} {overdue === 1 ? 'hoja vencida' : 'hojas vencidas'}. El plazo legal es de 15 días hábiles.
                </div>
            )}

            <div className="flex gap-2">
                {([['pendiente', `Pendientes (${pending.length})`], ['respondido', 'Respondidos'], ['todos', 'Todos']] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setFilter(id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filter === id ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
                    <BookOpen size={40} className="mx-auto mb-2" />
                    {loading ? 'Cargando…' : 'No hay hojas en esta lista'}
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((c) => (
                        <ComplaintCard key={`${c.id}-${c.status}`} c={c} now={now}
                            onSaved={(u) => setComplaints((list) => list.map((x) => (x.id === u.id ? u : x)))} />
                    ))}
                </div>
            )}
        </div>
    );
};
