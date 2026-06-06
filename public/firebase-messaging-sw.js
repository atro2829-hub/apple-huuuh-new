// Firebase Cloud Messaging Service Worker for Apple.NET
// This file MUST be at the root of the public directory for FCM to work
// It handles background notifications when the app is not in focus

importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDeQMrepTnlldqGycyMzy1qeoaD3g7nxgA",
  authDomain: "applenet711.firebaseapp.com",
  databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
  projectId: "applenet711",
  storageBucket: "applenet711.firebasestorage.app",
  messagingSenderId: "164323561264",
  appId: "1:164323561264:web:2000f0cc595b6d7260c2f5",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM-SW] Background message received:", payload);

  const title = payload.notification?.title || payload.data?.title || "Apple.NET";
  const body = payload.notification?.body || payload.data?.message || "لديك إشعار جديد";
  const type = payload.data?.type || "general";

  // Notification icon based on type
  const iconMap = {
    deposit_approved: "/icons/icon-192x192.png",
    deposit_rejected: "/icons/icon-192x192.png",
    card_purchased: "/icons/icon-192x192.png",
    gift_received: "/icons/icon-192x192.png",
    subscription: "/icons/icon-192x192.png",
    new_deposit_request: "/icons/icon-192x192.png",
    general: "/icons/icon-192x192.png",
  };

  const icon = iconMap[type as keyof typeof iconMap] || iconMap.general;

  // Show the notification
  return self.registration.showNotification(title, {
    body,
    icon,
    badge: "/icons/icon-72x72.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [100, 50, 100],
    tag: `applenet-fcm-${Date.now()}`,
    requireInteraction: false,
    data: {
      url: payload.data?.url || "/",
      type,
      ...payload.data,
    },
    actions: [
      { action: "open", title: "فتح التطبيق" },
      { action: "dismiss", title: "إغلاق" },
    ],
  });
});

// Handle notification click (from FCM background messages)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
