import { useStore } from '../../store/useStore';
import { X, ShoppingBag, Calendar, CreditCard } from 'lucide-react';

interface PurchaseHistoryProps {
    onClose: () => void;
}

export const PurchaseHistory = ({ onClose }: PurchaseHistoryProps) => {
    const { currentUser, sales } = useStore();

    if (!currentUser) return null;

    // Filter sales for current user
    const myPurchases = sales
        .filter(sale => sale.userId === currentUser.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingBag size={24} />
                        Mis Compras
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {myPurchases.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">Aún no has realizado ninguna compra.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myPurchases.map(sale => (
                                <div key={sale.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-gray-50 pb-4 mb-4">
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={16} />
                                                {new Date(sale.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1 capitalize">
                                                <CreditCard size={16} />
                                                {sale.paymentMethod}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-500 block">Total</span>
                                            <span className="text-lg font-bold text-red-600">S/ {sale.total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {sale.items.map((item, index) => (
                                            <div key={`${sale.id}-${index}`} className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.quantity} x S/ {(item.isSale && item.discountPrice ? item.discountPrice : item.price).toFixed(2)}</p>
                                                </div>
                                                <div className="font-semibold text-sm">
                                                    S/ {((item.isSale && item.discountPrice ? item.discountPrice : item.price) * item.quantity).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
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
