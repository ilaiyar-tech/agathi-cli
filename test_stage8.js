import http from 'http';

// Correcting the payload as per your spec
const data = JSON.stringify({
    url: "https://example.com"
});

const options = {
    hostname: 'localhost',
    port: 8100,
    path: '/browser/text',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log("--- Engine Response ---");
        try {
            console.log(JSON.parse(body));
        } catch (e) {
            console.log("Raw response:", body);
        }
    });
});

req.write(data);
req.end();
