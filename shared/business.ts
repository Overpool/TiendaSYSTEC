// Datos del proveedor y condiciones comerciales. Los usan las páginas legales (frontend) y los correos (Worker).
// Datos verificados en SUNAT (RUC activo y habido) el 23/10/2026. Si algo cambia, se actualiza solo aquí.

export const BUSINESS = {
    legalName: 'SYSTEC FDC COORPORATION S.A.C.',
    tradeName: 'SYSTEC FDC',
    ruc: '20611939770',
    address: 'Mz. A Lote 1, Urb. Ingeniería, Oficina Interior, Jesús Nazareno, Huamanga, Ayacucho',
    email: 'systecfdc@gmail.com',
    phone: '973 736 386',
    whatsapp: '51973736386',
    website: 'https://www.systecfl.site',
    facebook: 'https://www.facebook.com/share/1Gbz6p5FaW/',
} as const;

export const POLICIES = {
    returnDays: 7,                 // días calendario para pedir cambio o devolución desde el recojo
    complaintResponseDays: 15,     // días hábiles para responder un reclamo o queja (improrrogables)
    lastUpdated: '23 de octubre de 2026',
} as const;
