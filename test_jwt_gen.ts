import jwt from 'jsonwebtoken';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;

function getPrivateKey(): string | null {
  if (!APNS_AUTH_KEY) return null;
  
  let key = APNS_AUTH_KEY;
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  
  const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
  const PEM_FOOTER = '-----END PRIVATE KEY-----';
  
  // If already has PEM format with newlines, return as-is
  if (key.includes(PEM_HEADER) && key.includes('\n')) {
    console.log('Key already in PEM format');
    return key;
  }
  
  // Extract just the base64 content
  let base64Content = key;
  if (key.includes(PEM_HEADER)) {
    base64Content = key.replace(PEM_HEADER, '').replace(PEM_FOOTER, '').replace(/\s/g, '');
  }
  
  // Format with proper 64-character line breaks
  const formattedKey = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
  const finalKey = `${PEM_HEADER}\n${formattedKey}\n${PEM_FOOTER}`;
  
  console.log('Formatted key:');
  console.log(finalKey);
  console.log('');
  
  return finalKey;
}

const privateKey = getPrivateKey();

if (!privateKey) {
  console.error('Failed to get private key');
  process.exit(1);
}

try {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { iss: APNS_TEAM_ID, iat: now },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: APNS_KEY_ID } }
  );
  
  console.log('✅ JWT Token generated successfully!');
  console.log('Token preview:', token.substring(0, 50) + '...');
} catch (error) {
  console.error('❌ Failed to generate JWT:', error);
}
