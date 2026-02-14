
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

async function checkCpfFormat() {
    // Fetch 5 clients to see CPF format
    const { data: clients, error: clientsError } = await supabase
        .from('Clients')
        .select('Id, Cpf')
        .limit(5);

    if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
    }

    console.log('--- Client CPF Samples ---');
    console.table(clients);

    // Check if standard formatted CPF exists vs unformatted
    const sample = clients[0];
    if (sample && sample.Cpf) {
        const isFormatted = /\D/.test(sample.Cpf);
        console.log(`CPF Format Detected: ${isFormatted ? 'Formatted (with dots/dash)' : 'Plain Numbers'}`);
    }
}

checkCpfFormat().catch(console.error);
