import { useState, type FormEvent } from 'react';
import type { Product } from '../../types';
import { Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { useStore } from '../../store/useStore';

interface ProductFormProps {
    initialData?: Product | null;
    onSubmit: (product: Product) => void;
    onCancel: () => void;
}

export const ProductForm = ({ initialData, onSubmit, onCancel }: ProductFormProps) => {
    const { products } = useStore();
    const [isUploading, setIsUploading] = useState(false);

    // Derive unique categories and brands from existing products
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

    interface ProductFormState {
        id?: string;
        code: string;
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

    const [formData, setFormData] = useState<ProductFormState>(() => {
        if (initialData) {
            return {
                ...initialData,
                code: initialData.code || '',
                price: initialData.price,
                cost: initialData.cost,
                stock: initialData.stock,
                discountPrice: initialData.discountPrice
            };
        }
        return {
            name: '', code: '', category: '', brand: '', price: '', cost: '', stock: '', description: '', image: 'https://placehold.co/150', isSale: false, discountPrice: ''
        };
    });

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

    const handleSubmit = (e: FormEvent) => {
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

        // Check for duplicate code
        if (formData.code) {
            const duplicate = products.find(p => p.code === formData.code && p.id !== (initialData?.id || ''));
            if (duplicate) {
                Swal.fire('Error', 'El código del producto ya existe', 'error');
                return;
            }
        }

        const finalProduct: Product = {
            id: initialData?.id || Date.now().toString(),
            ...formData,
            price,
            cost,
            stock,
            discountPrice: formData.isSale ? discountPrice : undefined
        } as Product;

        onSubmit(finalProduct);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name - Full Width */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                <input className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>

            {/* Code & Brand */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Código</label>
                    <input className="w-full border p-2 rounded" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="SKU-123" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Marca</label>
                    <input
                        list="brands-list-form"
                        className="w-full border p-2 rounded"
                        value={formData.brand}
                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Seleccionar o escribir nueva..."
                    />
                    <datalist id="brands-list-form">
                        {uniqueBrands.map(b => <option key={b} value={b} />)}
                    </datalist>
                </div>
            </div>

            {/* Category & Stock */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Categoría</label>
                    <input
                        list="categories-list-form"
                        className="w-full border p-2 rounded"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Seleccionar o escribir nueva..."
                        required
                    />
                    <datalist id="categories-list-form">
                        {uniqueCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full border p-2 rounded disabled:bg-gray-100 disabled:text-gray-500"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                        required
                        disabled={!!initialData} // Disable stock editing if updating existing product
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
            <div className="flex gap-2 pt-2">
                <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-bold hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">Guardar</button>
            </div>
        </form>
    );
};
