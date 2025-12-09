// const fetch = require('node-fetch'); // Using global fetch

async function debug() {
    try {
        console.log('\n--- Toolkits Request ---');
        const toolkitsRes = await fetch('http://localhost:3000/api/toolkits');
        const text = await toolkitsRes.text();
        console.log('Response status:', toolkitsRes.status);

        try {
            const toolkitsData = JSON.parse(text);
            if (toolkitsData.items && toolkitsData.items.length > 0) {
                console.log('--- FIRST TOOLKIT ITEM ---');
                console.log(JSON.stringify(toolkitsData.items[0], null, 2));
                console.log(`Total toolkits: ${toolkitsData.items.length}`);
            } else {
                console.log('No items found or structure is different:', Object.keys(toolkitsData));
            }
        } catch (e) {
            console.log('Failed to parse JSON:', text.substring(0, 200));
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

debug();
