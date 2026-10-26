// Libro de Reclamaciones virtual (Ley N° 29571). Formulario propio del sitio, como exige INDECOPI.

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { api } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { Turnstile } from '../../components/Turnstile';
import { BUSINESS, POLICIES } from '../../../shared/business';

interface Form {
    type: 'reclamo' | 'queja' | '';
    consumerName: string;
    documentType: 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';
    documentNumber: string;
    address: string;
    phone: string;
    email: string;
    isMinor: boolean;
    guardianName: string;
    itemType: 'producto' | 'servicio';
    itemDescription: string;
    amount: string;
    orderCode: string;
    detail: string;
    request: string;
    truthful: boolean;
}

const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm';

const Field = ({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) => (
    <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-600"> *</span>}</span>
        {children}
    </label>
);

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
    <fieldset className="border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
        <legend className="px-2 text-sm font-bold text-gray-900">{title}</legend>
        {children}
    </fieldset>
);

export const ComplaintsBook = () => {
    const { currentUser } = useStore();
    const [form, setForm] = useState<Form>({
        type: '', consumerName: currentUser?.name ?? '', documentType: 'DNI', documentNumber: '', address: '',
        phone: currentUser?.phone ?? '', email: currentUser?.email ?? '', isMinor: false, guardianName: '',
        itemType: 'producto', itemDescription: '', amount: '', orderCode: '', detail: '', request: '', truthful: false,
    });
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ code: string; createdAt: string; dueDate: string } | null>(null);

    const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
    const today = new Date().toLocaleDateString('es-PE', { dateStyle: 'long' });

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.type) { Swal.fire('Falta un dato', 'Indica si es un reclamo o una queja', 'warning'); return; }
        if (!form.truthful) { Swal.fire('Falta un dato', 'Confirma que los datos consignados son verdaderos', 'warning'); return; }
        if (!turnstileToken) { Swal.fire('Verificación pendiente', 'Completa la verificación de seguridad', 'warning'); return; }
        setSubmitting(true);
        try {
            setResult(await api.post('/complaints', { ...form, turnstileToken }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            Swal.fire('Error', error?.message || 'No se pudo registrar tu hoja de reclamación', 'error');
        } finally {
            setSubmitting(false);
            setTurnstileKey((k) => k + 1);
        }
    };

    const header = (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
            <div className="flex items-center gap-3">
                <div className="bg-red-600 text-white p-3 rounded-xl"><BookOpen size={28} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Libro de Reclamaciones</h1>
                    <p className="text-sm text-gray-500">Conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571)</p>
                </div>
            </div>
            <div className="text-sm text-gray-600 md:text-right">
                <p className="font-bold text-gray-800">{BUSINESS.legalName}</p>
                <p>RUC {BUSINESS.ruc}</p>
                <p className="max-w-xs">{BUSINESS.address}</p>
            </div>
        </div>
    );

    if (result) {
        return (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
                {header}
                <div className="text-center space-y-3 py-6">
                    <CheckCircle size={56} className="text-green-600 mx-auto" />
                    <h2 className="text-xl font-bold text-gray-900">Registramos tu hoja de reclamación</h2>
                    <p className="text-3xl font-mono font-bold text-red-600">N° {result.code}</p>
                    <p className="text-gray-600">Fecha de registro: {new Date(result.createdAt).toLocaleString('es-PE')}</p>
                    <p className="text-gray-600">
                        Te enviamos una copia a <b>{form.email}</b>. Te responderemos a ese correo a más tardar el{' '}
                        <b>{new Date(result.dueDate).toLocaleDateString('es-PE', { dateStyle: 'long' })}</b>.
                    </p>
                    <Link to="/" className="inline-block mt-4 bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-red-700 transition">
                        Volver a la tienda
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-4">
                <ArrowLeft size={20} />
                <span className="font-medium">Volver a la tienda</span>
            </Link>
            <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-6">
                {header}
                <div className="flex flex-wrap justify-between text-sm text-gray-600 gap-2">
                    <span><b>Hoja de reclamación N°:</b> se asigna al enviar</span>
                    <span><b>Fecha:</b> {today}</span>
                </div>

                <Block title="1. Identificación del consumidor reclamante">
                    <Field label="Nombres y apellidos" required>
                        <input className={input} value={form.consumerName} onChange={(e) => set('consumerName', e.target.value)} required maxLength={150} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Tipo de documento" required>
                            <select className={input} value={form.documentType} onChange={(e) => set('documentType', e.target.value as Form['documentType'])}>
                                <option value="DNI">DNI</option>
                                <option value="CE">Carné de extranjería</option>
                                <option value="PASAPORTE">Pasaporte</option>
                                <option value="RUC">RUC</option>
                            </select>
                        </Field>
                        <div className="md:col-span-2">
                            <Field label="Número de documento" required>
                                <input className={input} value={form.documentNumber} onChange={(e) => set('documentNumber', e.target.value.replace(/\s/g, ''))} required maxLength={12} />
                            </Field>
                        </div>
                    </div>
                    <Field label="Domicilio" required>
                        <input className={input} value={form.address} onChange={(e) => set('address', e.target.value)} required maxLength={250} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Teléfono" required>
                            <input className={input} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} required maxLength={20} />
                        </Field>
                        <Field label="Correo electrónico" required>
                            <input className={input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required maxLength={150} />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={form.isMinor} onChange={(e) => set('isMinor', e.target.checked)} />
                        Soy menor de edad
                    </label>
                    {form.isMinor && (
                        <Field label="Nombre del padre, madre o apoderado" required>
                            <input className={input} value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} required maxLength={150} />
                        </Field>
                    )}
                </Block>

                <Block title="2. Identificación del bien contratado">
                    <div className="flex gap-6 text-sm">
                        {(['producto', 'servicio'] as const).map((v) => (
                            <label key={v} className="flex items-center gap-2">
                                <input type="radio" name="itemType" checked={form.itemType === v} onChange={() => set('itemType', v)} />
                                {v === 'producto' ? 'Producto' : 'Servicio'}
                            </label>
                        ))}
                    </div>
                    <Field label="Descripción del producto o servicio" required>
                        <input className={input} value={form.itemDescription} onChange={(e) => set('itemDescription', e.target.value)} required maxLength={500} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Monto reclamado (S/)">
                            <input className={input} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
                        </Field>
                        <Field label="N° de pedido (si lo tienes)">
                            <input className={input} value={form.orderCode} onChange={(e) => set('orderCode', e.target.value)} maxLength={40} />
                        </Field>
                    </div>
                </Block>

                <Block title="3. Detalle de la reclamación y pedido del consumidor">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {([
                            ['reclamo', 'Reclamo', 'Disconformidad relacionada a los productos o servicios.'],
                            ['queja', 'Queja', 'Disconformidad no relacionada a los productos o servicios, o malestar o descontento respecto a la atención al público.'],
                        ] as const).map(([value, label, help]) => (
                            <label key={value} className={`p-3 rounded-xl border-2 cursor-pointer transition ${form.type === value ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <span className="flex items-center gap-2 font-bold text-sm text-gray-800">
                                    <input type="radio" name="type" checked={form.type === value} onChange={() => set('type', value)} /> {label}
                                </span>
                                <span className="block text-xs text-gray-500 mt-1">{help}</span>
                            </label>
                        ))}
                    </div>
                    <Field label="Detalle" required>
                        <textarea className={`${input} min-h-[120px]`} value={form.detail} onChange={(e) => set('detail', e.target.value)} required maxLength={3000} />
                    </Field>
                    <Field label="Pedido (qué solución esperas)" required>
                        <textarea className={`${input} min-h-[80px]`} value={form.request} onChange={(e) => set('request', e.target.value)} required maxLength={2000} />
                    </Field>
                </Block>

                <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4 space-y-1">
                    <p>* La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.</p>
                    <p>* El proveedor deberá dar respuesta al reclamo o queja en un plazo no mayor a {POLICIES.complaintResponseDays} días hábiles improrrogables. La respuesta se enviará al correo electrónico consignado.</p>
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="mt-1" checked={form.truthful} onChange={(e) => set('truthful', e.target.checked)} />
                    Declaro que los datos consignados son verdaderos y acepto que la respuesta se me envíe al correo electrónico indicado.
                </label>

                <Turnstile key={turnstileKey} action="complaint" onToken={setTurnstileToken} />

                <button type="submit" disabled={submitting || !turnstileToken}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-60">
                    {submitting ? 'Enviando…' : 'Enviar hoja de reclamación'}
                </button>
            </form>
        </div>
    );
};
