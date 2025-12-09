
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, History, LogOut, Users, TrendingUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import clsx from 'clsx';

import { X } from 'lucide-react';

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
    const { logout, currentUser } = useStore();

    const allNavItems = [
        { to: '/admin', icon: LayoutDashboard, label: 'Panel Principal', permission: 'admin', end: true },
        { to: '/admin/inventory', icon: Package, label: 'Inventario', permission: 'inventory' },
        { to: '/admin/pos', icon: ShoppingCart, label: 'Punto de Venta', permission: 'pos' },
        { to: '/admin/sales', icon: History, label: 'Historial Ventas', permission: 'sales' },
        { to: '/admin/reports', icon: TrendingUp, label: 'Reportes', permission: 'admin' },
        { to: '/admin/users', icon: Users, label: 'Usuarios', permission: 'users' },
    ];

    const navItems = allNavItems.filter(item => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        // Panel Principal is always available for employees
        if (item.to === '/admin' && item.end) return true;
        return currentUser.permissions?.includes(item.permission);
    });

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={clsx(
                "w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                        AdminPanel
                    </h1>
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => window.innerWidth < 768 && onClose()}
                            className={({ isActive }) =>
                                clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                    isActive
                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )
                            }
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </>
    );
};
