import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n🔐 VAPID Keys Generated Successfully!\n');
console.log('Add these to your environment variables (Secrets in Replit):\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=[REDACTED - Check your environment secrets]');
console.log('\n⚠️  IMPORTANT:');
console.log('1. Keep the private key secret - never commit it to git');
console.log('2. Add both keys to your Replit Secrets');
console.log('3. After adding secrets, restart your application');
console.log('4. Existing push subscriptions will need to re-subscribe with new keys\n');
