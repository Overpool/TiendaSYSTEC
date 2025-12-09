import { useState, type FormEvent } from 'react';
import { useStore } from '../../store/useStore';
import type { Product } from '../../types';
import { Pencil, Trash2, Plus, PackagePlus, Search, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Modal } from '../../components/UI/Modal';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';

export const Inventory = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Stock Update Modal (Quick Add)
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockUpdateId, setStockUpdateId] = useState<string | null>(null);
    const [stockToAdd, setStockToAdd] = useState(0);

    // Interface for form handling to allow empty strings during editing
    interface ProductFormState {
        id?: string;
        name: string;
        category: string;
        brand: string;
        price: number | string;
        cost: number | string;
        stock: number | string;
        description: string;
        image: string;
        isSale: boolean;
        discountPrice?: number | string;
    }

    const [formData, setFormData] = useState<ProductFormState>({
        name: '', category: '', brand: '', price: '', cost: '', stock: '', description: '', image: '', isSale: false
    });

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Derive unique categories and brands from existing products
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        setIsUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image: data.publicUrl }));
            Swal.fire({
                icon: 'success',
                title: 'Imagen subida',
                text: 'La imagen se ha cargado correctamente',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error: any) {
            console.error('Error uploading image:', error.message);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo subir la imagen. Asegúrate de haber creado el bucket "products" y que sea público.',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                ...product,
                // Ensure values are numbers for existing products
                price: product.price,
                cost: product.cost,
                stock: product.stock,
                discountPrice: product.discountPrice
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '', category: '', brand: '', price: '', cost: '', stock: '', description: '', image: 'https://placehold.co/150', isSale: false, discountPrice: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: FormEvent) => {
        e.preventDefault();

        const price = Number(formData.price);
        const cost = Number(formData.cost);
        const stock = Number(formData.stock);
        const discountPrice = Number(formData.discountPrice || 0);

        // Validation Logic
        if (stock < 0) {
            Swal.fire('Error', 'El stock no puede ser negativo', 'error');
            return;
        }
        if (cost < 0) {
            Swal.fire('Error', 'El costo no puede ser negativo', 'error');
            return;
        }
        if (price < 0) {
            Swal.fire('Error', 'El precio de venta no puede ser negativo', 'error');
            return;
        }
        if (price < cost) {
            Swal.fire('Error', 'El precio de venta no puede ser menor al costo', 'error');
            return;
        }
        if (formData.isSale && discountPrice < 0) {
            Swal.fire('Error', 'El precio de oferta no puede ser negativo', 'error');
            return;
        }

        const productData = {
            ...formData,
            price,
            cost,
            stock,
            discountPrice: formData.isSale ? discountPrice : undefined
        } as Product;

        if (editingProduct) {
            updateProduct(editingProduct.id, productData);
            Swal.fire({ icon: 'success', title: 'Producto Actualizado', timer: 1500, showConfirmButton: false });
        } else {
            addProduct({ ...productData, id: Date.now().toString() });
            Swal.fire({ icon: 'success', title: 'Producto Agregado', timer: 1500, showConfirmButton: false });
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '¡Sí, eliminar!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteProduct(id);
                Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
            }
        });
    };

    const handleRestock = (e: FormEvent) => {
        e.preventDefault();
        if (stockUpdateId) {
            const product = products.find(p => p.id === stockUpdateId);
            if (product) {
                updateProduct(stockUpdateId, { stock: product.stock + Number(stockToAdd) });
                Swal.fire({ icon: 'success', title: 'Stock Actualizado', timer: 1500, showConfirmButton: false });
                setIsStockModalOpen(false);
                setStockToAdd(0);
            }
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Gestión de Inventario</h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Agregar</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Producto</th>
                                <th className="px-6 py-3 font-semibold">Marca</th>
                                <th className="px-6 py-3 font-semibold">Categoría</th>
                                <th className="px-6 py-3 font-semibold">Costo</th>
                                <th className="px-6 py-3 font-semibold">Precio</th>
                                <th className="px-6 py-3 font-semibold">Stock</th>
                                <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <img src={product.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-100" />
                                        <div>
                                            <p className="font-medium text-slate-800">{product.name}</p>
                                            {product.isSale && <span className="text-xs text-red-600 font-bold">OFERTA</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{product.brand || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">S/ {product.cost.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-800">S/ {product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => { setStockUpdateId(product.id); setIsStockModalOpen(true); }}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                                            title="Add Stock">
                                            <PackagePlus size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(product)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredProducts.length)} de {filteredProducts.length} productos
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition ${currentPage === page
                                        ? 'bg-red-600 text-white'
                                        : 'text-slate-600 hover:bg-white border border-slate-200'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                        <input className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Marca</label>
                            <input
                                list="brands-list"
                                className="w-full border p-2 rounded"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                placeholder="Seleccionar o escribir nueva..."
                            />
                            <datalist id="brands-list">
                                {uniqueBrands.map(b => <option key={b} value={b} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Categoría</label>
                            <input
                                list="categories-list"
                                className="w-full border p-2 rounded"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Seleccionar o escribir nueva..."
                                required
                            />
                            <datalist id="categories-list">
                                {uniqueCategories.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Stock</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full border p-2 rounded disabled:bg-gray-100 disabled:text-gray-500"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                required
                                disabled={!!editingProduct}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Costo</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full border p-2 rounded"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Precio Venta</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full border p-2 rounded"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Imagen del Producto</label>
                        <div className="mt-1 flex items-center gap-4">
                            {formData.image && (
                                <img src={formData.image} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                            )}
                            <div className="flex-1">
                                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 justify-center transition">
                                    <Upload size={20} />
                                    <span>{isUploading ? 'Subiendo...' : 'Subir Imagen'}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>
                        </div>
                        {/* Hidden input to store URL if needed for manual override or debug, optional */}
                        <input type="hidden" value={formData.image} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea className="w-full border p-2 rounded h-20" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isSale" checked={formData.isSale} onChange={e => setFormData({ ...formData, isSale: e.target.checked })} />
                        <label htmlFor="isSale" className="text-sm font-medium text-gray-700">¿En Oferta?</label>
                    </div>
                    {formData.isSale && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Precio Oferta</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full border p-2 rounded"
                                value={formData.discountPrice}
                                onChange={e => setFormData({ ...formData, discountPrice: e.target.value })}
                            />
                        </div>
                    )}
                    <button type="submit" className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">Guardar</button>
                </form>
            </Modal>

            <Modal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} title="Reabastecer">
                <form onSubmit={handleRestock} className="space-y-4">
                    <p className="text-sm text-gray-600">Agregando stock para {products.find(p => p.id === stockUpdateId)?.name}</p>
                    <input
                        type="number"
                        className="w-full border p-3 rounded text-lg font-bold"
                        placeholder="0"
                        value={stockToAdd}
                        onChange={e => setStockToAdd(Number(e.target.value))}
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Actualizar Stock</button>
                </form>
            </Modal>
        </div>
    );
};
