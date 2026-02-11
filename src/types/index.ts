export interface Product {
    id: string;
    code?: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
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
    paymentMethod: 'cash' | 'card' | 'yape' | 'plin';
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
