
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
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLoginFix() {
    console.log('--- Verifying Login Fix ---');

    // 1. Find a CPF that has ONLY delivered orders (or any CPF)
    const { data: sampleOrders, error: sampleError } = await supabase
        .from('ServiceOrders')
        .select('Id, Status, Clients(Cpf)')
        .eq('Status', 'Entregue') // We specifically want to test the case that WAS failing
        .limit(1);

    if (sampleError || !sampleOrders.length) {
        console.log('Could not find a delivered order to test.');
        return;
    }

    const testCpf = sampleOrders[0].Clients?.Cpf;
    console.log(`Testing with CPF: ${testCpf} (Linked to delivered order #${sampleOrders[0].Id})`);

    const cleanInputCpf = testCpf.replace(/\D/g, '');

    // 2. Run the NEW query (without .neq('Status', 'Entregue'))
    const { data: loginData, error: loginError } = await supabase
        .from('ServiceOrders')
        .select('Id, CreatedAt, Description, Status, Clients!inner(Cpf)')
        .eq('Clients.Cpf', cleanInputCpf)
        // .neq('Status', 'Entregue')  <-- REMOVED
        .order('CreatedAt', { ascending: false });

    if (loginError) {
        console.error('❌ Login Query Failed:', loginError.message);
    } else {
        console.log(`✅ Login Query Successful! Found ${loginData.length} orders.`);
        console.table(loginData.map(o => ({ Id: o.Id, Status: o.Status })));

        const hasDelivered = loginData.some(o => o.Status === 'Entregue');
        if (hasDelivered) {
            console.log('✅ Success: Delivered orders are now visible in login.');
        } else {
            console.log('⚠️ Warning: No delivered orders found (maybe this user only has active ones?).');
        }
    }
}

verifyLoginFix().catch(console.error);
