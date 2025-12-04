import * as https from 'https';
import * as http2 from 'http2';
import * as jwt from 'jsonwebtoken';

// APNs Configuration from environment variables
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.boxstat.app';

// APNs endpoints
const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

// Use production for App Store builds
const APNS_HOST = process.env.NODE_ENV === 'development' ? APNS_HOST_SANDBOX : APNS_HOST_PRODUCTION;

// JWT token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

function getPrivateKey(): string | null {
  if (!APNS_AUTH_KEY) {
    return null;
  }
  
  // Handle both raw key and escaped newlines
  let key = APNS_AUTH_KEY;
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  
  // Ensure proper PEM format
  if (!key.startsWith('-----BEGIN PRIVATE KEY-----')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }
  
  return key;
}

function generateJWT(): string | null {
  const privateKey = getPrivateKey();
  
  if (!privateKey || !APNS_KEY_ID || !APNS_TEAM_ID) {
    console.error('[APNs] Missing required configuration:');
    console.error('[APNs]   APNS_KEY_ID:', APNS_KEY_ID ? '✓' : '✗');
    console.error('[APNs]   APNS_TEAM_ID:', APNS_TEAM_ID ? '✓' : '✗');
    console.error('[APNs]   APNS_AUTH_KEY:', privateKey ? '✓' : '✗');
    return null;
  }

  // Check if we have a valid cached token (tokens are valid for 1 hour, we refresh at 50 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 600) {
    return cachedToken.token;
  }

  try {
    const token = jwt.sign(
      {
        iss: APNS_TEAM_ID,
        iat: now
      },
      privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: APNS_KEY_ID
        }
      }
    );

    // Cache token for 50 minutes
    cachedToken = {
      token,
      expiresAt: now + 3000
    };

    console.log('[APNs] ✅ Generated new JWT token');
    return token;
  } catch (error) {
    console.error('[APNs] ❌ Failed to generate JWT:', error);
    return null;
  }
}

export interface APNsNotification {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
}

export interface APNsSendResult {
  success: boolean;
  deviceToken: string;
  error?: string;
  statusCode?: number;
}

async function sendSingleNotification(
  deviceToken: string,
  notification: APNsNotification,
  apnsEnvironment?: string // 'sandbox' or 'production'
): Promise<APNsSendResult> {
  return new Promise((resolve) => {
    const token = generateJWT();
    
    if (!token) {
      resolve({
        success: false,
        deviceToken,
        error: 'Failed to generate APNs JWT token - check configuration'
      });
      return;
    }

    const payload = JSON.stringify({
      aps: {
        alert: {
          title: notification.title,
          body: notification.body
        },
        badge: notification.badge ?? 1,
        sound: notification.sound || 'default',
        'mutable-content': 1
      },
      ...notification.data
    });

    // Clean device token (remove spaces and angle brackets if present)
    const cleanToken = deviceToken.replace(/[<>\s]/g, '');

    // Use the correct APNs host based on the token's environment
    const host = apnsEnvironment === 'sandbox' ? APNS_HOST_SANDBOX : APNS_HOST_PRODUCTION;
    console.log(`[APNs] Using host ${host} for token (environment: ${apnsEnvironment || 'default'})`);
    
    const client = http2.connect(`https://${host}`);
    
    client.on('error', (err) => {
      console.error('[APNs] ❌ HTTP/2 connection error:', err.message);
      resolve({
        success: false,
        deviceToken: cleanToken,
        error: `Connection error: ${err.message}`
      });
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${cleanToken}`,
      'authorization': `bearer ${token}`,
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
    });

    req.on('data', (chunk) => {
      responseData += chunk;
    });

    req.on('end', () => {
      client.close();

      if (statusCode === 200) {
        console.log(`[APNs] ✅ Push sent successfully to ${cleanToken.substring(0, 20)}...`);
        resolve({
          success: true,
          deviceToken: cleanToken,
          statusCode
        });
      } else {
        let errorMessage = `Status ${statusCode}`;
        try {
          const errorBody = JSON.parse(responseData);
          errorMessage = errorBody.reason || errorMessage;
        } catch {}
        
        console.error(`[APNs] ❌ Push failed for ${cleanToken.substring(0, 20)}...: ${errorMessage}`);
        resolve({
          success: false,
          deviceToken: cleanToken,
          error: errorMessage,
          statusCode
        });
      }
    });

    req.on('error', (err) => {
      client.close();
      console.error('[APNs] ❌ Request error:', err.message);
      resolve({
        success: false,
        deviceToken: cleanToken,
        error: `Request error: ${err.message}`
      });
    });

    req.write(payload);
    req.end();
  });
}

export interface APNsDevice {
  token: string;
  environment?: string; // 'sandbox' or 'production'
}

export async function sendAPNsNotification(
  devices: APNsDevice[],
  notification: APNsNotification
): Promise<{
  successCount: number;
  failureCount: number;
  results: APNsSendResult[];
}> {
  console.log(`[APNs] 🚀 Sending push notification to ${devices.length} device(s)`);
  console.log(`[APNs] Title: "${notification.title}"`);
  console.log(`[APNs] Body: "${notification.body}"`);
  console.log(`[APNs] Bundle ID: ${APNS_BUNDLE_ID}`);

  // Check configuration
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_AUTH_KEY) {
    console.error('[APNs] ⚠️ APNs not configured - missing required environment variables');
    return {
      successCount: 0,
      failureCount: devices.length,
      results: devices.map(d => ({
        success: false,
        deviceToken: d.token,
        error: 'APNs not configured'
      }))
    };
  }

  const results = await Promise.all(
    devices.map(device => sendSingleNotification(device.token, notification, device.environment))
  );

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`[APNs] 📊 Results: ${successCount} successful, ${failureCount} failed`);

  return {
    successCount,
    failureCount,
    results
  };
}

export function isAPNsConfigured(): boolean {
  return !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_AUTH_KEY);
}

// Log configuration status on module load
if (isAPNsConfigured()) {
  console.log('✅ APNs configured for direct push notifications');
  console.log(`   Host: ${APNS_HOST}`);
  console.log(`   Bundle ID: ${APNS_BUNDLE_ID}`);
} else {
  console.warn('⚠️ APNs not configured - iOS push notifications will not work');
  console.warn('   Required: APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY');
}
