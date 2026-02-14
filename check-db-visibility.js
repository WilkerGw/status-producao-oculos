
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
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

async function checkVisibility() {
    console.log('--- Checking Database Visibility (Permissions) ---');

    // 1. Check ServiceOrders count (head: true)
    const { count: ordersCount, error: countError } = await supabase
        .from('ServiceOrders')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error counting ServiceOrders:', countError.message);
    } else {
        console.log(`ServiceOrders Count (visible to anon): ${ordersCount}`);
    }

    // 2. Check Clients count
    const { count: clientsCount, error: clientsError } = await supabase
        .from('Clients')
        .select('*', { count: 'exact', head: true });

    if (clientsError) {
        console.error('❌ Error counting Clients:', clientsError.message);
    } else {
        console.log(`Clients Count (visible to anon): ${clientsCount}`);
    }

    // 3. Try to fetch one row
    const { data: orders, error: fetchError } = await supabase
        .from('ServiceOrders')
        .select('Id, Status, Description')
        .limit(1);

    if (fetchError) {
        console.error('❌ Error fetching one ServiceOrder:', fetchError.message);
    } else if (orders.length === 0) {
        console.log('⚠️ Fetched 0 ServiceOrders. If the table is not empty, RLS is likely blocking public access.');
    } else {
        console.log('✅ Successfully fetched a ServiceOrder:');
        console.table(orders);
    }
}

checkVisibility().catch(console.error);
