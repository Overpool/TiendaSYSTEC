import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const Navbar = () => {
    const {
        cart, currentUser, logout, products,
        searchQuery, setSearchQuery,
        selectedCategory, setSelectedCategory,
        selectedBrand, setSelectedBrand
    } = useStore();
    const navigate = useNavigate();

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

                        <div className="hidden md:flex relative group gap-2 flex-1 max-w-2xl">
                            <div className="flex bg-white rounded-full border-2 border-red-600 overflow-hidden w-full">
                                <select
                                    className="px-2 lg:px-4 py-2 bg-gray-50 border-r focus:outline-none text-xs lg:text-sm text-gray-700 max-w-[100px] lg:max-w-[120px]"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="">Categorías</option>
                                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    className="px-2 lg:px-4 py-2 bg-gray-50 border-r focus:outline-none text-xs lg:text-sm text-gray-700 max-w-[100px] lg:max-w-[120px] hidden lg:block"
                                    value={selectedBrand}
                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                >
                                    <option value="">Marcas</option>
                                    {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Estoy buscando..."
                                    className="flex-1 px-4 py-2 focus:outline-none min-w-[50px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button className="bg-red-600 text-white px-4 lg:px-6 py-2 hover:bg-red-700 transition">
                                    <Search size={20} />
                                </button>
                            </div>
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
                            <div className="flex items-center gap-4">
                                <Link to={currentUser.role === 'admin' || currentUser.role === 'employee' ? "/admin" : "/"} className="text-sm font-medium hover:text-red-600">
                                    <div className="flex items-center gap-2">
                                        <User size={18} />
                                        <span>Hola, {currentUser.name.split(' ')[0]}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 block text-right capitalize">{currentUser.role === 'employee' ? 'Empleado' : currentUser.role === 'admin' ? 'Admin' : 'Mi Cuenta'}</span>
                                </Link>
                                <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600">
                                    <LogOut size={18} />
                                </button>
                            </div>
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
            </div>
        </nav>
    );
};
