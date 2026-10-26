import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Lock, User, Eye, EyeOff, Mail, ArrowLeft, X, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';
import { Turnstile } from '../components/Turnstile';

type AuthMode = 'login' | 'register' | 'recover';
type RecoverStep = 1 | 2 | 3; // 1: correo, 2: código, 3: nueva contraseña

export const Login = () => {
    // ?redirect=/cart vuelve al carrito tras iniciar sesión; ?mode=register abre el registro
    const [searchParams] = useSearchParams();
    const rawRedirect = searchParams.get('redirect');
    const redirectTo = rawRedirect?.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : null; // solo rutas internas
    const [authMode, setAuthMode] = useState<AuthMode>(searchParams.get('mode') === 'register' ? 'register' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Recovery State
    const [recoverStep, setRecoverStep] = useState<RecoverStep>(1);
    const [code, setCode] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Turnstile: cada token sirve una vez; turnstileKey fuerza un widget nuevo tras cada envío
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const { login, register, requestPasswordReset, verifyResetCode, resetPassword } = useStore();
    const navigate = useNavigate();

    const turnstileAction =
        authMode === 'login' ? 'login'
            : authMode === 'register' ? 'register'
                : recoverStep === 1 ? 'forgot'
                    : recoverStep === 2 ? 'verify'
                        : null; // el paso 3 usa el permiso del paso 2, no necesita Turnstile

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setRecoverStep(1);
        setCode('');
        setResetToken('');
    };

    const handleModeSwitch = (mode: AuthMode) => {
        setAuthMode(mode);
        resetForm();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (turnstileAction && !turnstileToken) {
            Swal.fire('Verificación pendiente', 'Completa la verificación de seguridad.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await submit(turnstileToken ?? '');
        } finally {
            setIsSubmitting(false);
            if (turnstileAction) setTurnstileKey((k) => k + 1);
        }
    };

    const submit = async (token: string) => {

        if (authMode === 'login') {
            try {
                const success = await login(email, password, token);
                if (success) {
                    const currentUser = useStore.getState().currentUser;
                    Swal.fire({
                        icon: 'success',
                        title: `¡Bienvenido!`,
                        text: `Has iniciado sesión correctamente.`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                    navigate(redirectTo ?? (currentUser?.role === 'shopper' ? '/' : '/admin'));
                } else {
                    Swal.fire('Error', 'Credenciales inválidas', 'error');
                }
            } catch (error: any) {
                console.error("Login failed", error);
                Swal.fire('Error', error?.message || 'Hubo un problema al iniciar sesión', 'error');
            }
        } else if (authMode === 'register') {
            // Register
            try {
                await register({ name, email, password }, token);
            } catch (error: any) {
                Swal.fire('Error', error?.message || 'No se pudo crear la cuenta', 'error');
                return;
            }
            Swal.fire({
                icon: 'success',
                title: '¡Cuenta creada!',
                text: 'Ahora puedes iniciar sesión.',
                timer: 1500,
                showConfirmButton: false
            });
            handleModeSwitch('login');
        } else if (authMode === 'recover') {
            // Recuperación: 1) enviar código al correo, 2) validar código, 3) guardar nueva contraseña
            try {
                if (recoverStep === 1) {
                    await requestPasswordReset(email.trim(), token);
                    setRecoverStep(2);
                    Swal.fire({
                        icon: 'info',
                        title: 'Revisa tu correo',
                        text: `Enviamos un código de 6 dígitos a ${email.trim()}. Vence en 15 minutos.`,
                    });
                } else if (recoverStep === 2) {
                    setResetToken(await verifyResetCode(email.trim(), code, token));
                    setRecoverStep(3);
                } else {
                    if (password !== confirmPassword) {
                        Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
                        return;
                    }
                    await resetPassword(resetToken, password);
                    Swal.fire({
                        icon: 'success',
                        title: 'Contraseña Actualizada',
                        text: 'Ahora puedes iniciar sesión con tu nueva contraseña.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    handleModeSwitch('login');
                }
            } catch (error: any) {
                Swal.fire('Error', error?.message || 'No se pudo completar la recuperación', 'error');
            }
        }
    };

    const showEmail = authMode !== 'recover' || recoverStep === 1;
    const showPasswordField = authMode !== 'recover' || recoverStep === 3;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transition-all duration-300 relative">
                {/* X button - close without account */}
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1.5 transition-all"
                    title="Acceder sin cuenta"
                >
                    <X size={20} />
                </button>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-red-600 mb-2">SYSTEC FDC</h1>
                    <p className="text-gray-500">
                        {authMode === 'login' && 'Ingresa a tu cuenta'}
                        {authMode === 'register' && 'Crea una nueva cuenta'}
                        {authMode === 'recover' && recoverStep === 1 && 'Recuperar Contraseña'}
                        {authMode === 'recover' && recoverStep === 2 && `Ingresa el código enviado a ${email.trim()}`}
                        {authMode === 'recover' && recoverStep === 3 && 'Crea tu nueva contraseña'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {authMode === 'register' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    placeholder="Juan Pérez"
                                    required={authMode === 'register'}
                                />
                            </div>
                        </div>
                    )}

                    {showEmail && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    placeholder="usuario@ejemplo.com"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {authMode === 'recover' && recoverStep === 2 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código de verificación</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition tracking-widest font-mono text-center text-lg"
                                    placeholder="123456"
                                    maxLength={6}
                                    pattern="\d{6}"
                                    title="El código tiene 6 dígitos"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {showPasswordField && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {authMode === 'recover' ? 'Nueva Contraseña' : 'Contraseña'}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    placeholder="••••••••"
                                    required
                                    minLength={authMode === 'login' ? undefined : 6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {authMode === 'recover' && recoverStep === 3 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    )}

                    {turnstileAction && (
                        <Turnstile key={`${turnstileAction}-${turnstileKey}`} action={turnstileAction} onToken={setTurnstileToken} />
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || (!!turnstileAction && !turnstileToken)}
                        className="disabled:opacity-70 w-full bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {authMode === 'login' && 'Ingresar'}
                        {authMode === 'register' && 'Registrarse'}
                        {authMode === 'recover' && recoverStep === 1 && 'Enviar código'}
                        {authMode === 'recover' && recoverStep === 2 && 'Verificar código'}
                        {authMode === 'recover' && recoverStep === 3 && 'Actualizar Contraseña'}
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-3 text-center">
                    {authMode === 'login' && (
                        <>
                            <button
                                onClick={() => handleModeSwitch('register')}
                                className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                            >
                                ¿No tienes cuenta? Regístrate aquí
                            </button>
                            <button
                                onClick={() => handleModeSwitch('recover')}
                                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                            <div className="border-t border-gray-100 pt-3 mt-1">
                                <button
                                    onClick={() => navigate('/')}
                                    className="text-sm text-gray-400 hover:text-gray-600 hover:underline transition-colors"
                                >
                                    Acceder sin cuenta →
                                </button>
                            </div>
                        </>
                    )}

                    {authMode === 'register' && (
                        <button
                            onClick={() => handleModeSwitch('login')}
                            className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                        >
                            ¿Ya tienes cuenta? Inicia sesión
                        </button>
                    )}

                    {authMode === 'recover' && recoverStep === 2 && (
                        <button
                            onClick={() => { setRecoverStep(1); setCode(''); }}
                            className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                        >
                            ¿No te llegó? Solicitar otro código
                        </button>
                    )}

                    {authMode === 'recover' && (
                        <button
                            onClick={() => handleModeSwitch('login')}
                            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:underline"
                        >
                            <ArrowLeft size={16} /> Volver al inicio
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
