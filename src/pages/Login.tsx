import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Lock, User, Eye, EyeOff, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';

type AuthMode = 'login' | 'register' | 'recover';

export const Login = () => {
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Recovery State
    const [recoverStep, setRecoverStep] = useState<1 | 2>(1); // 1: Email, 2: New Password
    const [foundUserId, setFoundUserId] = useState<string | null>(null);

    const { login, register, users, updateUser, loadInitialData } = useStore();
    const navigate = useNavigate();

    useEffect(() => {
        loadInitialData(); // Ensure users are loaded for recovery check
    }, []);

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setRecoverStep(1);
        setFoundUserId(null);
    };

    const handleModeSwitch = (mode: AuthMode) => {
        setAuthMode(mode);
        resetForm();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (authMode === 'login') {
            try {
                const success = await login(email, password);
                if (success) {
                    const currentUser = useStore.getState().currentUser;
                    Swal.fire({
                        icon: 'success',
                        title: `¡Bienvenido!`,
                        text: `Has iniciado sesión correctamente.`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                    navigate(currentUser?.role === 'shopper' ? '/' : '/admin');
                } else {
                    Swal.fire('Error', 'Credenciales inválidas', 'error');
                }
            } catch (error) {
                console.error("Login failed", error);
                Swal.fire('Error', 'Hubo un problema al iniciar sesión', 'error');
            }
        } else if (authMode === 'register') {
            // Register
            register({ name, email, password });
            Swal.fire({
                icon: 'success',
                title: '¡Cuenta creada!',
                text: 'Ahora puedes iniciar sesión.',
                timer: 1500,
                showConfirmButton: false
            });
            handleModeSwitch('login');
        } else if (authMode === 'recover') {
            // Recover Logic
            if (recoverStep === 1) {
                // Verify Email
                const user = users.find(u => u.email === email);
                if (user) {
                    setFoundUserId(user.id);
                    setRecoverStep(2);
                    Swal.fire({
                        icon: 'success',
                        title: 'Usuario encontrado',
                        text: 'Ingresa tu nueva contraseña',
                        timer: 1000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Error', 'No existe una cuenta con este correo', 'error');
                }
            } else {
                // Update Password
                if (foundUserId) {
                    await updateUser(foundUserId, { password: password });
                    Swal.fire({
                        icon: 'success',
                        title: 'Contraseña Actualizada',
                        text: 'Ahora puedes iniciar sesión con tu nueva contraseña.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    handleModeSwitch('login');
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md transition-all duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-red-600 mb-2">SYSTEC FDC</h1>
                    <p className="text-gray-500">
                        {authMode === 'login' && 'Ingresa a tu cuenta'}
                        {authMode === 'register' && 'Crea una nueva cuenta'}
                        {authMode === 'recover' && 'Recuperar Contraseña'}
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

                    {(authMode !== 'recover' || recoverStep === 1) && (
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
                                    disabled={authMode === 'recover' && recoverStep === 2}
                                />
                            </div>
                        </div>
                    )}

                    {(authMode !== 'recover' || recoverStep === 2) && (
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

                    <button
                        type="submit"
                        className="w-full bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {authMode === 'login' && 'Ingresar'}
                        {authMode === 'register' && 'Registrarse'}
                        {authMode === 'recover' && (recoverStep === 1 ? 'Buscar Cuenta' : 'Actualizar Contraseña')}
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
