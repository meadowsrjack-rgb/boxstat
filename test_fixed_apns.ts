import http2 from 'http2';
import jwt from 'jsonwebtoken';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;
const APNS_BUNDLE_ID = 'boxstat.app';
const APNS_HOST = 'api.sandbox.push.apple.com';
const DEVICE_TOKEN = 'ECE8AF04B31B6FCD69741158DAB9DA688F64C8DD2E9C7B6212A6B743F2B75AC2';

const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
const PEM_FOOTER = '-----END PRIVATE KEY-----';

function getPrivateKey(): string | null {
  if (!APNS_AUTH_KEY) return null;
  
  let key = APNS_AUTH_KEY;
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  if (key.includes(PEM_HEADER) && key.includes('\n')) return key;
  
  // Remove ALL whitespace and headers
  let base64Content = key.replace(PEM_HEADER, '').replace(PEM_FOOTER, '').replace(/\s/g, '');
  const formattedKey = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
  
  console.log('Cleaned key (first 100 chars):', base64Content.substring(0, 100));
  console.log('Key length:', base64Content.length);
  
  return `${PEM_HEADER}\n${formattedKey}\n${PEM_FOOTER}`;
}

async function testPush() {
  console.log('=== APNs Test - SANDBOX Gateway (Fixed Key Parsing) ===');
  
  const privateKey = getPrivateKey();
  if (!privateKey || !APNS_KEY_ID || !APNS_TEAM_ID) {
    console.error('Missing APNs configuration');
    return;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { iss: APNS_TEAM_ID, iat: now },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: APNS_KEY_ID } }
  );
  
  console.log('JWT generated successfully');
  
  const payload = JSON.stringify({
    aps: { alert: { title: 'Test Push', body: 'Sandbox test - ' + new Date().toLocaleTimeString() }, badge: 1, sound: 'default' }
  });
  
  const client = http2.connect('https://' + APNS_HOST);
  const req = client.request({
    ':method': 'POST',
    ':path': '/3/device/' + DEVICE_TOKEN.toLowerCase(),
    'authorization': 'bearer ' + token,
    'apns-topic': APNS_BUNDLE_ID,
    'apns-push-type': 'alert',
    'apns-priority': '10',
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload)
  });
  
  let responseData = '';
  let statusCode = 0;
  
  req.on('response', (headers) => { statusCode = headers[':status'] as number; });
  req.on('data', (chunk) => { responseData += chunk; });
  req.on('end', () => {
    console.log('');
    console.log('Status:', statusCode);
    if (responseData) console.log('Response:', responseData);
    console.log(statusCode === 200 ? '✅ SUCCESS - Check your device!' : '❌ FAILED');
    client.close();
  });
  
  req.write(payload);
  req.end();
}

testPush();
