const https = require('https');
const url = "https://ezjmwlneeyesmomdkixi.supabase.co";

console.log("Testing connection to: " + url);

const req = https.get(url, (res) => {
    console.log('statusCode:', res.statusCode);
    res.on('data', (d) => {
        // console.log(d.toString()); // Don't print body, just status is enough
    });
});

req.on('error', (e) => {
    console.error('Connection error:', e);
});

req.end();
