const { chromium } = require('playwright');

async function main() {
    console.log("Iniciando navegador...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('response', async (response) => {
        const url = response.url();
        // Ignore static assets
        if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg') || url.includes('.svg') || url.includes('google') || url.includes('facebook')) return;
        
        console.log(`[API CALL] ${response.request().method()} ${url} - Status: ${response.status()}`);
        if (url.includes('api') || url.includes('graphql') || url.includes('search') || url.includes('produtos') || url.includes('_serverFn')) {
            try {
                const text = await response.text();
                console.log(`\tResponse snippet:`, text.substring(0, 300).replace(/\n/g, ' '));
            } catch (e) {
                console.log(`\t(Could not read body)`);
            }
        }
    });

    console.log("Acessando Redeparts...");
    await page.goto('https://redeparts.com.br/produtos?machineBrand=massey-ferguson&page=1', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(5000); // give it time to load data
    await browser.close();
}

main().catch(console.error);
