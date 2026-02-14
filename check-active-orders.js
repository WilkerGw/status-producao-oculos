
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env
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

async function checkActiveOrders() {
    // Count all orders
    const { count: total, error: totalError } = await supabase
        .from('ServiceOrders')
        .select('*', { count: 'exact', head: true });

    // Count delivered orders
    const { count: delivered, error: deliveredError } = await supabase
        .from('ServiceOrders')
        .select('*', { count: 'exact', head: true })
        .eq('Status', 'Entregue');

    if (totalError || deliveredError) {
        console.error('Error counting:', totalError || deliveredError);
        return;
    }

    console.log(`Total Orders: ${total}`);
    console.log(`Delivered Orders: ${delivered}`);
    console.log(`Active Orders: ${total - delivered}`);

    if (total === delivered) {
        console.log('⚠️ ALL orders are delivered. The login page blocks delivered orders, so NO ONE can login.');
    }
}

checkActiveOrders().catch(console.error);
