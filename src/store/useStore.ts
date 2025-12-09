import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product, CartItem, Sale, User } from '../types';

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
    setProducts: (products: Product[]) => void;
    addProduct: (product: Product) => Promise<void>;
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
    login: (email: string, password: string) => Promise<boolean>;
    register: (user: Omit<User, 'id' | 'createdAt' | 'role'>) => Promise<void>;
    logout: () => void;

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
}

// Initial Mock Data (For Seeding)
const initialProducts: Product[] = [
    {
        id: '1',
        name: 'Smart Watch Series 8',
        brand: 'Apple Clone',
        category: 'Electronics',
        price: 45.99,
        cost: 20.00,
        stock: 100,
        description: 'Latest smart watch with health tracking',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80',
        isSale: true,
        discountPrice: 29.99
    },
    {
        id: '2',
        name: 'Wireless Earbuds Pro',
        brand: 'AudioTechnica',
        category: 'Electronics',
        price: 25.50,
        cost: 10.00,
        stock: 50,
        description: 'Noise cancelling earbuds',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80',
        isSale: false
    },
    {
        id: '3',
        name: 'Fashion Summer Dress',
        brand: 'Zara',
        category: 'Clothing',
        price: 15.99,
        cost: 5.00,
        stock: 200,
        description: 'Floral print summer dress',
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80',
        isSale: true
    },
    {
        id: '4',
        name: 'Gaming Mechanical Keyboard',
        brand: 'Logitech',
        category: 'Electronics',
        price: 55.00,
        cost: 30.00,
        stock: 15,
        description: 'RGB Backlit mechanical keyboard',
        image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500&q=80',
        isSale: false
    }
];

const initialUsers: User[] = [
    {
        id: '1',
        name: 'Admin User',
        email: 'admin@aliexpress.com',
        password: 'admin123',
        role: 'admin',
        permissions: ['inventory', 'pos', 'sales', 'users'],
        createdAt: new Date().toISOString()
    }
];

