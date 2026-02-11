import { useStore } from '../../store/useStore';
import { X, Heart, ShoppingCart } from 'lucide-react';
import Swal from 'sweetalert2';

interface WishlistProps {
    onClose: () => void;
}

export const Wishlist = ({ onClose }: WishlistProps) => {
    const { currentUser, products, toggleWishlist, addToCart } = useStore();

    if (!currentUser) return null;

    const wishlistIds = currentUser.wishlist || [];
    const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

    const handleAddToCart = (product: any) => {
        addToCart(product);
        Swal.fire({
            icon: 'success',
            title: 'Agregado al carrito',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Heart size={24} className="fill-white" />
                        Mi Lista de Deseos
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {wishlistProducts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Heart size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">No tienes productos en tu lista de deseos.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {wishlistProducts.map(product => (
                                <div key={product.id} className="border border-gray-100 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow">
                                    <div className="w-20 h-20 bg-gray-50 rounded-lg shrink-0 overflow-hidden">
                                        <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900 truncate" title={product.name}>{product.name}</h3>
                                            <p className="text-red-600 font-bold">S/ {product.isSale ? product.discountPrice : product.price}</p>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                onClick={() => toggleWishlist(product.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar de la lista"
                                            >
                                                <Heart size={18} className="fill-red-500 text-red-500" />
                                            </button>
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                                                title="Agregar al carrito"
                                            >
                                                <ShoppingCart size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
