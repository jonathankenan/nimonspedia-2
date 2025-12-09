/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications
// This runs in the background and handles push notifications

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] ===== PUSH EVENT RECEIVED =====');
  console.log('[SW] Event:', event);
  console.log('[SW] Has data:', !!event.data);

  if (!event.data) {
    console.log('[SW] No data in push event - showing default notification');
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'You have a new notification',
        icon: '/assets/images/logo.png',
        requireInteraction: true
      })
    );
    return;
  }

  let data;
  try {
    const rawData = event.data.text();
    console.log('[SW] Raw push data:', rawData);
    data = JSON.parse(rawData);
    console.log('[SW] Parsed data:', data);
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    event.waitUntil(
      self.registration.showNotification('Parse Error', {
        body: 'Failed to parse notification data',
        icon: '/assets/images/logo.png'
      })
    );
    return;
  }

  const title = data.title || 'New Notification';
  const body = data.body || '';
  const icon = data.icon || '/assets/images/logo.png';
  const badge = data.badge || '/assets/images/logo.png';
  const tag = data.tag || 'default';
  const notificationData = data.data || {};
  
  console.log('[SW] Showing notification:', title);

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    data: notificationData,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    silent: false
  };

  console.log('[SW] Notification options:', options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] ✅ Notification shown successfully');
        console.log('[SW] Title:', title);
        console.log('[SW] Body:', body);
      })
      .catch(err => {
        console.error('[SW] ❌ Failed to show notification:', err);
        console.error('[SW] Error details:', err.message, err.stack);
      })
  );
});

// Notification click event - handle when user clicks notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();

  const data = event.notification.data;
  const urlToOpen = data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});
