import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, ChevronDown, Heart, ShoppingBag, Settings } from 'lucide-react';
import { EditProfile } from './EditProfile';
import { Wishlist } from './Wishlist';
import { PurchaseHistory } from './PurchaseHistory';

export const UserMenu = () => {
    const { currentUser, logout } = useStore();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Modals
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showWishlist, setShowWishlist] = useState(false);
    const [showPurchases, setShowPurchases] = useState(false);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!currentUser) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-medium hover:text-red-600 transition group"
            >
                <div className="flex items-center gap-2">
                    <User size={20} />
                    <span className="max-w-[100px] truncate">Hola, {currentUser.name.split(' ')[0]}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                    </div>

                    <div className="py-1">
                        {(currentUser.role === 'admin' || currentUser.role === 'employee') && (
                            <Link
                                to="/admin"
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <Settings size={16} />
                                Panel Admin
                            </Link>
                        )}

                        <button
                            onClick={() => { setShowEditProfile(true); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                        >
                            <User size={16} />
                            Editar Perfil
                        </button>

                        <button
                            onClick={() => { setShowWishlist(true); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                        >
                            <Heart size={16} />
                            Lista de Deseos
                        </button>

                        <button
                            onClick={() => { setShowPurchases(true); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                        >
                            <ShoppingBag size={16} />
                            Mis Compras
                        </button>
                    </div>

                    <div className="border-t border-gray-100 py-1">
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                        >
                            <LogOut size={16} />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showEditProfile && <EditProfile onClose={() => setShowEditProfile(false)} />}
            {showWishlist && <Wishlist onClose={() => setShowWishlist(false)} />}
            {showPurchases && <PurchaseHistory onClose={() => setShowPurchases(false)} />}
        </div>
    );
};
