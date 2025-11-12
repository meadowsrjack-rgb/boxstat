import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function sendTestNotification() {
  try {
    console.log('🔐 Logging in as admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ Login failed:', error);
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Logged in successfully');

    console.log('\n📤 Sending test push notification...');
    const notificationResponse = await fetch(`${BASE_URL}/api/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        title: '🏀 Test Push Notification',
        message: 'This is a test from the BoxStat push notification system! If you see this on your iPhone, push notifications are working! 🎉',
        type: 'announcement',
        deliveryChannels: ['in_app', 'push'],
        recipientType: 'users',
        recipientTarget: 'users',
        recipientUserIds: ['test-user-1761336712.772908']
      })
    });

    if (!notificationResponse.ok) {
      const error = await notificationResponse.text();
      console.error('❌ Notification send failed:', error);
      return;
    }

    const result = await notificationResponse.json();
    console.log('✅ Notification sent successfully!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendTestNotification();
