export interface Product {
    id: string;
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
    items: CartItem[];
    total: number;
    date: string;
    paymentMethod: 'cash' | 'card' | 'yape' | 'plin';
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
    createdAt: string;
}
