import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export const SalesHistory = () => {
    const { sales } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredSales = sales.filter(sale => {
        const matchesSearch =
            sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sale.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

        let matchesDate = true;
        const saleDate = new Date(sale.date);

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && saleDate >= start;
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && saleDate <= end;
        }

        return matchesSearch && matchesDate;
    });

    const exportToExcel = () => {
        const data = filteredSales.map(sale => ({
            'ID Transacción': sale.id,
            'Fecha': new Date(sale.date).toLocaleString(),
            'Pago': sale.paymentMethod === 'card' ? 'TARJETA' : 'EFECTIVO',
            'Items': sale.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
            'Monto Total': sale.total
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
        XLSX.writeFile(wb, "Reporte_Ventas.xlsx");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Historial de Ventas</h2>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="date"
                                className="pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <span className="text-slate-400">-</span>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="date"
                                className="pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por producto o ID..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <Download size={20} />
                        Exportar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Fecha</th>
                                <th className="px-6 py-3 font-semibold">ID Transacción</th>
                                <th className="px-6 py-3 font-semibold">Pago</th>
                                <th className="px-6 py-3 font-semibold">Items</th>
                                <th className="px-6 py-3 font-semibold text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(sale.date).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-500">#{sale.id}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${sale.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {sale.paymentMethod === 'card' ? 'TARJETA' : 'EFECTIVO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-right text-slate-800">
                                        S/ {sale.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No se encontraron ventas con los filtros seleccionados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
