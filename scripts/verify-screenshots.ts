import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'app-store-screenshots');

// Expected dimensions for each device
const EXPECTED_DIMENSIONS = {
  'iphone-67': { width: 1284, height: 2778 },
  'iphone-65': { width: 1242, height: 2688 },
  'ipad-pro': { width: 2778, height: 1284 },
};

async function verifyScreenshots() {
  console.log('🔍 Verifying screenshot dimensions...\n');

  const files = fs.readdirSync(SCREENSHOT_DIR);
  let allValid = true;

  for (const file of files) {
    if (!file.endsWith('.png')) continue;

    const filepath = path.join(SCREENSHOT_DIR, file);
    const metadata = await sharp(filepath).metadata();

    // Determine which device type this is
    let deviceType = '';
    if (file.includes('iphone-67')) deviceType = 'iphone-67';
    else if (file.includes('iphone-65')) deviceType = 'iphone-65';
    else if (file.includes('ipad-pro')) deviceType = 'ipad-pro';

    const expected = EXPECTED_DIMENSIONS[deviceType as keyof typeof EXPECTED_DIMENSIONS];
    const actual = { width: metadata.width!, height: metadata.height! };

    const isValid = actual.width === expected.width && actual.height === expected.height;
    
    const status = isValid ? '✅' : '❌';
    console.log(`${status} ${file}`);
    console.log(`   Expected: ${expected.width}×${expected.height}px`);
    console.log(`   Actual:   ${actual.width}×${actual.height}px`);
    
    if (!isValid) {
      allValid = false;
    }
  }

  console.log(`\n${allValid ? '✅ All screenshots have correct dimensions!' : '❌ Some screenshots have incorrect dimensions'}`);
  return allValid;
}

verifyScreenshots().catch(console.error);
