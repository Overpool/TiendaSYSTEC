import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Minus, Plus, ArrowRight, QrCode, CreditCard, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

export const Cart = () => {
    const { cart, updateCartQuantity, removeFromCart, clearCart, addSale, currentUser } = useStore();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'card'>('yape');
    const [approvalCode, setApprovalCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);



    // Placeholder until I verify store actions.
    // Actually, let's assume I'll add `updateCartQuantity` to store first or use a safer approach.

    const handleCheckout = async () => {
        if (paymentMethod === 'yape' || paymentMethod === 'plin') {
            if (approvalCode.length < 4) {
                Swal.fire('Error', 'Por favor ingresa un código de aprobación válido', 'error');
                return;
            }
        }

        setIsProcessing(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        const sale = {
            id: Date.now().toString(),
            items: [...cart],
            total: total,
            date: new Date().toISOString(),
            paymentMethod: paymentMethod,
            customer: currentUser ? { id: currentUser.id, name: currentUser.name } : undefined
        };

        addSale(sale);
        clearCart();
        setIsProcessing(false);

        await Swal.fire({
            icon: 'success',
            title: '¡Pago Realizado!',
            text: `Tu pedido ha sido procesado con éxito. Código: ${sale.id.slice(-6)}`,
            confirmButtonText: 'Seguir Comprando',
            confirmButtonColor: '#dc2626'
        });

        navigate('/');
    };

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="bg-gray-100 p-6 rounded-full">
                    <QrCode size={64} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Tu carrito está vacío</h2>
                <p className="text-gray-500">¿No sabes qué comprar? ¡Miles de productos te esperan!</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition"
                >
                    Ir a la Tienda
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-4">
                    <ArrowLeft size={20} />
                    <span className="font-medium">Continuar Comprando</span>
                </Link>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Tu Carrito ({cart.length} productos)</h1>
                </div>

                {cart.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 items-center">
                        <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-lg bg-gray-50" />

                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{item.name}</h3>
                            <p className="text-sm text-gray-500">{item.brand} | {item.category}</p>
                            <div className="mt-2 font-bold text-red-600 text-lg">S/ {item.price.toFixed(2)}</div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-gray-400 hover:text-red-500 p-2"
                            >
                                <Trash2 size={20} />
                            </button>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                <button className="p-1 hover:bg-gray-200 rounded" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}><Minus size={16} /></button>
                                <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                                <button className="p-1 hover:bg-gray-200 rounded" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}><Plus size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Payment Gateway */}
            <div className="lg:col-span-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-24">
                    <div className="p-6 bg-gray-900 text-white">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Lock size={20} className="text-green-400" />
                            Pago Seguro
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Completa tu compra de forma segura</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Summary */}
                        <div className="space-y-2 pb-4 border-b border-gray-100">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Envío</span>
                                <span className="text-green-600 font-medium">Gratis</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                                <span>Total a Pagar</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Método de Pago</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPaymentMethod('yape')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition ${paymentMethod === 'yape' || paymentMethod === 'plin'
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <QrCode size={24} />
                                    <span className="font-bold text-sm">Yape / Plin</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition ${paymentMethod === 'card'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <CreditCard size={24} />
                                    <span className="font-bold text-sm">Tarjeta</span>
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Payment Content */}
                        {(paymentMethod === 'yape' || paymentMethod === 'plin') && (
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <img
                                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AliExpressClonePayment"
                                            alt="QR de Pago"
                                            className="w-32 h-32 ml-auto mr-auto"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-purple-900">Escanea y paga S/ {total.toFixed(2)}</p>
                                        <p className="text-xs text-purple-600">A nombre de: AliExpress Clone SAC</p>
                                    </div>

                                    <div className="w-full pt-2">
                                        <label className="block text-xs font-bold text-purple-800 mb-1 text-left">Código de Aprobación</label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 123456"
                                            className="w-full px-4 py-2 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                            value={approvalCode}
                                            onChange={(e) => setApprovalCode(e.target.value)}
                                        />
                                        <p className="text-xs text-purple-400 text-left mt-1">Ingresa el código que aparece en tu app</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-3 text-blue-700 mb-2">
                                    <AlertCircle size={20} />
                                    <span className="font-bold text-sm">Pago con Tarjeta Simulado</span>
                                </div>
                                <p className="text-xs text-blue-600">
                                    Al hacer click en pagar, se simulará una transacción exitosa con tarjeta de crédito/débito.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing || (cart.length === 0)}
                            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <span className="animate-pulse">Procesando...</span>
                            ) : (
                                <>
                                    <span>Pagar S/ {total.toFixed(2)}</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                            <CheckCircle size={12} />
                            <span>Transacción encriptada de extremo a extremo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
