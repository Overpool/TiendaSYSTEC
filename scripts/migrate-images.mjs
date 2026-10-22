// Migra las imágenes de productos desde Supabase Storage a Cloudflare R2
// y actualiza la columna products.image en Neon.
//
// Uso (desde la raíz del proyecto, con `npx wrangler login` hecho antes):
//   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" node scripts/migrate-images.mjs
//
// Opcional: R2_BUCKET=systec-images (por defecto)

import { neon } from '@neondatabase/serverless';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL;
const BUCKET = process.env.R2_BUCKET || 'systec-images';
const WRANGLER = join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(WRANGLER)) {
    console.error('No se encontró wrangler local. Ejecuta el script desde la raíz del proyecto, después de npm install');
    process.exit(1);
}
if (!DATABASE_URL) {
    console.error('Falta DATABASE_URL (cadena de conexión de Neon)');
    process.exit(1);
}

const sql = neon(DATABASE_URL);
const tmp = mkdtempSync(join(tmpdir(), 'systec-img-'));

const rows = await sql`select id, image from products where image like '%supabase.co/storage/v1/object/public/%'`;
console.log(`Imágenes a migrar: ${rows.length}`);

let ok = 0;
for (const { id, image } of rows) {
    try {
        const res = await fetch(image);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const original = decodeURIComponent(new URL(image).pathname.split('/').pop() || `${id}.jpg`);
        const safeName = original.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `products/${safeName}`;
        const file = join(tmp, safeName);
        writeFileSync(file, Buffer.from(await res.arrayBuffer()));

        // Se llama al wrangler local con el mismo Node (en Windows `npx` es un .cmd y execFileSync no puede ejecutarlo)
        execFileSync(process.execPath, [WRANGLER, 'r2', 'object', 'put', `${BUCKET}/${key}`,
            '--file', file, '--content-type', contentType, '--remote'], { stdio: 'inherit' });

        await sql`update products set image = ${`/api/images/${key}`} where id = ${id}`;
        ok++;
        console.log(`✓ ${id} -> /api/images/${key}`);
    } catch (err) {
        console.error(`✗ ${id} (${image}): ${err.message}`);
    }
}

rmSync(tmp, { recursive: true, force: true });
console.log(`Listo: ${ok}/${rows.length} imágenes migradas.`);
