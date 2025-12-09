
// Using global fetch

async function repro() {
    try {
        console.log('--- Attempting Connection ---');
        // Pick a toolkit unlikely to have an auth config, e.g. "asana" or "github" if not connected
        const toolkitSlug = 'asana';

        const response = await fetch('http://localhost:3000/api/apps/connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolkitSlug })
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Body: ${text}`);

    } catch (e) {
        console.error(e);
    }
}

repro();
