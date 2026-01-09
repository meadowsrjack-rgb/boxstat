import * as crypto from 'crypto';

const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;
const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
const PEM_FOOTER = '-----END PRIVATE KEY-----';

// Clean and format the key
let base64Content = (APNS_AUTH_KEY || '').replace(PEM_HEADER, '').replace(PEM_FOOTER, '').replace(/\s/g, '');
const formattedKey = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
const pemKey = `${PEM_HEADER}\n${formattedKey}\n${PEM_FOOTER}`;

console.log('=== APNs Key Validation ===');
console.log('Base64 length:', base64Content.length, '(expected: ~228 for EC P-256 key)');
console.log('');

try {
  // Try to create a key object from the PEM - this validates the key format
  const keyObject = crypto.createPrivateKey(pemKey);
  console.log('✅ Key format is valid');
  console.log('Key type:', keyObject.asymmetricKeyType);
  
  // Try to sign something with it
  const sign = crypto.createSign('SHA256');
  sign.update('test');
  const signature = sign.sign(keyObject);
  console.log('✅ Key can sign data');
  console.log('Signature length:', signature.length, 'bytes');
  
} catch (error: any) {
  console.log('❌ Key validation failed:', error.message);
  console.log('');
  console.log('The key content appears to be corrupted or truncated.');
  console.log('Expected base64 length for EC P-256 key: ~228 characters');
  console.log('Actual base64 length:', base64Content.length, 'characters');
}
