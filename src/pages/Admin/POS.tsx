import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, ShoppingCart, X, ShoppingBag } from 'lucide-react';
import Swal from 'sweetalert2';

export const POS = () => {
    const { products, posCart, addToPosCart, updatePosCartQuantity, removeFromPosCart, clearPosCart, addSale } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cartTotal = posCart.reduce((acc, item) => acc + (item.isSale ? (item.discountPrice || item.price) : item.price) * item.quantity, 0);

    const handleCheckout = (method: 'cash' | 'card') => {
        if (posCart.length === 0) return;

        Swal.fire({
            title: 'Procesando Pago...',
            timer: 1000,
            didOpen: () => {
                Swal.showLoading();
            }
        }).then(() => {
            const sale = {
                id: Date.now().toString(),
                items: [...posCart],
                total: cartTotal,
                date: new Date().toISOString(),
                paymentMethod: method
            };
            addSale(sale);
            clearPosCart();
            Swal.fire({ icon: 'success', title: 'Pago Exitoso', text: `Recibo #${sale.id.slice(-6)}` });
        });
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 relative">
            {/* Mobile Cart Toggle FAB */}
            <button
                onClick={() => setIsCartOpen(true)}
                className="xl:hidden fixed bottom-6 right-6 z-40 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center"
            >
                <ShoppingCart size={24} />
                {posCart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-red-600">
                        {posCart.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                )}
            </button>

            {/* Overlay */}
            {isCartOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 xl:hidden"
                    onClick={() => setIsCartOpen(false)}
                />
            )}

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pr-2">
                <div className="sticky top-0 bg-slate-50 p-1 pb-4 z-10">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map(product => {
                        const price = product.isSale ? (product.discountPrice || product.price) : product.price;
                        const inStock = product.stock > 0;
                        return (
                            <div
                                key={product.id}
                                onClick={() => inStock && addToPosCart(product)}
                                className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-red-200 ${!inStock ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="font-medium text-slate-800 text-sm line-clamp-2 h-10 text-center">{product.name}</h4>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="font-bold text-slate-900">S/ {price.toFixed(2)}</span>
                                    <span className={`text-xs ${inStock ? 'text-green-600' : 'text-red-500'}`}>{inStock ? `${product.stock} en stock` : 'Agotado'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cart Panel */}
            <div className={`
                fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
                xl:relative xl:transform-none xl:shadow-lg xl:w-96 xl:translate-x-0 xl:flex xl:flex-col xl:h-full xl:rounded-2xl xl:border xl:border-slate-100
                ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Venta Actual</h3>
                    <div className="flex items-center gap-4">
                        <button onClick={clearPosCart} className="text-sm text-red-500 hover:text-red-700">Limpiar</button>
                        <button onClick={() => setIsCartOpen(false)} className="xl:hidden text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {posCart.map(item => {
                        const price = item.isSale ? (item.discountPrice || item.price) : item.price;
                        return (
                            <div key={item.id} className="flex gap-3 bg-slate-50 p-2 rounded-lg">
                                <img src={item.image} className="w-12 h-12 rounded object-cover" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-slate-800 line-clamp-1">{item.name}</h4>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="font-bold text-slate-700">S/ {price.toFixed(2)}</span>
                                        <div className="flex items-center gap-2 bg-white rounded border border-gray-200 px-1">
                                            <button onClick={() => updatePosCartQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-1 hover:bg-gray-100"><Minus size={12} /></button>
                                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updatePosCartQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-gray-100"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeFromPosCart(item.id)} className="text-gray-400 hover:text-red-500 self-center"><Trash2 size={16} /></button>
                            </div>
                        );
                    })}
                    {posCart.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                            <ShoppingBag size={48} className="opacity-20" />
                            <p>El carrito está vacío</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500">Monto Total</span>
                        <span className="text-2xl font-bold text-slate-900">S/ {cartTotal.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleCheckout('cash')}
                            disabled={posCart.length === 0}
                            className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <Banknote size={20} />
                            Efectivo
                        </button>
                        <button
                            onClick={() => handleCheckout('card')}
                            disabled={posCart.length === 0}
                            className="flex items-center justify-center gap-2 bg-indigo-500 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <CreditCard size={20} />
                            Tarjeta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


