import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Product, Purchase, PurchaseItem } from '../../types';
import { Plus, Search, ShoppingBag, User, Package } from 'lucide-react';
import { Modal } from '../../components/UI/Modal';
import Swal from 'sweetalert2';
import { ProductForm } from '../../components/Admin/ProductForm';

export const Purchases = () => {
    const { products, purchases, addPurchase, addProduct } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // New Purchase Form State
    const [supplier, setSupplier] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [cost, setCost] = useState(0);
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

    // New Product Modal State (Integrated)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplier).filter(Boolean)));

    const handleAddItem = () => {
        if (!selectedProduct) return;

        const newItem: PurchaseItem = {
            id: selectedProduct.id,
            name: selectedProduct.name,
            code: selectedProduct.code,
            quantity: Number(quantity),
            cost: Number(cost)
        };

        setPurchaseItems([...purchaseItems, newItem]);
        setSelectedProduct(null);
        setQuantity(1);
        setCost(0);
        setSearchTerm('');
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...purchaseItems];
        newItems.splice(index, 1);
        setPurchaseItems(newItems);
    };

    const calculateTotal = () => {
        return purchaseItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    };

    const handleSavePurchase = async () => {
        if (!supplier || purchaseItems.length === 0) {
            Swal.fire('Error', 'Ingrese proveedor y al menos un producto', 'error');
            return;
        }

        const newPurchase: Purchase = {
            id: Date.now().toString(),
            supplier,
            date: new Date().toISOString(),
            total: calculateTotal(),
            items: purchaseItems
        };

        await addPurchase(newPurchase);

        Swal.fire({
            icon: 'success',
            title: 'Compra Registrada',
            text: 'El stock ha sido actualizado correctamente',
            timer: 2000,
            showConfirmButton: false
        });

        setIsModalOpen(false);
        setSupplier('');
        setPurchaseItems([]);
    };

    const handleNewProductSubmit = async (product: Product) => {
        // Ensure stock is number
        const productWithStock = {
            ...product,
            stock: Number(product.stock)
        };

        await addProduct(productWithStock);
        setIsProductModalOpen(false);

        // Auto-select the new product for purchase
        setSelectedProduct(productWithStock);
        setCost(productWithStock.cost);

        Swal.fire('Producto Creado', 'Ahora puede agregarlo a la compra', 'success');
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Registro de Compras</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition"
                >
                    <Plus size={20} />
                    <span>Nueva Compra</span>
                </button>
            </div>

            {/* Recent Purchases List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <ShoppingBag size={18} /> Historial de Compras
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Fecha</th>
                                <th className="px-6 py-3 font-semibold">Proveedor</th>
                                <th className="px-6 py-3 font-semibold">Items</th>
                                <th className="px-6 py-3 font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchases.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No hay compras registradas.
                                    </td>
                                </tr>
                            ) : (
                                purchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(purchase.date).toLocaleDateString()} {new Date(purchase.date).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                            {purchase.supplier}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {purchase.items.length} productos
                                            <div className="text-xs text-slate-400 mt-1">
                                                {purchase.items.slice(0, 2).map(i => i.name).join(', ')}
                                                {purchase.items.length > 2 && '...'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                            S/ {purchase.total.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Purchase Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nueva Compra">
                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Proveedor</label>
                            <div className="relative mt-1">
                                <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    list="suppliers-list"
                                    type="text"
                                    className="w-full pl-10 border p-2 rounded-lg"
                                    placeholder="Nombre del proveedor"
                                    value={supplier}
                                    onChange={e => setSupplier(e.target.value)}
                                />
                                <datalist id="suppliers-list">
                                    {uniqueSuppliers.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Agregar Productos</h4>

                        {/* Product Search & Add */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            {!selectedProduct ? (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            className="w-full pl-10 border p-2 rounded-lg"
                                            placeholder="Buscar producto por nombre o código..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />

                                        {/* Dropdown Results - Absolute Positioned */}
                                        {searchTerm && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                                {filteredProducts.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => { setSelectedProduct(p); setCost(p.cost); setSearchTerm(''); }}
                                                        className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                                            <div className="text-xs text-slate-500">Code: {p.code} | Stock: {p.stock}</div>
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-600">S/ {p.price.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                                {filteredProducts.length === 0 && (
                                                    <div className="p-4 text-center">
                                                        <p className="text-sm text-gray-500 mb-2">No encontrado</p>
                                                        <button
                                                            onClick={() => setIsProductModalOpen(true)}
                                                            className="text-red-600 text-sm font-bold hover:underline"
                                                        >
                                                            + Crear Nuevo Producto
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white p-2 rounded border">
                                        <span className="font-medium text-red-600">{selectedProduct.name}</span>
                                        <button onClick={() => setSelectedProduct(null)} className="text-xs text-gray-500 hover:text-red-500">Cambiar</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">Cantidad</label>
                                            <input
                                                type="number" min="1"
                                                className="w-full border p-2 rounded"
                                                value={quantity}
                                                onChange={e => setQuantity(Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600">Costo Unitario</label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                className="w-full border p-2 rounded"
                                                value={cost}
                                                onChange={e => setCost(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddItem}
                                        className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-700 text-sm font-medium"
                                    >
                                        Agregar a la Lista
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Items de la Compra</label>
                        {purchaseItems.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <Package className="mx-auto text-gray-300 mb-2" size={24} />
                                <p className="text-sm text-gray-500">Agregue productos para registrar la compra</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {purchaseItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border">
                                        <div>
                                            <p className="font-medium text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} x S/ {item.cost.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm">S/ {(item.quantity * item.cost).toFixed(2)}</span>
                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <Plus size={16} className="rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Total & Action */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-lg font-bold text-slate-800">
                            Total: <span className="text-red-600">S/ {calculateTotal().toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleSavePurchase}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                        >
                            Guardar Compra
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Product Creation Modal (Simplified) */}
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Nuevo Producto">
                <ProductForm
                    onSubmit={handleNewProductSubmit}
                    onCancel={() => setIsProductModalOpen(false)}
                />
            </Modal>
        </div>
    );
};
