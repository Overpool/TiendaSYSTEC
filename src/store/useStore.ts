import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../lib/api';
import type { Product, CartItem, Sale, User, Purchase } from '../types';

interface AppState {
    products: Product[];
    cart: CartItem[];
    posCart: CartItem[];
    sales: Sale[];

    // Auth State
    users: User[];
    currentUser: User | null;

    // Loading State
    isLoading: boolean;
    error: string | null;

    // Initialization
    loadInitialData: () => Promise<void>;

    // Product Actions
    obtenerProductos: () => Promise<void>;
    setProducts: (products: Product[]) => void;
    setProductos: (products: Product[] | any[]) => void;
    addProduct: (product: Product) => Promise<Product | null>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;

    // Cart Actions
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    updateCartQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;

    // POS Actions
    addToPosCart: (product: Product) => void;
    removeFromPosCart: (productId: string) => void;
    updatePosCartQuantity: (productId: string, quantity: number) => void;
    clearPosCart: () => void;

    // Sale Actions
    addSale: (sale: Sale) => Promise<void>;

    // Auth Actions
    login: (email: string, password: string, turnstileToken: string) => Promise<boolean>;
    register: (user: Omit<User, 'id' | 'createdAt' | 'role'>, turnstileToken: string) => Promise<void>;
    logout: () => void;
    requestPasswordReset: (email: string, turnstileToken: string) => Promise<void>;
    verifyResetCode: (email: string, code: string, turnstileToken: string) => Promise<string>;
    resetPassword: (resetToken: string, password: string) => Promise<void>;

    // User Management Actions
    addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
    updateUser: (id: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;

    // Search & Filter State
    searchQuery: string;
    selectedCategory: string;
    selectedBrand: string;

    setSearchQuery: (query: string) => void;
    setSelectedCategory: (category: string) => void;
    setSelectedBrand: (brand: string) => void;

    // Purchase Actions
    purchases: Purchase[];
    addPurchase: (purchase: Purchase) => Promise<void>;

    // Wishlist Actions
    toggleWishlist: (productId: string) => Promise<void>;
}

const mapProductData = (p: any): Product => ({
    ...p,
    price: Number(p.price) || 0,
    cost: Number(p.cost) || 0,
    stock: Number(p.stock) || 0,
    minStock: Number(p.minStock ?? p.min_stock ?? 0),
    isSale: Boolean(p.isSale ?? p.is_sale),
    discountPrice: Number(p.discountPrice ?? p.discount_price) || 0
});

const canAccess = (user: User | null, perm?: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'employee') return false;
    return !perm || (user.permissions || []).includes(perm);
};

