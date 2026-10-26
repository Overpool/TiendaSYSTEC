// Datos de envío por Shalom que llena el cliente en el carrito.

export interface ShippingData {
    dni: string;
    fullName: string;      // lo completa la consulta del DNI
    phone: string;
    department: string;
    province: string;
    agencyId: number | null;
    agencyName: string;    // solo si la lista de agencias no carga (ingreso manual)
}

export const emptyShipping = (phone = ''): ShippingData => ({
    dni: '', fullName: '', phone, department: '', province: '', agencyId: null, agencyName: '',
});

/** Mensaje de error si faltan datos; null si todo está completo */
export const validateShipping = (s: ShippingData, manualAgency: boolean) => {
    if (!/^\d{8}$/.test(s.dni) || !s.fullName) return 'Ingresa tu DNI y espera a que aparezca tu nombre';
    if (!/^9\d{8}$/.test(s.phone)) return 'Ingresa un número de celular válido (9 dígitos)';
    if (!s.department || !s.province) return 'Selecciona el departamento y la provincia de destino';
    if (manualAgency ? !s.agencyName.trim() : !s.agencyId) return 'Selecciona la agencia de Shalom donde recogerás tu pedido';
    return null;
};