export const useStore = create<AppState>((set, get) => ({
    products: [],
    cart: [],
    posCart: [],
    sales: [],
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
            // Fetch Products
            const { data: productsData, error: prodError } = await supabase.from('products').select('*');
            if (prodError) throw prodError;

            // Map DB snake_case to Frontend camelCase with strict casting
            const products: Product[] = (productsData || []).map((p: any) => ({
                ...p,
                isSale: Boolean(p.is_sale),
                discountPrice: Number(p.discount_price) || 0
            }));

            // Fetch Sales
            const { data: salesData, error: salesError } = await supabase.from('sales').select('*');
            if (salesError) throw salesError;

            const sales: Sale[] = (salesData || []).map((s: any) => ({
                ...s,
                paymentMethod: s.payment_method
            }));

            // Fetch Users
            const { data: usersData, error: usersError } = await supabase.from('users').select('*');
            if (usersError) throw usersError;

            const users: User[] = (usersData || []).map((u: any) => ({
                ...u,
                createdAt: u.created_at
            }));

            // Seed if empty
            if ((!products || products.length === 0) && (!users || users.length === 0)) {
                console.log('Seeding initial data...');
                // Seed Products - removing IDs to let DB generate UUIDs
                const productsToInsert = initialProducts.map(({ id, ...rest }) => rest);
                const { data: newProds, error: seedError } = await supabase.from('products').insert(productsToInsert).select();

                const usersToInsert = initialUsers.map(({ id, ...rest }) => rest);
                const { data: newUsers, error: seedUserError } = await supabase.from('users').insert(usersToInsert).select();

                if (seedError) console.error("Seed error products", seedError);
                if (seedUserError) console.error("Seed error users", seedUserError);

                if (newProds) {
                    const mappedProds = newProds.map((p: any) => ({
                        ...p,
                        isSale: Boolean(p.is_sale),
                        discountPrice: Number(p.discount_price) || 0
                    }));
                    set({ products: mappedProds });
                }
                if (newUsers) {
                    const mappedUsers = newUsers.map((u: any) => ({
                        ...u,
                        createdAt: u.created_at
                    }));
                    set({ users: mappedUsers });
                }
            } else {
                set({
                    products: products || [],
                    sales: sales || [],
                    users: users || []
                });
            }

        } catch (error: any) {
            console.error('Error loading data:', error);
            set({ error: error.message });
            set({ products: initialProducts, users: initialUsers });
        } finally {
            set({ isLoading: false });
        }
    },

    setProducts: (products) => set({ products }),

    addProduct: async (product) => {
        // Optimistic update
        set((state) => ({ products: [...state.products, product] }));

        // Prepare for DB
        const productToInsert = {
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            description: product.description,
            image: product.image,
            is_sale: product.isSale,
            discount_price: product.discountPrice
        };

        const { data, error } = await supabase.from('products').insert([productToInsert]).select();

        if (error) {
            console.error('Error adding product:', error.message);
        } else if (data) {
            // Update state with real ID
            const newProduct = {
                ...product,
                id: data[0].id,
                isSale: data[0].is_sale,
                discountPrice: data[0].discount_price
            };
            set((state) => ({
                products: state.products.map(p => p.id === product.id ? newProduct : p)
            }));
        }
    },

    updateProduct: async (id, updates) => {
        set((state) => ({
            products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
        if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.image !== undefined) dbUpdates.image = updates.image;
        if (updates.isSale !== undefined) dbUpdates.is_sale = updates.isSale;
        if (updates.discountPrice !== undefined) dbUpdates.discount_price = updates.discountPrice;

        const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
        if (error) console.error('Error updating product:', error.message);
    },

    deleteProduct: async (id) => {
        set((state) => ({
            products: state.products.filter((p) => p.id !== id),
        }));
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) console.error('Error deleting product:', error);
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
        return { cart: [...state.cart, { ...product, quantity: 1 }] };
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
        return { posCart: [...state.posCart, { ...product, quantity: 1 }] };
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

    addSale: async (sale) => {
        // Optimistic (using temp ID)
        set((state) => ({ sales: [sale, ...state.sales] }));

        const saleToInsert = {
            total: sale.total,
            payment_method: sale.paymentMethod,
            date: sale.date,
            items: sale.items
        };

        const { data, error } = await supabase.from('sales').insert([saleToInsert]).select();

        if (error) {
            console.error('Error adding sale:', error.message);
        } else if (data) {
            const newSale = {
                ...sale,
                id: data[0].id,
                paymentMethod: data[0].payment_method
            };
            // Update optimistic ID
            set((state) => ({
                sales: state.sales.map(s => s.id === sale.id ? newSale : s)
            }));

            // Deduct stock
            for (const item of sale.items) {
                const currentProduct = get().products.find(p => p.id === item.id);
                if (currentProduct) {
                    const newStock = currentProduct.stock - item.quantity;
                    await get().updateProduct(item.id, { stock: newStock });
                }
            }
        }
    },

    login: async (email, password) => {
        const { data: usersData, error } = await supabase.from('users').select('*');
        if (error) console.error('Error fetching users for login:', error.message);

        const fetchedUsers = (usersData || []).map((u: any) => ({
            ...u,
            createdAt: u.created_at
        }));

        const user = fetchedUsers.find((u: User) => u.email === email && u.password === password);

        if (user) {
            set({ currentUser: user });
            return true;
        }
        return false;
    },

    register: async (userData) => {
        const newId = Date.now().toString();
        const newUser = { ...userData, id: newId, role: 'shopper', createdAt: new Date().toISOString() };

        set((state) => ({ users: [...state.users, newUser as any] }));

        const userToInsert = {
            id: newId,
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: 'shopper',
            created_at: newUser.createdAt
        };

        const { error } = await supabase.from('users').insert([userToInsert]);
        if (error) console.error('Error registering:', error.message);
    },

    logout: () => set({ currentUser: null }),

    addUser: async (userData) => {
        const newId = Date.now().toString();
        const newUser = { ...userData, id: newId, createdAt: new Date().toISOString() };

        set((state) => ({ users: [...state.users, newUser as any] }));

        const userToInsert = {
            id: newId,
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            permissions: userData.permissions,
            created_at: newUser.createdAt
        };

        const { error } = await supabase.from('users').insert([userToInsert]);
        if (error) console.error('Error adding user:', error.message);
    },

    updateUser: async (id, updates) => {
        set((state) => ({ users: state.users.map(u => u.id === id ? { ...u, ...updates } : u) }));

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions;
        if (updates.password !== undefined) dbUpdates.password = updates.password;

        const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
        if (error) console.error('Error updating user:', error.message);
    },

    deleteUser: async (id) => {
        set((state) => ({ users: state.users.filter(u => u.id !== id) }));
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) console.error('Error deleting user:', error.message);
    },
}));
