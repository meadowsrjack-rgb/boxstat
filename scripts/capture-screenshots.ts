import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'app-store-screenshots');

// Apple App Store required dimensions
const DEVICES = {
  'iphone-67': { width: 1284, height: 2778, name: 'iPhone 6.7"' }, // iPhone 14 Pro Max, 15 Pro Max
  'iphone-65': { width: 1242, height: 2688, name: 'iPhone 6.5"' }, // iPhone XS Max, 11 Pro Max
  'ipad-pro': { width: 2778, height: 1284, name: 'iPad Pro 12.9"' }, // Landscape
};

// Pages to capture
const PAGES = [
  { path: '/', name: '01-home', needsAuth: false },
  { path: '/login', name: '02-login', needsAuth: false },
  { path: '/unified-account', name: '03-parent-dashboard', needsAuth: true },
  { path: '/player-dashboard', name: '04-player-dashboard', needsAuth: true },
  { path: '/events', name: '05-events', needsAuth: true },
];

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture for App Store submission...\n');

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ],
  });

  const baseUrl = 'http://localhost:5000';

  try {
    for (const [deviceKey, device] of Object.entries(DEVICES)) {
      console.log(`\n📱 Capturing screenshots for ${device.name} (${device.width}x${device.height})...\n`);

      const page = await browser.newPage();
      
      // Set viewport to exact device dimensions
      await page.setViewport({
        width: device.width,
        height: device.height,
        deviceScaleFactor: 1,
      });

      // Login if needed for authenticated pages
      let isLoggedIn = false;

      for (const pageConfig of PAGES) {
        try {
          // Login if this page needs auth and we haven't logged in yet
          if (pageConfig.needsAuth && !isLoggedIn) {
            console.log('  🔐 Logging in...');
            await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // Fill login form
            await page.type('input[data-testid="input-email"]', 'test@example.com', { delay: 10 });
            await page.type('input[data-testid="input-password"]', 'test123', { delay: 10 });
            
            // Click login button
            await page.click('button[data-testid="button-login"]');
            
            // Wait for navigation after login
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
            isLoggedIn = true;
            console.log('  ✅ Logged in successfully');
          }

          // Navigate to the page
          console.log(`  📸 Capturing: ${pageConfig.name} (${pageConfig.path})`);
          await page.goto(`${baseUrl}${pageConfig.path}`, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });

          // Wait a bit for animations and dynamic content
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Take screenshot
          const filename = `${pageConfig.name}-${deviceKey}.png`;
          const filepath = path.join(SCREENSHOT_DIR, filename);
          
          await page.screenshot({
            path: filepath,
            fullPage: false, // Capture only viewport, not entire scrollable page
          });

          console.log(`  ✅ Saved: ${filename}`);

        } catch (error: any) {
          console.error(`  ❌ Error capturing ${pageConfig.name}:`, error.message);
        }
      }

      await page.close();
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('\n📋 Files ready for App Store submission:');
    
    const files = fs.readdirSync(SCREENSHOT_DIR);
    files.forEach(file => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
      console.log(`   - ${file} (${Math.round(stats.size / 1024)} KB)`);
    });

  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
