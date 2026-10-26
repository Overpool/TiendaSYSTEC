import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Minus, Plus, ArrowRight, QrCode, CreditCard, Lock, CheckCircle, ArrowLeft, Smartphone, Loader2, UserRound } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api, ApiError } from '../lib/api';
import { getPublicConfig } from '../lib/config';
import { openCulqiCheckout, getCulqiDeviceId, authenticate3DS, type CulqiMethod, type Parameters3DS } from '../lib/culqi';
import { ShippingForm } from '../components/Checkout/ShippingForm';
import { emptyShipping, validateShipping, type ShippingData } from '../lib/shipping';
import type { Sale } from '../types';

type PaymentMethod = 'card' | 'yape' | 'wallet';

// Culqi solo acepta billeteras (Yape/Plin con QR) entre S/ 6 y S/ 500
const WALLET_MIN = 6;
const WALLET_MAX = 500;
const ORDER_POLL_MS = 4000;
const ORDER_POLL_LIMIT_MS = 20 * 60 * 1000; // igual a la vigencia del QR en el Worker

const CULQI_METHOD: Record<PaymentMethod, CulqiMethod> = { card: 'tarjeta', yape: 'yape', wallet: 'billetera' };

type ChargeResponse = { status: 'review'; amountCents: number } | { status: 'paid'; sale: Sale; message: string };

