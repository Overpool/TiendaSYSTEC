// Datos de envío por Shalom: DNI (autocompleta el nombre con apisPeru), celular y agencia de destino.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, CheckCircle, MapPin } from 'lucide-react';
import { api } from '../../lib/api';
import type { ShippingData } from '../../lib/shipping';
import type { ShalomAgency } from '../../types';

let agenciesPromise: Promise<ShalomAgency[]> | null = null;
const loadAgencies = () => {
    agenciesPromise ??= api.get<ShalomAgency[]>('/shalom/agencias').catch((err) => { agenciesPromise = null; throw err; });
    return agenciesPromise;
};

interface Props {
    value: ShippingData;
    onChange: (v: ShippingData) => void;
    onManualAgencyChange: (manual: boolean) => void;
    disabled?: boolean;
}

export const ShippingForm = ({ value, onChange, onManualAgencyChange, disabled }: Props) => {
    const [agencies, setAgencies] = useState<ShalomAgency[] | null>(null);
    const [agenciesFailed, setAgenciesFailed] = useState(false);
    const [dniState, setDniState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
    const namesByDni = useRef(new Map<string, string>()); // evita repetir consultas al corregir el DNI

    const set = (patch: Partial<ShippingData>) => onChange({ ...value, ...patch });

    useEffect(() => {
        loadAgencies()
            .then(setAgencies)
            .catch(() => { setAgenciesFailed(true); onManualAgencyChange(true); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Consulta el DNI cuando tiene 8 dígitos
    useEffect(() => {
        const dni = value.dni;
        if (!/^\d{8}$/.test(dni) || value.fullName) return;
        const known = namesByDni.current.get(dni);
        if (known) { onChange({ ...value, fullName: known }); return; }
        let cancelled = false;
        setDniState({ loading: true, error: null });
        api.get<{ nombres: string; apellidos: string }>(`/dni/${dni}`)
            .then((r) => {
                if (cancelled) return;
                const fullName = `${r.apellidos} ${r.nombres}`.trim(); // formato del DNI: apellidos y nombres
                namesByDni.current.set(dni, fullName);
                setDniState({ loading: false, error: null });
                onChange({ ...value, fullName });
            })
            .catch((err) => { if (!cancelled) setDniState({ loading: false, error: err?.message || 'No se pudo consultar el DNI' }); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.dni]);

    const departments = useMemo(() => [...new Set((agencies ?? []).map((a) => a.departamento))], [agencies]);
    const provinces = useMemo(
        () => [...new Set((agencies ?? []).filter((a) => a.departamento === value.department).map((a) => a.provincia))],
        [agencies, value.department]);
    const options = useMemo(
        () => (agencies ?? []).filter((a) => a.departamento === value.department && a.provincia === value.province),
        [agencies, value.department, value.province]);
    const selected = options.find((a) => a.id === value.agencyId);

    const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm disabled:bg-gray-100';

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Datos de envío (Shalom)</label>

            <div>
                <input
                    className={inputClass} inputMode="numeric" placeholder="DNI (8 dígitos)" maxLength={8} disabled={disabled}
                    value={value.dni}
                    onChange={(e) => set({ dni: e.target.value.replace(/\D/g, '').slice(0, 8), fullName: '' })}
                />
                <div className="mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm min-h-[38px] flex items-center gap-2">
                    {dniState.loading ? (
                        <><Loader2 size={16} className="animate-spin text-gray-400" /><span className="text-gray-500">Buscando…</span></>
                    ) : value.fullName ? (
                        <><CheckCircle size={16} className="text-green-600 shrink-0" /><span className="font-medium text-gray-800">{value.fullName}</span></>
                    ) : dniState.error && value.dni.length === 8 ? (
                        <span className="text-red-600">{dniState.error}</span>
                    ) : (
                        <span className="text-gray-400">Nombres y apellidos (se completan con tu DNI)</span>
                    )}
                </div>
            </div>

            <input
                className={inputClass} type="tel" inputMode="numeric" placeholder="Celular (9 dígitos)" autoComplete="tel-national"
                disabled={disabled} value={value.phone}
                onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
            />

            {agenciesFailed ? (
                <>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                        No pudimos cargar la lista de agencias de Shalom. Escribe tu destino y la agencia donde recogerás tu pedido.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <input className={inputClass} placeholder="Departamento" disabled={disabled} value={value.department} onChange={(e) => set({ department: e.target.value })} />
                        <input className={inputClass} placeholder="Provincia" disabled={disabled} value={value.province} onChange={(e) => set({ province: e.target.value })} />
                    </div>
                    <input className={inputClass} placeholder="Agencia Shalom (nombre o dirección)" disabled={disabled} value={value.agencyName} onChange={(e) => set({ agencyName: e.target.value })} />
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <select className={inputClass} disabled={disabled || !agencies} value={value.department}
                            onChange={(e) => set({ department: e.target.value, province: '', agencyId: null })}>
                            <option value="">{agencies ? 'Departamento' : 'Cargando…'}</option>
                            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className={inputClass} disabled={disabled || !value.department} value={value.province}
                            onChange={(e) => set({ province: e.target.value, agencyId: null })}>
                            <option value="">Provincia</option>
                            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <select className={inputClass} disabled={disabled || !value.province} value={value.agencyId ?? ''}
                        onChange={(e) => set({ agencyId: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Agencia Shalom de destino</option>
                        {options.map((a) => <option key={a.id} value={a.id}>{a.nombre}{a.distrito && a.distrito !== a.nombre ? ` (${a.distrito})` : ''}</option>)}
                    </select>
                    {selected && (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 flex gap-2">
                            <MapPin size={14} className="text-red-600 shrink-0 mt-0.5" />
                            <span>
                                {selected.direccion}
                                {selected.horario && <span className="block text-gray-400">{selected.horario}</span>}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
