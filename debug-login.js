
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually since we are running a standalone script
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase Connection...');
    console.log('URL:', supabaseUrl);

    // 1. Test basic connection (Health check)
    const { data: healthData, error: healthError } = await supabase.from('ServiceOrders').select('count', { count: 'exact', head: true });

    if (healthError) {
        console.error('❌ Connection Failed:', healthError.message);
        console.error('Details:', healthError);
        return;
    }
    console.log('✅ Connection Successful! ServiceOrders count accessible (or RLS allowed).');

    // 2. Test Login Query Logic (Simulate what the frontend does)
    // We need a valid CPF to test. I'll search for *any* service order to get a CPF unless one is known.
    // If I can't look up generic orders due to RLS, this step might fail, which gives us a clue.

    console.log('\nScanning for a sample ServiceOrder to test login...');
    const { data: sampleOrders, error: sampleError } = await supabase
        .from('ServiceOrders')
        .select('Id, Clients(Cpf)')
        .limit(1);

    if (sampleError) {
        console.error('❌ Failed to fetch sample order:', sampleError.message);
        console.error('Possible RLS issue preventing generic read.');
    } else if (sampleOrders.length === 0) {
        console.log('⚠️ No ServiceOrders found in the database.');
    } else {
        const sampleOrder = sampleOrders[0];
        const sampleCpf = sampleOrder.Clients?.Cpf;

        if (sampleCpf) {
            console.log(`Found sample CPF: ${sampleCpf}`);
            console.log('Testing Login Query with this CPF...');

            const cleanInputCpf = sampleCpf.replace(/\D/g, '');

            const { data: loginData, error: loginError } = await supabase
                .from('ServiceOrders')
                .select('Id, CreatedAt, Description, Status, Clients!inner(Cpf)')
                .eq('Clients.Cpf', cleanInputCpf)
                .neq('Status', 'Entregue')
                .order('CreatedAt', { ascending: false });

            if (loginError) {
                console.error('❌ Login Query Failed:', loginError.message);
            } else {
                console.log(`✅ Login Query Successful! Found ${loginData.length} active orders.`);
                console.table(loginData);
            }
        } else {
            console.log('⚠️ Found an order but client CPF was missing/inaccessible.');
        }
    }
}

testConnection().catch(console.error);
