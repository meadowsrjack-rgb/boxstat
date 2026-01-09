import jwt from 'jsonwebtoken';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;

const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
const PEM_FOOTER = '-----END PRIVATE KEY-----';

let base64Content = (APNS_AUTH_KEY || '').replace(PEM_HEADER, '').replace(PEM_FOOTER, '').replace(/\s/g, '');
const formattedKey = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
const pemKey = `${PEM_HEADER}\n${formattedKey}\n${PEM_FOOTER}`;

const now = Math.floor(Date.now() / 1000);

console.log('=== JWT Token Debug ===');
console.log('Key ID (kid):', APNS_KEY_ID);
console.log('Team ID (iss):', APNS_TEAM_ID);
console.log('Issued At (iat):', now);
console.log('');

const token = jwt.sign(
  { iss: APNS_TEAM_ID, iat: now },
  pemKey,
  { algorithm: 'ES256', header: { alg: 'ES256', kid: APNS_KEY_ID } }
);

// Decode the token to verify the payload
const decoded = jwt.decode(token, { complete: true });
console.log('Token Header:', JSON.stringify(decoded?.header, null, 2));
console.log('Token Payload:', JSON.stringify(decoded?.payload, null, 2));
console.log('');
console.log('If these values look correct, the issue is likely:');
console.log('1. Key ID does not match the actual .p8 file');
console.log('2. The .p8 key is not registered for Apple Push Notifications');
console.log('3. The key was revoked in Apple Developer portal');
