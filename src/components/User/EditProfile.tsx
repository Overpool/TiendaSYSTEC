import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { X, User, Lock, Save, MapPin, Phone, CreditCard, Building } from 'lucide-react';
import Swal from 'sweetalert2';

interface EditProfileProps {
    onClose: () => void;
}

const InputField = ({ label, name, type = "text", icon: Icon, placeholder, required = false, value, onChange }: any) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</label>
        <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
                placeholder={placeholder}
                required={required}
            />
        </div>
    </div>
);

export const EditProfile = ({ onClose }: EditProfileProps) => {
    const { currentUser, updateUser } = useStore();

    // State for all fields
    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        password: currentUser?.password || '',
        dni: currentUser?.dni || '',
        phone: currentUser?.phone || '',
        address: currentUser?.address || '',
        city: currentUser?.city || '',
        zipCode: currentUser?.zipCode || '',
        country: currentUser?.country || ''
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsLoading(true);
        try {
            await updateUser(currentUser.id, formData);

            Swal.fire({
                icon: 'success',
                title: 'Perfil actualizado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error al actualizar',
                text: 'Inténtalo de nuevo más tarde'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 shrink-0 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User size={24} />
                        Editar Perfil
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-white/10 p-1 rounded-full hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    {/* Account Info */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <User className="text-red-600" size={20} />
                            Información de la Cuenta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Nombre Completo" name="name" icon={User} placeholder="Tu nombre" required value={formData.name} onChange={handleChange} />
                            <InputField label="Contraseña" name="password" type="text" icon={Lock} placeholder="Nueva contraseña" required value={formData.password} onChange={handleChange} />
                        </div>
                    </section>

                    {/* Personal Info */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <CreditCard className="text-red-600" size={20} />
                            Información Personal (Opcional)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="DNI / Documento" name="dni" icon={CreditCard} placeholder="Tu número de documento" value={formData.dni} onChange={handleChange} />
                            <InputField label="Teléfono / Celular" name="phone" icon={Phone} placeholder="+51 999 999 999" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                            <InputField label="Dirección / Calle" name="address" icon={MapPin} placeholder="Av. Principal 123" value={formData.address} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Ciudad" name="city" icon={Building} placeholder="Lima" value={formData.city} onChange={handleChange} />
                            <InputField label="Código Postal" name="zipCode" icon={MapPin} placeholder="15001" value={formData.zipCode} onChange={handleChange} />
                            <InputField label="País" name="country" icon={Building} placeholder="Perú" value={formData.country} onChange={handleChange} />
                        </div>
                    </section>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-red-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-600/20 disabled:opacity-70 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
