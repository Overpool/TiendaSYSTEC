import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Calendar, DollarSign, ShoppingBag, TrendingUp, Package } from 'lucide-react';

export const Reports = () => {
    const { sales, products } = useStore();

    // Default to first day of current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const currentDay = today.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(currentDay);

    // Filter Sales
    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const saleDate = sale.date.split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        });
    }, [sales, startDate, endDate]);

    // KPI Metrics
    const totalRevenue = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalOrders = filteredSales.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate Profit (Revenue - Cost)
    // NOTE: This assumes products still exist in store to get cost. 
    // In a real app, historical cost should be stored in sale items.
    // We will approximation using current product cost for now as per available data.
    const totalCost = filteredSales.reduce((acc, sale) => {
        const saleCost = sale.items.reduce((itemAcc, item) => {
            // Find current product to get cost
            const product = products.find(p => p.id === item.id);
            const cost = product ? product.cost : 0;
            return itemAcc + (cost * item.quantity);
        }, 0);
        return acc + saleCost;
    }, 0);

    const totalProfit = totalRevenue - totalCost;

    // Chart Data Preparation

    // 1. Daily Revenue Trend
    const dailyRevenueData = useMemo(() => {
        const map = new Map<string, number>();
        // Initialize days
        let loopDate = new Date(startDate);
        const end = new Date(endDate);
        while (loopDate <= end) {
            map.set(loopDate.toISOString().split('T')[0], 0);
            loopDate.setDate(loopDate.getDate() + 1);
        }

        filteredSales.forEach(sale => {
            const date = sale.date.split('T')[0];
            if (map.has(date)) {
                map.set(date, (map.get(date) || 0) + sale.total);
            }
        });

        return Array.from(map.entries()).map(([date, amount]) => ({
            date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            amount
        }));
    }, [filteredSales, startDate, endDate]);

    // 2. Payment Methods
    const paymentMethodsData = useMemo(() => {
        const map = new Map<string, number>();
        filteredSales.forEach(sale => {
            const method = sale.paymentMethod === 'card' ? 'Tarjeta' :
                sale.paymentMethod === 'cash' ? 'Efectivo' :
                    (sale.paymentMethod === 'yape' || sale.paymentMethod === 'plin') ? 'Yape/Plin' : 'Otros';
            map.set(method, (map.get(method) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredSales]);

    // 3. Top Products
    const topProductsData = useMemo(() => {
        const map = new Map<string, number>();
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                map.set(item.name, (map.get(item.name) || 0) + item.quantity);
            });
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));
    }, [filteredSales]);

    // 4. Inventory Status (Current State, not filtered by date)
    const inventoryStatusData = useMemo(() => {
        let lowStock = 0;
        let outOfStock = 0;
        let goodStock = 0;

        products.forEach(p => {
            if (p.stock === 0) outOfStock++;
            else if (p.stock < 10) lowStock++;
            else goodStock++;
        });

        return [
            { name: 'Sin Stock', value: outOfStock, color: '#EF4444' },
            { name: 'Stock Bajo', value: lowStock, color: '#F59E0B' },
            { name: 'Stock Ok', value: goodStock, color: '#10B981' },
        ].filter(i => i.value > 0);
    }, [products]);


    const PIE_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h1 className="text-2xl font-bold text-slate-800">Reportes & Estadísticas</h1>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-500">Desde:</span>
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-700 w-32 sm:w-auto"
                        />
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-slate-500" />
                            <span className="text-xs font-bold text-slate-500">Hasta:</span>
                        </div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-700 w-32 sm:w-auto"
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Ingresos Totales" value={`S/ ${totalRevenue.toFixed(2)}`} icon={<DollarSign className="text-green-600" />} color="bg-green-50" />
                <KpiCard title="Ganancia Est." value={`S/ ${totalProfit.toFixed(2)}`} icon={<TrendingUp className="text-blue-600" />} color="bg-blue-50" />
                <KpiCard title="Total Pedidos" value={totalOrders} icon={<ShoppingBag className="text-purple-600" />} color="bg-purple-50" />
                <KpiCard title="Ticket Promedio" value={`S/ ${averageOrderValue.toFixed(2)}`} icon={<Package className="text-orange-600" />} color="bg-orange-50" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Tendencia de Ingresos</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyRevenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `S/ ${val}`} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Ingresos']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Productos Más Vendidos (Top 5)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProductsData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="quantity" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Métodos de Pago Utilizados</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentMethodsData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentMethodsData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Inventory Health */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Estado del Inventario Actual</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={inventoryStatusData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {inventoryStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
        <div>
            <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-4 rounded-full ${color}`}>
            {icon}
        </div>
    </div>
);
