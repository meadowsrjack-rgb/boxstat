import http2 from 'http2';
import jwt from 'jsonwebtoken';

// Get these from environment
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;
const APNS_BUNDLE_ID = 'boxstat.app';

// Latest token from database  
const DEVICE_TOKEN = 'ECE8AF04B31B6FCD69741158DAB9DA688F64C8DD2E9C7B6212A6B743F2B75AC2';

// Use SANDBOX for debug builds
const APNS_HOST = 'api.sandbox.push.apple.com';

function getPrivateKey(): string | null {
  if (!APNS_AUTH_KEY) return null;
  
  let key = APNS_AUTH_KEY;
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  
  const PEM_HEADER = '-----BEGIN PRIVATE KEY-----';
  const PEM_FOOTER = '-----END PRIVATE KEY-----';
  
  if (key.includes(PEM_HEADER) && key.includes('\n')) {
    return key;
  }
  
  let base64Content = key;
  if (key.includes(PEM_HEADER)) {
    base64Content = key.replace(PEM_HEADER, '').replace(PEM_FOOTER, '').replace(/\s/g, '');
  }
  
  const formattedKey = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
  return `${PEM_HEADER}\n${formattedKey}\n${PEM_FOOTER}`;
}

async function testPush() {
  console.log('=== APNs Test Push ===');
  console.log('Target: SANDBOX gateway (api.sandbox.push.apple.com)');
  console.log('Device Token:', DEVICE_TOKEN.substring(0, 20) + '...');
  console.log('Bundle ID:', APNS_BUNDLE_ID);
  console.log('');
  
  const privateKey = getPrivateKey();
  if (!privateKey || !APNS_KEY_ID || !APNS_TEAM_ID) {
    console.error('❌ Missing APNs configuration');
    console.error('APNS_KEY_ID:', APNS_KEY_ID ? '✓' : '✗');
    console.error('APNS_TEAM_ID:', APNS_TEAM_ID ? '✓' : '✗');
    console.error('APNS_AUTH_KEY:', APNS_AUTH_KEY ? '✓' : '✗');
    return;
  }
  
  console.log('Configuration: ✓');
  
  const now = Math.floor(Date.now() / 1000);
  try {
    const token = jwt.sign(
      { iss: APNS_TEAM_ID, iat: now },
      privateKey,
      { algorithm: 'ES256', header: { alg: 'ES256', kid: APNS_KEY_ID } }
    );
    console.log('JWT Token generated: ✓');
    
    const payload = JSON.stringify({
      aps: {
        alert: { title: 'Test Push', body: 'Testing sandbox APNs gateway - ' + new Date().toISOString() },
        badge: 1,
        sound: 'default',
        'mutable-content': 1
      }
    });
    
    console.log('Connecting to:', APNS_HOST);
    
    const client = http2.connect('https://' + APNS_HOST);
    
    client.on('error', (err) => {
      console.error('❌ Connection error:', err.message);
    });
    
    const req = client.request({
      ':method': 'POST',
      ':path': '/3/device/' + DEVICE_TOKEN.toLowerCase(),
      'authorization': 'bearer ' + token,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': '0',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload)
    });
    
    let responseData = '';
    let statusCode = 0;
    
    req.on('response', (headers) => {
      statusCode = headers[':status'] as number;
      console.log('');
      console.log('=== APNs Response ===');
      console.log('Status Code:', statusCode);
    });
    
    req.on('data', (chunk) => {
      responseData += chunk;
    });
    
    req.on('end', () => {
      if (responseData) {
        console.log('Response Body:', responseData);
      }
      
      if (statusCode === 200) {
        console.log('✅ Push notification sent successfully!');
        console.log('');
        console.log('Check your device - notification should appear now.');
      } else {
        console.log('❌ Push failed');
      }
      
      client.close();
    });
    
    req.write(payload);
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPush();
