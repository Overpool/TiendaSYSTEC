import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { User as UserIcon, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import type { User as UserType } from '../../types';
import { Modal } from '../../components/UI/Modal';

export const Users = () => {
    const { users, addUser, updateUser, deleteUser, loadInitialData } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);

    // Refresh data on mount to ensure list is up to date
    useEffect(() => {
        loadInitialData();
    }, []);

    const [formData, setFormData] = useState<Partial<UserType>>({
        name: '', email: '', password: '', role: 'employee', permissions: []
    });

    const [staffPage, setStaffPage] = useState(1);
    const [shopperPage, setShopperPage] = useState(1);
    const itemsPerPage = 6;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const staffUsers = filteredUsers.filter(u => u.role === 'admin' || u.role === 'employee');
    const shopperUsers = filteredUsers.filter(u => u.role === 'shopper');

    // Reset pages when search changes
    useEffect(() => {
        setStaffPage(1);
        setShopperPage(1);
    }, [searchTerm]);

    // Staff Pagination
    const indexOfLastStaff = staffPage * itemsPerPage;
    const indexOfFirstStaff = indexOfLastStaff - itemsPerPage;
    const currentStaff = staffUsers.slice(indexOfFirstStaff, indexOfLastStaff);
    const totalStaffPages = Math.ceil(staffUsers.length / itemsPerPage);

    // Shopper Pagination
    const indexOfLastShopper = shopperPage * itemsPerPage;
    const indexOfFirstShopper = indexOfLastShopper - itemsPerPage;
    const currentShoppers = shopperUsers.slice(indexOfFirstShopper, indexOfLastShopper);
    const totalShopperPages = Math.ceil(shopperUsers.length / itemsPerPage);

    const handleOpenModal = (user?: UserType) => {
        if (user) {
            setEditingUser(user);
            setFormData(user);
        } else {
            setEditingUser(null);
            setFormData({
                name: '', email: '', password: '', role: 'employee', permissions: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingUser) {
            updateUser(editingUser.id, formData);
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Usuario actualizado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            if (!formData.password) {
                Swal.fire('Error', 'La contraseña es requerida para nuevos usuarios', 'error');
                return;
            }
            addUser(formData as UserType);
            Swal.fire({
                icon: 'success',
                title: 'Creado',
                text: 'Usuario creado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string, role: string) => {
        if (role === 'admin') return;
        Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteUser(id);
                Swal.fire('Eliminado!', 'El usuario ha sido eliminado.', 'success');
            }
        });
    };

    const availablePermissions = [
        { id: 'inventory', label: 'Inventario' },
        { id: 'pos', label: 'Punto de Venta' },
        { id: 'sales', label: 'Historial de Ventas' },
        { id: 'users', label: 'Gestión de Usuarios' }
    ];

    const togglePermission = (permId: string) => {
        const currentPerms = formData.permissions || [];
        if (currentPerms.includes(permId)) {
            setFormData({ ...formData, permissions: currentPerms.filter(p => p !== permId) });
        } else {
            setFormData({ ...formData, permissions: [...currentPerms, permId] });
        }
    };

    const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                    <Plus size={20} />
                    Agregar Usuario
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar usuarios por nombre o email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* SECTION: ADMINISTRATION (Staff) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700 border-l-4 border-blue-500 pl-3">Personal Administrativo</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Usuario</th>
                                    <th className="px-6 py-3 font-semibold">Rol</th>
                                    <th className="px-6 py-3 font-semibold">Permisos</th>
                                    <th className="px-6 py-3 font-semibold">Creado</th>
                                    <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentStaff.length > 0 ? currentStaff.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800">{user.name}</div>
                                                    <div className="text-sm text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.permissions?.map(perm => (
                                                    <span key={perm} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                                                        {perm}
                                                    </span>
                                                ))}
                                                {(!user.permissions || user.permissions.length === 0) && <span className="text-gray-400 text-xs">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                                                    <Edit size={18} />
                                                </button>
                                                {user.role !== 'admin' && (
                                                    <button onClick={() => handleDelete(user.id, user.role)} className="p-2 text-red-600 hover:bg-red-50 rounded transition">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No se encontraron administradores o empleados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls currentPage={staffPage} totalPages={totalStaffPages} onPageChange={setStaffPage} />
                </div>
            </div>

            {/* SECTION: SHOPPERS */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700 border-l-4 border-green-500 pl-3">Usuarios Registrados (Clientes)</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Usuario</th>
                                    <th className="px-6 py-3 font-semibold">Rol</th>
                                    <th className="px-6 py-3 font-semibold">Creado</th>
                                    <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentShoppers.length > 0 ? currentShoppers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800">{user.name}</div>
                                                    <div className="text-sm text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-green-100 text-green-700">
                                                Cliente
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(user.id, user.role)} className="p-2 text-red-600 hover:bg-red-50 rounded transition">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                            No se encontraron clientes registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls currentPage={shopperPage} totalPages={totalShopperPages} onPageChange={setShopperPage} />
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Form fields remain unchanged... */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input
                            className="w-full border p-2 rounded"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input
                            type="email"
                            className="w-full border p-2 rounded"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña {editingUser && '(Dejar en blanco para no cambiar)'}</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required={!editingUser}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Rol</label>
                        <select
                            className="w-full border p-2 rounded"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                        >
                            <option value="shopper">Cliente (Shopper)</option>
                            <option value="employee">Empleado</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    {formData.role === 'employee' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Permisos</label>
                            <div className="grid grid-cols-2 gap-2">
                                {availablePermissions.map(perm => (
                                    <label key={perm.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={formData.permissions?.includes(perm.id)}
                                            onChange={() => togglePermission(perm.id)}
                                        />
                                        <span className="text-sm">{perm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
