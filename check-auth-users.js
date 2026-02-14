
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
// PRECISAMOS DA SERVICE_ROLE KEY PARA LISTAR USUÁRIOS!
// A ANON KEY NÃO TEM PERMISSÃO PARA LISTAR USUÁRIOS DO AUTH.
// Vou tentar ler se existe uma SERVICE_ROLE no .env, senão vou avisar.
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
    console.log('--- Checking Registered Users (Auth) ---');

    // Tenta listar usuários (só funciona com Service Role ou se tiver permissão, o que é inseguro para Anon)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error listing users:', error.message);
        console.log('💡 Note: Listing users requires the STATUS_ROLE_KEY. If you only have the ANON_KEY, I cannot verify if the admin exists.');
        console.log('💡 Try logging in manually at /admin with a known email/password.');
    } else {
        console.log(`✅ Found ${users.length} users:`);
        users.forEach(u => console.log(`- ${u.email} (Last Sign In: ${u.last_sign_in_at})`));
    }
}

listUsers().catch(console.error);
