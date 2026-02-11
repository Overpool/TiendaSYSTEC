
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ShoppingCart, X, ChevronLeft, ChevronRight, Plus, Heart } from 'lucide-react';
import Swal from 'sweetalert2';

export const Store = () => {
    const {
        products,
        addToCart,
        searchQuery,
        selectedCategory,
        selectedBrand,
        loadInitialData,
        setSearchQuery,
        setSelectedCategory,
        setSelectedBrand,
        toggleWishlist,
        currentUser
    } = useStore();

    // Reset filters and load data on mount to ensure user sees all offers
    useEffect(() => {
        setSearchQuery('');
        setSelectedCategory('');
        setSelectedBrand('');
        loadInitialData();
    }, []);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
        const matchesBrand = selectedBrand ? p.brand === selectedBrand : true;
        return matchesSearch && matchesCategory && matchesBrand;
    });

    const salesProducts = filteredProducts.filter(p => p.isSale);
    const regularProducts = filteredProducts.filter(p => !p.isSale);




    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

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

    // Product Modal Component
    const ProductModal = ({ product, onClose }: { product: any, onClose: () => void }) => {
        if (!product) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                <div
                    className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                    >
                        <X size={24} />
                    </button>

                    {/* Image Section */}
                    <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-8 shrink-0 relative">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="max-h-[40vh] md:max-h-[60vh] object-contain mix-blend-multiply transition-transform hover:scale-110 duration-500"
                        />
                        {product.isSale && (
                            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full font-bold shadow-lg">
                                -{(100 - (product.discountPrice! / product.price * 100)).toFixed(0)}%
                            </div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                        <div className="mb-4 md:mb-6">
                            <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase tracking-wider">
                                {product.brand}
                            </span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className="text-sm text-gray-500">{product.category}</span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className="text-sm font-bold text-gray-700">{product.stock} UND</span>
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">{product.name}</h2>

                        <div className="flex items-end justify-between mb-6">
                            <div className="flex items-end gap-3">
                                {product.isSale ? (
                                    <>
                                        <span className="text-3xl md:text-4xl font-bold text-red-600">S/ {product.discountPrice?.toFixed(2)}</span>
                                        <span className="text-lg text-gray-400 line-through mb-1">S/ {product.price.toFixed(2)}</span>
                                    </>
                                ) : (
                                    <span className="text-3xl md:text-4xl font-bold text-gray-900">S/ {product.price.toFixed(2)}</span>
                                )}
                            </div>

                            {/* Mobile Add to Cart Button (< 940px) */}
                            <button
                                onClick={() => {
                                    handleAddToCart(product);
                                    onClose();
                                }}
                                className="max-[940px]:flex hidden bg-red-600 text-white p-3 rounded-xl shadow-lg shadow-red-600/20 items-center justify-center gap-1 hover:bg-red-700 transition"
                            >
                                <ShoppingCart size={24} />
                                <Plus size={20} className="stroke-[3]" />
                            </button>
                        </div>

                        <div className="prose prose-slate mb-8 bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Descripción del Producto</h3>
                            <p className="text-gray-600 leading-relaxed text-sm md:text-lg">
                                {product.description || "Este producto cuenta con características de alta calidad, diseñado para satisfacer las necesidades más exigentes. Fabricado con materiales duraderos y con garantía de fábrica."}
                            </p>
                        </div>

                        <div className="mt-auto flex flex-col gap-4">
                            <button
                                onClick={() => {
                                    handleAddToCart(product);
                                    onClose();
                                }}
                                className="max-[940px]:hidden w-full bg-red-600 text-white py-3 md:py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <ShoppingCart size={24} />
                                Agregar al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ProductCard = ({ product }: { product: any }) => (
        <div
            onClick={() => setSelectedProduct(product)}
            className="bg-white rounded-lg shadow hover:shadow-xl transition duration-300 overflow-hidden group border border-gray-100 relative cursor-pointer"
        >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.isSale && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                        -{(100 - (product.discountPrice! / product.price * 100)).toFixed(0)}%
                    </div>
                )}
                {currentUser && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm transition-all z-10 ${currentUser.wishlist?.includes(product.id)
                                ? 'bg-white text-red-500 shadow-md ring-1 ring-red-100'
                                : 'bg-white/90 text-gray-400 hover:text-red-500 hover:scale-110'
                            }`}
                    >
                        <Heart size={18} className={currentUser.wishlist?.includes(product.id) ? "fill-current" : ""} />
                    </button>
                )}
            </div>

            <div className="p-4">
                <h3 className="text-gray-900 font-medium text-sm line-clamp-2 h-10 mb-2 text-center" title={product.name}>
                    {product.name}
                </h3>

                <div className="flex items-end gap-2 mb-2">
                    {product.isSale ? (
                        <>
                            <span className="text-xl font-bold text-red-600">S/ {product.discountPrice?.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 line-through">S/ {product.price.toFixed(2)}</span>
                        </>
                    ) : (
                        <span className="text-xl font-bold text-gray-900">S/ {product.price.toFixed(2)}</span>
                    )}
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-500">{product.stock} vend.</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                        }}
                        className="bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-600 hover:text-white transition-colors"
                    >
                        <ShoppingCart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );

    // Pagination for Regular Products
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedBrand]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRegularProducts = regularProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(regularProducts.length / itemsPerPage);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-12 bg-[#EDF1F5] min-h-screen p-4 sm:p-6 lg:p-8 rounded-xl">


            {/* Flash Deals */}
            {salesProducts.length > 0 && (
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Ofertas Relámpago</h2>

                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {salesProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            {/* More to Love */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Más para ver</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {currentRegularProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-12">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition shadow-sm ${currentPage === page
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </section>

            {selectedProduct && (
                <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
            )}
        </div>
    );
};
