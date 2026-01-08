// Debug APNs credentials
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;

console.log('=== APNs Credentials Debug ===');
console.log('');
console.log('APNS_KEY_ID length:', APNS_KEY_ID?.length);
console.log('APNS_KEY_ID value:', APNS_KEY_ID);
console.log('');
console.log('APNS_TEAM_ID length:', APNS_TEAM_ID?.length);
console.log('APNS_TEAM_ID value:', APNS_TEAM_ID);
console.log('');
console.log('APNS_AUTH_KEY length:', APNS_AUTH_KEY?.length);
console.log('APNS_AUTH_KEY starts with:', APNS_AUTH_KEY?.substring(0, 50));
console.log('APNS_AUTH_KEY ends with:', APNS_AUTH_KEY?.substring(APNS_AUTH_KEY.length - 50));
console.log('');
console.log('Has BEGIN PRIVATE KEY:', APNS_AUTH_KEY?.includes('BEGIN PRIVATE KEY'));
console.log('Has END PRIVATE KEY:', APNS_AUTH_KEY?.includes('END PRIVATE KEY'));
console.log('Has literal \\n:', APNS_AUTH_KEY?.includes('\\n'));
console.log('Has actual newlines:', APNS_AUTH_KEY?.includes('\n'));
