// =============================================================================
// W1-24 scratch: open the big-picture PDFs in Chromium's own PDF viewer (PDFium)
// =============================================================================
// Local files only (file://), a throwaway profile, no network. Screenshots go to
// scratch/W1-24/pdf/chrome__<name>.png for w1_24_chromecheck.py.
//   node w1_24_chrome.mjs [--headed]
// =============================================================================
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const PW = join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright');
const CHROME = join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe');
const { chromium } = require(PW);
const HEADED = process.argv.includes('--headed');
const NAMES = (process.argv.find((a) => a.startsWith('--only=')) || '--only=before__big,candidate__big').slice(7).split(',');

async function main() {
    if (!existsSync(CHROME)) throw new Error('no Chromium at ' + CHROME);
    const profile = mkdtempSync(join(tmpdir(), 'W1-24__chrome__'));
    const context = await chromium.launchPersistentContext(profile, {
        executablePath : CHROME,
        headless       : !HEADED,
        viewport       : { width : 1000, height : 1300 },
        args           : HEADED ? [ '--window-position=40,40' ] : [],
        acceptDownloads: false
    });
    try {
        for (const name of NAMES) {
            const page = await context.newPage();
            const url = pathToFileURL(join(HERE, 'pdf', name + '.pdf')).href;
            let note = '';
            try {
                await page.goto(url, { waitUntil : 'load', timeout : 30000 });
            } catch (error) {
                note = ' (goto: ' + String(error.message || error).split('\n')[0] + ')';
            }
            await page.waitForTimeout(12000);                                     // <-- Let the viewer decode and paint the picture
            const shot = join(HERE, 'pdf', 'chrome__' + name + '.png');
            await page.screenshot({ path : shot });
            const frames = page.frames().map((f) => f.url()).join(' | ');
            console.log(name + ': screenshot ' + shot + note + '\n  frames: ' + frames);
            await page.close();
        }
    } finally {
        await context.close();
    }
}

main().catch((error) => { console.log('CHROME HARNESS ERROR: ' + (error && error.stack || error)); process.exitCode = 2; });
