
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const adminUser = {
        id: '1',
        name: 'Admin User',
        email: 'admin@aliexpress.com',
        password: 'admin123',
        role: 'admin',
        permissions: ['inventory', 'pos', 'sales', 'users'],
        created_at: new Date().toISOString()
    };

    // Check if exists
    const { data: existing } = await supabase.from('users').select('*').eq('email', adminUser.email);

    if (existing && existing.length > 0) {
        console.log('Admin user already exists:', existing[0]);
        // Optionally update password to ensure it matches
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: adminUser.password, role: 'admin' })
            .eq('email', adminUser.email);

        if (updateError) console.error('Error updating admin:', updateError);
        else console.log('Admin user updated successfully.');

    } else {
        const { data, error } = await supabase.from('users').insert([adminUser]).select();
        if (error) {
            console.error('Error creating admin:', error);
        } else {
            console.log('Admin user created successfully:', data);
        }
    }
}

createAdmin();
