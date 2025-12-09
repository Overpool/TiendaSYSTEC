
import { useStore } from '../../store/useStore';
import { DollarSign, ShoppingBag, Package, TrendingUp } from 'lucide-react';

export const Dashboard = () => {
    const { products, sales } = useStore();

    const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
    const totalOrders = sales.length;
    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);

    // Calculate profit (Mock cost calculation)
    const totalCost = sales.reduce((acc, sale) => {
        return acc + sale.items.reduce((s_acc, item) => s_acc + (item.cost * item.quantity), 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
            <div className={`p-4 rounded-full ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800">Resumen del Panel</h2>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800">{useStore.getState().currentUser?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{useStore.getState().currentUser?.role}</p>
                    </div>
                    <div className="bg-red-100 p-2 rounded-full">
                        <span className="text-red-600 font-bold text-lg">
                            {useStore.getState().currentUser?.name.charAt(0)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ingresos Totales"
                    value={`S/ ${totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <StatCard
                    title="Pedidos Totales"
                    value={totalOrders}
                    icon={ShoppingBag}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Ganancia Total"
                    value={`S/ ${totalProfit.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Items en Inventario"
                    value={totalStock}
                    icon={Package}
                    color="bg-orange-500"
                />
            </div>

            {/* Recent Sales Table Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Transacciones Recientes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">ID</th>
                                <th className="px-6 py-3 font-semibold">Fecha</th>
                                <th className="px-6 py-3 font-semibold">Items</th>
                                <th className="px-6 py-3 font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sales.slice(0, 5).map((sale) => (
                                <tr key={sale.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600">#{sale.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(sale.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{sale.items.length} items</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800">S/ {sale.total.toFixed(2)}</td>
                                </tr>
                            ))}
                            {sales.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Aún no hay ventas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
