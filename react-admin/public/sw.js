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
  console.log('[SW] Push received:', event);

  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    return;
  }

  const { title, body, icon, badge, tag, data: notificationData } = data;

  const options = {
    body,
    icon: icon || '/logo192.png',
    badge: badge || '/logo192.png',
    tag: tag || 'default',
    data: notificationData,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
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