export const useStore = create<AppState>()(persist((set, get) => ({
    products: [],
    cart: [],
    posCart: [],
    sales: [],
    purchases: [],
    users: [],
    currentUser: null,
    isLoading: false,
    error: null,

    searchQuery: '',
    selectedCategory: '',
    selectedBrand: '',

    setSearchQuery: (query) => set({ searchQuery: query }),
    setSelectedCategory: (category) => set({ selectedCategory: category }),
    setSelectedBrand: (brand) => set({ selectedBrand: brand }),

    loadInitialData: async () => {
        set({ isLoading: true, error: null });
        try {
            // Catálogo público + sesión actual (cookie HttpOnly) en paralelo
            const [productsData, session] = await Promise.all([
                api.get<any[]>('/productos'),
                api.get<{ user: User | null }>('/auth/me').catch(() => ({ user: null })),
            ]);
            set({ products: (productsData || []).map(mapProductData) });

            // Si la cookie expiró o no existe, cerramos la sesión local
            const me = session.user;
            set({ currentUser: me });

            // Datos privados: solo se piden si el usuario tiene permiso
            const [salesRes, purchasesRes, usersRes] = await Promise.allSettled([
                canAccess(me) ? api.get<Sale[]>('/sales') : Promise.resolve([] as Sale[]),
                canAccess(me, 'inventory') ? api.get<Purchase[]>('/purchases') : Promise.resolve([] as Purchase[]),
                canAccess(me, 'users') ? api.get<User[]>('/users') : Promise.resolve([] as User[]),
            ]);
            set({
                sales: salesRes.status === 'fulfilled' ? salesRes.value : [],
                purchases: purchasesRes.status === 'fulfilled' ? purchasesRes.value : [],
                users: usersRes.status === 'fulfilled' ? usersRes.value : [],
            });
        } catch (error: any) {
            console.error('Error loading data:', error);
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    obtenerProductos: async () => {
        try {
            const data = await api.get<any[]>('/productos');
            get().setProductos(data);
        } catch (error) {
            console.error("Error cargando el catálogo:", error);
        }
    },

    setProducts: (products) => set({ products: (products || []).map(mapProductData) }),
    setProductos: (products) => set({ products: (products || []).map(mapProductData) }),

    addProduct: async (product) => {
        try {
            const created = mapProductData(await api.post<Product>('/products', product));
            set((state) => ({ products: [...state.products, created] }));
            return created;
        } catch (error: any) {
            console.error('Error adding product:', error.message);
            return null;
        }
    },

    updateProduct: async (id, updates) => {
        const previous = get().products;
        set((state) => ({
            products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        try {
            await api.patch(`/products/${id}`, updates);
        } catch (error: any) {
            console.error('Error updating product:', error.message);
            set({ products: previous });
        }
    },

    deleteProduct: async (id) => {
        const previous = get().products;
        set((state) => ({
            products: state.products.filter((p) => p.id !== id),
        }));
        try {
            await api.del(`/products/${id}`);
        } catch (error: any) {
            console.error('Error deleting product:', error.message);
            set({ products: previous });
        }
    },

    // Cart (Local Only for now, commonly cart is session based or local)
    addToCart: (product) => set((state) => {
        const existing = state.cart.find((item) => item.id === product.id);
        if (existing) {
            return {
                cart: state.cart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                ),
            };
        }
        return {
            cart: [...state.cart, {
                ...product,
                price: (product.isSale && product.discountPrice) ? product.discountPrice : product.price,
                quantity: 1
            }]
        };
    }),
    removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter((item) => item.id !== id),
    })),
    updateCartQuantity: (id, quantity) => set((state) => ({
        cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
        ),
    })),
    clearCart: () => set({ cart: [] }),

    addToPosCart: (product) => set((state) => {
        const existing = state.posCart.find((item) => item.id === product.id);
        if (existing) {
            return {
                posCart: state.posCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                ),
            };
        }
        return {
            posCart: [...state.posCart, {
                ...product,
                price: (product.isSale && product.discountPrice) ? product.discountPrice : product.price,
                quantity: 1
            }]
        };
    }),
    updatePosCartQuantity: (id, quantity) => set((state) => ({
        posCart: state.posCart.map((item) =>
            item.id === id ? { ...item, quantity } : item
        ),
    })),
    removeFromPosCart: (id) => set((state) => ({
        posCart: state.posCart.filter((item) => item.id !== id),
    })),
    clearPosCart: () => set({ posCart: [] }),

    addPurchase: async (purchase) => {
        // 1. Actualización optimista
        set((state) => ({
            purchases: [purchase, ...state.purchases],
            products: state.products.map(p => {
                const item = purchase.items.find(i => i.id === p.id);
                return item ? { ...p, stock: p.stock + item.quantity } : p;
            })
        }));

        // 2. El servidor guarda la compra y suma el stock en una sola transacción
        try {
            await api.post('/purchases', purchase);
        } catch (error: any) {
            console.error('Error adding purchase:', error.message);
            await get().loadInitialData();
            throw error;
        }
    },

    addSale: async (sale) => {
        // 1. Actualización optimista
        set((state) => ({
            sales: [sale, ...state.sales],
            products: state.products.map(p => {
                const item = sale.items.find(i => i.id === p.id);
                return item ? { ...p, stock: p.stock - item.quantity } : p;
            })
        }));

        // 2. El servidor recalcula el total con precios reales y descuenta stock en una transacción
        try {
            const saved = await api.post<Sale>('/sales', {
                items: sale.items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity })),
                paymentMethod: sale.paymentMethod,
            });
            set((state) => ({
                sales: state.sales.map(s => s.id === sale.id ? saved : s)
            }));
        } catch (error: any) {
            console.error('Error adding sale:', error.message);
            set((state) => ({ sales: state.sales.filter(s => s.id !== sale.id) }));
            get().obtenerProductos();
            throw error;
        }
    },

    login: async (email, password, turnstileToken) => {
        try {
            const { user } = await api.post<{ user: User }>('/auth/login', { email, password, turnstileToken });
            set({ currentUser: user });
            // Cargar datos de administración si corresponde
            get().loadInitialData();
            return true;
        } catch (error: any) {
            // 401 = credenciales inválidas; cualquier otro error (p. ej. Turnstile) se muestra con su mensaje
            if (error.status === 401) return false;
            throw error;
        }
    },

    register: async (userData, turnstileToken) => {
        await api.post('/auth/register', {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            turnstileToken,
        });
    },

    logout: () => {
        api.post('/auth/logout').catch(() => { });
        set({ currentUser: null, sales: [], purchases: [], users: [] });
    },

    requestPasswordReset: async (email, turnstileToken) => {
        await api.post('/auth/forgot', { email, turnstileToken });
    },

    verifyResetCode: async (email, code, turnstileToken) => {
        const { resetToken } = await api.post<{ resetToken: string }>('/auth/verify-code', { email, code, turnstileToken });
        return resetToken;
    },

    resetPassword: async (resetToken, password) => {
        await api.post('/auth/reset', { resetToken, password });
    },

    addUser: async (userData) => {
        try {
            const created = await api.post<User>('/users', userData);
            set((state) => ({ users: [...state.users, created] }));
        } catch (error: any) {
            console.error('Error adding user:', error.message);
            throw error;
        }
    },

    updateUser: async (id, updates) => {
        const { users: prevUsers, currentUser: prevCurrent } = get();
        // No guardamos la contraseña en el estado local
        const { password, ...visible } = updates;
        set((state) => ({ users: state.users.map(u => u.id === id ? { ...u, ...visible } : u) }));
        if (prevCurrent && prevCurrent.id === id) {
            set({ currentUser: { ...prevCurrent, ...visible } });
        }
        try {
            await api.patch(`/users/${id}`, password ? updates : visible);
        } catch (error: any) {
            console.error('Error updating user:', error.message);
            set({ users: prevUsers, currentUser: prevCurrent });
            throw error;
        }
    },

    deleteUser: async (id) => {
        const previous = get().users;
        set((state) => ({ users: state.users.filter(u => u.id !== id) }));
        try {
            await api.del(`/users/${id}`);
        } catch (error: any) {
            console.error('Error deleting user:', error.message);
            set({ users: previous });
        }
    },

    toggleWishlist: async (productId) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const currentWishlist = currentUser.wishlist || [];
        const newWishlist = currentWishlist.includes(productId)
            ? currentWishlist.filter(id => id !== productId)
            : [...currentWishlist, productId];

        const updatedUser = { ...currentUser, wishlist: newWishlist };
        set(state => ({
            currentUser: updatedUser,
            users: state.users.map(u => u.id === currentUser.id ? updatedUser : u)
        }));

        try {
            await api.put('/me/wishlist', { wishlist: newWishlist });
        } catch (error) {
            console.error('Error updating wishlist:', error);
            set({ currentUser });
        }
    },
}), {
    name: 'systec-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        currentUser: state.currentUser,
        cart: state.cart
    })
}));
