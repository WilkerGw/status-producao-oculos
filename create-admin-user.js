
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Config
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
// Creating a user usually requires service_role key OR public signups enabled.
// If public signups are enabled, anon key works for signUp().
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('--- Create New Admin User ---');

rl.question('Enter Email: ', (email) => {
    rl.question('Enter Password (min 6 chars): ', async (password) => {

        console.log(`\nCreating user ${email}...`);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error('❌ Error creating user:', error.message);
        } else {
            console.log('✅ User created successfully!');
            console.log('User ID:', data.user?.id);
            if (data.session) {
                console.log('Session active: Yes');
            } else {
                console.log('Session active: No (User might need email confirmation if enabled in Supabase)');
                console.log('👉 Check your inbox/spam for a confirmation link.');
            }
        }

        rl.close();
    });
});
