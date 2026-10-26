export interface Product {
    id: string;
    code?: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    description: string;
    image: string;
    isSale: boolean;
    discountPrice?: number;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Sale {
    id: string;
    userId?: string;
    items: CartItem[];
    total: number;
    date: string;
    // billetera = Yape/Plin pagado con QR a través de Culqi
    paymentMethod: 'cash' | 'card' | 'yape' | 'plin' | 'billetera';
    paymentRef?: string | null; // id del cobro u orden en Culqi (ventas online)
    customer?: { firstName: string; lastName: string; email: string; phone: string; dni?: string } | null;
}

export type ShipmentStatus = 'pendiente' | 'preparando' | 'enviado' | 'en_agencia' | 'entregado' | 'cancelado';

export interface ShalomAgency {
    id: number;
    departamento: string;
    provincia: string;
    distrito: string;
    nombre: string;
    direccion: string;
    horario: string;
}

export interface Shipment {
    id: string;
    saleId: string;
    status: ShipmentStatus;
    dni: string;
    recipientName: string;
    phone: string;
    email: string;
    department: string;
    province: string;
    agency: { id: number | null; nombre: string; direccion: string; distrito: string; horario: string };
    trackingCode: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    sale: { total: number; items: CartItem[]; paymentMethod: Sale['paymentMethod']; paymentRef: string | null; date: string };
}

export interface PurchaseItem {
    id: string; // Product ID
    name: string;
    code?: string;
    quantity: number;
    cost: number;
}

export interface Purchase {
    id: string;
    supplier: string;
    date: string;
    total: number;
    items: PurchaseItem[];
}

export interface Statistics {
    totalSales: number;
    totalRevenue: number;
    topSellingProducts: Product[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'employee' | 'shopper';
    permissions?: string[]; // e.g. ['inventory', 'pos', 'sales', 'users']
    wishlist?: string[]; // Product IDs
    // Optional Profile Fields
    dni?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    country?: string;
    createdAt: string;
}
