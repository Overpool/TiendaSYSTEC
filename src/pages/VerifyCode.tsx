import { useState, type FormEvent, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

export const VerifyCode = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Step 1: Verify OTP
            const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });

            if (verifyError) throw verifyError;
            if (!session) throw new Error("No session created");

            // Step 2: Update Password in Supabase Auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            // Step 3: Sync password to public.users table (so manual login works)
            // Note: In a production app, you wouldn't store plain text passwords in public.users.
            // This is maintained for compatibility with the current simplified login logic.
            const { error: dbError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('email', email);

            if (dbError) console.error("Error syncing password to DB:", dbError);

            Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión.',
                confirmButtonColor: '#DC2626',
            }).then(() => {
                navigate('/login');
            });

        } catch (error: any) {
            console.error('Error verifying/updating:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'El código es inválido o ha expirado.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Verificar y Cambiar</h1>
                    <p className="text-gray-500 text-sm">
                        Ingresa el código que recibiste y tu nueva contraseña.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                                placeholder="usuario@ejemplo.com"
                                required
                                readOnly={!!searchParams.get('email')}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código de Verificación (OTP)</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition tracking-widest font-mono text-center text-lg"
                                placeholder="123456"
                                maxLength={6}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                placeholder="••••••••"
                                required
                                minLength={6}
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verificar y Cambiar'}
                    </button>
                </form>
            </div>
        </div>
    );
};
