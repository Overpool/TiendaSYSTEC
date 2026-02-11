import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ShoppingCart, Search, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UserMenu } from '../User/UserMenu';

export const Navbar = () => {
    const {
        cart, currentUser, products,
        searchQuery, setSearchQuery,
        selectedCategory, setSelectedCategory,
        selectedBrand, setSelectedBrand
    } = useStore();
    const [activeFilter, setActiveFilter] = useState<null | 'category' | 'brand' | 'mobile-category' | 'mobile-brand'>(null);

    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-4 lg:gap-8 flex-1">
                        <Link to="/" className="flex items-center gap-2 lg:gap-3 decoration-none min-w-max">
                            <img src="/images/systec_logo.png" alt="SYSTEC Logo" className="h-10 lg:h-12 w-auto object-contain" />
                            <div className="flex flex-col leading-none hidden lg:flex">
                                <span className="font-bold text-xl tracking-wide text-[#8b0000]">SYSTEC</span>
                                <span className="font-bold text-xl tracking-wide text-black">FDC</span>
                            </div>
                            <div className="flex flex-col leading-none lg:hidden">
                                <span className="font-bold text-lg tracking-wide text-[#8b0000]">SYSTEC</span>
                            </div>
                        </Link>

                        <div className="hidden md:flex relative group gap-0 flex-1 max-w-2xl bg-white rounded-full border-2 border-red-600">
                            {/* Desktop Category Dropdown */}
                            <div className="relative border-r border-gray-200">
                                <button
                                    onClick={() => setActiveFilter(activeFilter === 'category' ? null : 'category')}
                                    className="h-full px-4 flex items-center gap-2 hover:bg-gray-50 rounded-l-full transition-colors"
                                >
                                    <span className="text-sm font-bold text-black whitespace-nowrap">{selectedCategory || 'Categorías'}</span>
                                    {activeFilter === 'category' ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                </button>

                                {activeFilter === 'category' && (
                                    <div className="absolute top-full left-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="bg-red-600 px-4 py-2">
                                            <span className="text-xs font-bold text-white tracking-wider uppercase">Seleccionar Categoría</span>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            <button
                                                onClick={() => { setSelectedCategory(''); setActiveFilter(null); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${!selectedCategory ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                            >
                                                TODAS LAS CATEGORÍAS
                                            </button>
                                            {uniqueCategories.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => { setSelectedCategory(c); setActiveFilter(null); }}
                                                    className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${selectedCategory === c ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Brand Dropdown */}
                            <div className="relative border-r border-gray-200 hidden lg:block">
                                <button
                                    onClick={() => setActiveFilter(activeFilter === 'brand' ? null : 'brand')}
                                    className="h-full px-4 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-sm font-bold text-black whitespace-nowrap">{selectedBrand || 'Marcas'}</span>
                                    {activeFilter === 'brand' ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                </button>

                                {activeFilter === 'brand' && (
                                    <div className="absolute top-full left-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="bg-red-600 px-4 py-2">
                                            <span className="text-xs font-bold text-white tracking-wider uppercase">Seleccionar Marca</span>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            <button
                                                onClick={() => { setSelectedBrand(''); setActiveFilter(null); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${!selectedBrand ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                            >
                                                TODAS LAS MARCAS
                                            </button>
                                            {uniqueBrands.map(b => (
                                                <button
                                                    key={b}
                                                    onClick={() => { setSelectedBrand(b); setActiveFilter(null); }}
                                                    className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${selectedBrand === b ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Estoy buscando..."
                                className="flex-1 px-4 py-2 focus:outline-none min-w-[50px] bg-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="bg-red-600 text-white px-4 lg:px-6 py-2 hover:bg-red-700 transition rounded-r-full">
                                <Search size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link to="/cart" className="relative text-gray-700 hover:text-red-600 transition">
                            <ShoppingCart size={28} />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                            <span className="hidden sm:inline-block ml-1 text-sm font-medium">Cesta</span>
                        </Link>

                        {currentUser ? (
                            <UserMenu />
                        ) : (
                            <Link to="/login" className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition">
                                <User size={28} />
                                <div className="flex flex-col text-xs leading-none">
                                    <span>Bienvenido</span>
                                    <span className="font-bold">Identifícate</span>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
                {/* Mobile Search & Filters */}
                <div className="md:hidden px-4 pb-4 space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-4 pr-10 py-2 border rounded-full focus:outline-none focus:border-red-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="absolute right-0 top-0 bottom-0 bg-red-600 text-white px-4 rounded-r-full font-bold text-xs tracking-wider">
                            BUSCAR
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {/* Category Dropdown */}
                        <div className="relative w-1/2">
                            <button
                                onClick={() => setActiveFilter(activeFilter === 'mobile-category' ? null : 'mobile-category')}
                                className={`w-full px-4 py-2 bg-white border rounded-lg flex justify-between items-center text-sm font-bold tracking-wide transition-all ${activeFilter === 'mobile-category'
                                    ? 'border-red-600 text-red-600 shadow-md ring-1 ring-red-100'
                                    : 'border-slate-200 text-slate-700'
                                    }`}
                            >
                                <span className="truncate">{selectedCategory || 'CATEGORÍAS'}</span>
                                {activeFilter === 'mobile-category' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {/* Dropdown Menu */}
                            {activeFilter === 'mobile-category' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="bg-red-600 px-4 py-2">
                                        <span className="text-xs font-bold text-white tracking-wider uppercase">Seleccionar Categoría</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <button
                                            onClick={() => { setSelectedCategory(''); setActiveFilter(null); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${!selectedCategory ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                        >
                                            TODAS LAS CATEGORÍAS
                                        </button>
                                        {uniqueCategories.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => { setSelectedCategory(c); setActiveFilter(null); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${selectedCategory === c ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Brand Dropdown */}
                        <div className="relative w-1/2">
                            <button
                                onClick={() => setActiveFilter(activeFilter === 'mobile-brand' ? null : 'mobile-brand')}
                                className={`w-full px-4 py-2 bg-white border rounded-lg flex justify-between items-center text-sm font-bold tracking-wide transition-all ${activeFilter === 'mobile-brand'
                                    ? 'border-red-600 text-red-600 shadow-md ring-1 ring-red-100'
                                    : 'border-slate-200 text-slate-700'
                                    }`}
                            >
                                <span className="truncate">{selectedBrand || 'MARCAS'}</span>
                                {activeFilter === 'mobile-brand' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {/* Dropdown Menu */}
                            {activeFilter === 'mobile-brand' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="bg-red-600 px-4 py-2">
                                        <span className="text-xs font-bold text-white tracking-wider uppercase">Seleccionar Marca</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <button
                                            onClick={() => { setSelectedBrand(''); setActiveFilter(null); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${!selectedBrand ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                        >
                                            TODAS LAS MARCAS
                                        </button>
                                        {uniqueBrands.map(b => (
                                            <button
                                                key={b}
                                                onClick={() => { setSelectedBrand(b); setActiveFilter(null); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 hover:bg-red-50 transition-colors ${selectedBrand === b ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}
                                            >
                                                {b}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                </div>
            </div>

            {/* Location Bar */}
            <div className="bg-black text-white text-xs py-1.5 px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center px-4">
                    <div className="flex items-center gap-2 py-1.5 animate-marquee sm:animate-none whitespace-nowrap">
                        <span className="text-red-600">📍</span>
                        <span className="font-bold">Ubicación:</span>
                        <span>Av. Universitario</span>
                    </div>
                    <div className="hidden sm:flex items-center">
                        <div className="bg-red-600 text-white px-6 py-1.5 skew-x-[-15deg] flex items-center justify-center shadow-lg relative top-[1px]">
                            <div className="skew-x-[15deg] flex items-center gap-2 text-sm font-bold tracking-wider">
                                <span>🏢</span>
                                <span>Sucursal:</span>
                                <span>AYACUCHO</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backdrop to close filters - Global */}
            {
                activeFilter && (
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setActiveFilter(null)}
                    />
                )
            }
        </nav >
    );
};
