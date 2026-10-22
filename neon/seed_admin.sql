-- OPCIONAL: solo si NO vas a migrar usuarios desde Supabase y necesitas un admin inicial.
-- La contraseña se guarda temporalmente en texto plano y el Worker la convierte a hash
-- automáticamente la primera vez que inicies sesión. Cámbiala luego desde "Editar perfil".
insert into users (id, name, email, password, role, permissions)
values ('1', 'Administrador', 'admin@systecfl.site', 'CambiaEstaClave123', 'admin',
        array['inventory','pos','sales','users'])
on conflict (id) do nothing;