export const Cart = () => {
    const { cart, updateCartQuantity, removeFromCart, clearCart, obtenerProductos, currentUser } = useStore();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
    const [shipping, setShipping] = useState<ShippingData>(() => emptyShipping((currentUser?.phone ?? '').replace(/\D/g, '').slice(-9)));
    const [manualAgency, setManualAgency] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const checkoutRef = useRef<{ close: () => void } | null>(null);

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const amountCents = Math.round(total * 100);
    const walletAvailable = total >= WALLET_MIN && total <= WALLET_MAX;
    const items = cart.map((i) => ({ id: i.id, quantity: i.quantity }));
    const email = currentUser?.email ?? '';
    // El Worker toma el nombre del DNI y el correo de la cuenta; aquí solo van el DNI, el celular y la agencia
    const shippingPayload = manualAgency
        ? { dni: shipping.dni, phone: shipping.phone, department: shipping.department, province: shipping.province, agencyName: shipping.agencyName }
        : { dni: shipping.dni, phone: shipping.phone, agencyId: shipping.agencyId };

    const finishSuccess = async (code: string) => {
        setPendingOrderId(null);
        setIsProcessing(false);
        clearCart();
        obtenerProductos(); // refresca el stock
        await Swal.fire({
            icon: 'success',
            title: '¡Pago Realizado!',
            text: `Tu pedido ha sido procesado con éxito. Código: ${code.slice(-6).toUpperCase()}`,
            confirmButtonText: 'Seguir Comprando',
            confirmButtonColor: '#dc2626'
        });
        navigate('/');
    };

    const showError = (error: unknown, fallback: string) => {
        setIsProcessing(false);
        Swal.fire('Error', error instanceof Error && error.message ? error.message : fallback, 'error');
    };

    // Tarjeta o Yape con código: cobra el token en el Worker; si el banco pide 3DS, autentica y reintenta
    const chargeToken = async (publicKey: string, tokenId: string, deviceId?: string, parameters3DS?: Parameters3DS) => {
        setIsProcessing(true);
        try {
            const res = await api.post<ChargeResponse>('/checkout/charge', { items, shipping: shippingPayload, token: tokenId, deviceId, parameters3DS });
            if (res.status === 'review') {
                const params = await authenticate3DS({ publicKey, tokenId, amountCents: res.amountCents, email });
                return chargeToken(publicKey, tokenId, deviceId, params);
            }
            await finishSuccess(res.sale.id);
        } catch (error) {
            showError(error, 'No se pudo completar el pago');
        }
    };

    const handleCheckout = async () => {
        if (!currentUser) { navigate('/login?redirect=/cart'); return; }
        const invalid = validateShipping(shipping, manualAgency);
        if (invalid) { Swal.fire('Datos incompletos', invalid, 'warning'); return; }
        if (!acceptedTerms) { Swal.fire('Falta un paso', 'Acepta los Términos y Condiciones y la Política de Cambios y Devoluciones', 'warning'); return; }
        if (paymentMethod === 'wallet' && !walletAvailable) return;

        setIsProcessing(true);
        try {
            const { culqiPublicKey } = await getPublicConfig();
            if (!culqiPublicKey) throw new Error('Los pagos en línea no están disponibles en este momento');

            if (paymentMethod === 'wallet') {
                // El Worker crea la orden con el total real; el checkout muestra el QR de Yape/Plin
                const { orderId, amountCents: orderCents } = await api.post<{ orderId: string; amountCents: number }>(
                    '/checkout/order', { items, shipping: shippingPayload });
                setPendingOrderId(orderId);
                checkoutRef.current = await openCulqiCheckout({
                    publicKey: culqiPublicKey, amountCents: orderCents, email, method: 'billetera', orderId,
                    onToken: () => { /* las billeteras no generan token */ },
                    onError: (msg) => Swal.fire('Error', msg, 'error'),
                });
                setIsProcessing(false);
                return;
            }

            const deviceId = paymentMethod === 'card' ? await getCulqiDeviceId(culqiPublicKey) : undefined;
            checkoutRef.current = await openCulqiCheckout({
                publicKey: culqiPublicKey, amountCents, email, method: CULQI_METHOD[paymentMethod],
                onToken: (tokenId) => chargeToken(culqiPublicKey, tokenId, deviceId),
                onError: (msg) => Swal.fire('Error', msg, 'error'),
            });
            setIsProcessing(false);
        } catch (error) {
            showError(error, 'No se pudo iniciar el pago');
        }
    };

    // Mientras el cliente paga con el QR, se consulta el estado de la orden (el Worker confirma con Culqi)
    useEffect(() => {
        if (!pendingOrderId) return;
        const started = Date.now();
        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            try {
                const s = await api.get<{ status: string; saleId: string | null }>(`/checkout/order/${pendingOrderId}`);
                if (stopped) return;
                if (s.status === 'paid') {
                    stopped = true;
                    checkoutRef.current?.close();
                    await finishSuccess(s.saleId ?? pendingOrderId);
                    return;
                }
                if (s.status === 'expired' || s.status === 'failed') {
                    stopped = true;
                    setPendingOrderId(null);
                    Swal.fire('Pago no completado', 'El código QR venció. Inténtalo de nuevo.', 'info');
                    return;
                }
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) { stopped = true; setPendingOrderId(null); return; }
            }
            if (Date.now() - started > ORDER_POLL_LIMIT_MS) { stopped = true; setPendingOrderId(null); return; }
            setTimeout(tick, ORDER_POLL_MS);
        };
        const first = setTimeout(tick, ORDER_POLL_MS);
        return () => { stopped = true; clearTimeout(first); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingOrderId]);

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

    const methodClass = (active: boolean, disabled = false) =>
        `w-full p-3 rounded-xl border-2 flex items-center gap-3 text-left transition ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200'
            : active ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`;
    const locked = isProcessing || !!pendingOrderId;

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
                                disabled={locked}
                                className="text-gray-400 hover:text-red-500 p-2 disabled:opacity-40"
                            >
                                <Trash2 size={20} />
                            </button>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                <button className="p-1 hover:bg-gray-200 rounded disabled:opacity-40" disabled={locked} onClick={() => updateCartQuantity(item.id, item.quantity - 1)}><Minus size={16} /></button>
                                <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                                <button className="p-1 hover:bg-gray-200 rounded disabled:opacity-40" disabled={locked} onClick={() => updateCartQuantity(item.id, item.quantity + 1)}><Plus size={16} /></button>
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
                        <p className="text-gray-400 text-sm mt-1">Procesado por Culqi</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Summary */}
                        <div className="space-y-2 pb-4 border-b border-gray-100">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                                <span>Total a Pagar</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500">Envío por Shalom: el flete se paga al recoger tu pedido en la agencia de destino.</p>
                        </div>

                        {!currentUser ? (
                            <div className="bg-gray-50 rounded-xl p-5 text-center space-y-3 border border-gray-200">
                                <UserRound size={32} className="text-gray-400 mx-auto" />
                                <p className="font-bold text-gray-800">Inicia sesión para comprar</p>
                                <p className="text-sm text-gray-500">Necesitas una cuenta para pagar y hacer seguimiento de tu envío.</p>
                                <button onClick={() => navigate('/login?redirect=/cart')}
                                    className="w-full bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition">
                                    Iniciar sesión
                                </button>
                                <button onClick={() => navigate('/login?redirect=/cart&mode=register')}
                                    className="w-full text-sm text-red-600 font-medium hover:underline">
                                    ¿No tienes cuenta? Regístrate aquí
                                </button>
                            </div>
                        ) : (
                            <>
                                <ShippingForm value={shipping} onChange={setShipping} onManualAgencyChange={setManualAgency} disabled={locked} />

                                {/* Payment Method Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Método de Pago</label>
                                    <div className="space-y-2">
                                        <button type="button" onClick={() => setPaymentMethod('card')} disabled={locked} className={methodClass(paymentMethod === 'card')}>
                                            <CreditCard size={24} className="text-blue-600 shrink-0" />
                                            <span>
                                                <span className="block font-bold text-sm text-gray-800">Tarjeta de crédito o débito</span>
                                                <span className="block text-xs text-gray-500">Visa, Mastercard, American Express, Diners</span>
                                            </span>
                                        </button>
                                        <button type="button" onClick={() => setPaymentMethod('yape')} disabled={locked} className={methodClass(paymentMethod === 'yape')}>
                                            <Smartphone size={24} className="text-purple-600 shrink-0" />
                                            <span>
                                                <span className="block font-bold text-sm text-gray-800">Yape con código de aprobación</span>
                                                <span className="block text-xs text-gray-500">Ingresa tu celular y el código de tu app Yape</span>
                                            </span>
                                        </button>
                                        <button type="button" onClick={() => walletAvailable && setPaymentMethod('wallet')} disabled={locked || !walletAvailable} className={methodClass(paymentMethod === 'wallet', !walletAvailable)}>
                                            <QrCode size={24} className="text-teal-600 shrink-0" />
                                            <span>
                                                <span className="block font-bold text-sm text-gray-800">Yape / Plin con QR</span>
                                                <span className="block text-xs text-gray-500">
                                                    {walletAvailable ? 'Escanea el código QR desde tu billetera' : `Disponible para compras entre S/ ${WALLET_MIN} y S/ ${WALLET_MAX}`}
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Payment Content */}
                                {pendingOrderId ? (
                                    <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 text-center space-y-2">
                                        <Loader2 size={24} className="animate-spin text-teal-600 mx-auto" />
                                        <p className="font-bold text-teal-900 text-sm">Esperando la confirmación de tu pago…</p>
                                        <p className="text-xs text-teal-700">Escanea el QR desde Yape o Plin. Esta página se actualizará sola cuando se confirme.</p>
                                        <button type="button" onClick={() => { checkoutRef.current?.close(); setPendingOrderId(null); }}
                                            className="text-xs text-teal-700 underline">
                                            Cancelar y elegir otro método
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                                        {paymentMethod === 'card' && 'Se abrirá el formulario seguro de Culqi para ingresar tu tarjeta. Tu banco puede pedirte una verificación adicional.'}
                                        {paymentMethod === 'yape' && 'En el formulario de Culqi ingresa tu número de celular y el código de aprobación de 6 dígitos que aparece en tu app Yape (menú → Código de aprobación).'}
                                        {paymentMethod === 'wallet' && 'Se generará un código QR válido por 20 minutos. Escanéalo desde Yape o Plin y confirma el pago en tu app.'}
                                    </p>
                                )}

                                <label className="flex items-start gap-2 text-xs text-gray-600">
                                    <input type="checkbox" className="mt-0.5" checked={acceptedTerms} disabled={locked}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)} />
                                    <span>
                                        Acepto los <Link to="/terminos" target="_blank" className="text-red-600 hover:underline">Términos y Condiciones</Link>,
                                        la <Link to="/cambios-y-devoluciones" target="_blank" className="text-red-600 hover:underline">Política de Cambios y Devoluciones</Link> y
                                        la <Link to="/privacidad" target="_blank" className="text-red-600 hover:underline">Política de Privacidad</Link>.
                                    </span>
                                </label>

                                <button
                                    onClick={handleCheckout}
                                    disabled={locked || !acceptedTerms || cart.length === 0 || (paymentMethod === 'wallet' && !walletAvailable)}
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
                                    <span>Tus datos de pago los procesa Culqi, no se guardan en esta tienda</span>
                                </div>
                                <p className="text-xs text-gray-500 text-center">El comprobante de tu compra llegará a <b>{email}</b></p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
