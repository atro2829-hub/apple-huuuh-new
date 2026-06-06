// FCM (Firebase Cloud Messaging) Integration for Apple.NET
// Handles token registration, foreground messages, and notification display
// Supports both web FCM and Capacitor native push notifications

import { getFCMMessaging, db } from "./firebase";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { ref, set, remove, get, onValue } from "firebase/database";
import { vibrateDevice, playNotificationSound } from "./notifications";

// VAPID key - This needs to be obtained from Firebase Console:
// Project Settings > Cloud Messaging > Web Push certificates > Generate or copy key pair
// The admin can set this from the admin panel settings tab
const VAPID_KEY_STORAGE = "applenet_vapid_key";

/**
 * Get the VAPID key from localStorage or default
 */
export function getVapidKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VAPID_KEY_STORAGE) || "";
}

/**
 * Set the VAPID key (called from admin settings)
 */
export function setVapidKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VAPID_KEY_STORAGE, key);
}

/**
 * Check if we're running inside Capacitor native app
 */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Dynamically load Capacitor PushNotifications plugin
 * Returns null if not available (browser environment)
 */
async function getCapacitorPushNotifications(): Promise<any | null> {
  if (!isCapacitorNative()) return null;
  try {
    // Use require-style dynamic import that won't be resolved at build time
    const mod = await import(/* webpackIgnore: true */ "@capacitor/push-notifications");
    return mod.PushNotifications;
  } catch {
    return null;
  }
}

/**
 * Dynamically load Capacitor Haptics plugin
 */
async function getCapacitorHaptics(): Promise<any | null> {
  if (!isCapacitorNative()) return null;
  try {
    const mod = await import(/* webpackIgnore: true */ "@capacitor/haptics");
    return mod.Haptics;
  } catch {
    return null;
  }
}

/**
 * Dynamically load Capacitor LocalNotifications plugin
 */
async function getCapacitorLocalNotifications(): Promise<any | null> {
  if (!isCapacitorNative()) return null;
  try {
    const mod = await import(/* webpackIgnore: true */ "@capacitor/local-notifications");
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

/**
 * Initialize Capacitor Push Notifications for Android/iOS
 * This uses the native FCM token instead of the web VAPID approach
 */
async function initCapacitorPushNotifications(uid: string): Promise<string | null> {
  try {
    const PushNotifications = await getCapacitorPushNotifications();
    if (!PushNotifications) return null;

    const Haptics = await getCapacitorHaptics();

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") {
      console.log("[FCM-Capacitor] Push permission not granted");
      return null;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration token
    return new Promise((resolve) => {
      let resolved = false;

      PushNotifications.addListener("registration", async (token: any) => {
        console.log("[FCM-Capacitor] Token received:", token.value.substring(0, 20) + "...");

        // Store token in Firebase RTDB
        await set(ref(db, `fcmTokens/${uid}`), {
          token: token.value,
          updatedAt: Date.now(),
          platform: "android",
        });

        if (!resolved) {
          resolved = true;
          resolve(token.value);
        }
      });

      PushNotifications.addListener("registrationError", (error: any) => {
        console.error("[FCM-Capacitor] Registration error:", error);
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      });

      // Listen for foreground push notifications
      PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
        console.log("[FCM-Capacitor] Push received in foreground:", notification);

        // Vibrate
        if (Haptics) {
          try { Haptics.vibrate({ duration: 100 }); } catch {}
        }
        vibrateDevice([100, 50, 100]);

        // Play sound
        try { playNotificationSound(); } catch {}

        // Show a local notification since foreground pushes aren't shown automatically
        if (notification.title || notification.body) {
          showForegroundNotification({
            title: notification.title || "Apple.NET",
            body: notification.body || "لديك إشعار جديد",
            data: notification.data as Record<string, string> | undefined,
          });
        }
      });

      // Handle notification click
      PushNotifications.addListener("pushNotificationActionPerformed", (action: any) => {
        console.log("[FCM-Capacitor] Push action performed:", action);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 10000);
    });
  } catch (error) {
    console.log("[FCM-Capacitor] Error:", (error as Error).message);
    return null;
  }
}

/**
 * Register FCM token for the current user
 * Stores the token in Firebase RTDB under fcmTokens/{uid}
 * Works for both web and Capacitor native platforms
 */
export async function registerFCMToken(uid: string): Promise<string | null> {
  try {
    // Try Capacitor native first (for Android/iOS)
    if (isCapacitorNative()) {
      const capacitorToken = await initCapacitorPushNotifications(uid);
      if (capacitorToken) return capacitorToken;
    }

    // Fallback to web FCM
    const messaging = await getFCMMessaging();
    if (!messaging) {
      console.log("[FCM] Messaging not supported in this environment");
      return null;
    }

    // Try to get VAPID key
    let vapidKey = getVapidKey();
    if (!vapidKey) {
      console.log("[FCM] No VAPID key configured, trying to load from database");
      try {
        const vapidSnap = await get(ref(db, "settings/fcmVapidKey"));
        if (vapidSnap.exists() && vapidSnap.val()) {
          vapidKey = vapidSnap.val();
          setVapidKey(vapidKey);
        } else {
          console.log("[FCM] No VAPID key in database either. Web push disabled.");
          return null;
        }
      } catch {
        return null;
      }
    }

    // Request notification permission first
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Notification permission not granted");
      return null;
    }

    // Get FCM token
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (currentToken) {
      // Store token in Firebase RTDB
      await set(ref(db, `fcmTokens/${uid}`), {
        token: currentToken,
        updatedAt: Date.now(),
        platform: isCapacitorNative() ? "android" : "web",
      });
      console.log("[FCM] Token registered successfully");
      return currentToken;
    } else {
      console.log("[FCM] No registration token available");
      return null;
    }
  } catch (error) {
    console.error("[FCM] Token registration error:", error);
    return null;
  }
}

/**
 * Unregister FCM token (on logout)
 */
export async function unregisterFCMToken(uid: string): Promise<void> {
  try {
    // Remove from RTDB
    await remove(ref(db, `fcmTokens/${uid}`));

    // Try Capacitor cleanup
    if (isCapacitorNative()) {
      const PushNotifications = await getCapacitorPushNotifications();
      if (PushNotifications) {
        PushNotifications.removeAllListeners();
      }
    }

    // Delete the web FCM token locally
    const messaging = await getFCMMessaging();
    if (messaging) {
      await deleteToken(messaging);
    }
    console.log("[FCM] Token unregistered");
  } catch (error) {
    console.error("[FCM] Token unregistration error:", error);
  }
}

/**
 * Listen for foreground FCM messages (web only)
 * Returns an unsubscribe function
 */
export function onForegroundMessage(
  callback: (payload: {
    notification?: { title?: string; body?: string; icon?: string };
    data?: Record<string, string>;
  }) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getFCMMessaging().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground message received:", payload);

        // Vibrate on notification receive
        vibrateDevice([100, 50, 100]);

        try { playNotificationSound(); } catch {}

        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Show a foreground notification (when app is in focus)
 * This is used because FCM foreground messages are NOT shown automatically
 */
export function showForegroundNotification(payload: {
  title?: string;
  body?: string;
  icon?: string;
  data?: Record<string, string>;
}): void {
  const title = payload.title || "Apple.NET";
  const body = payload.body || "لديك إشعار جديد";

  // Try Capacitor local notification first
  if (isCapacitorNative()) {
    getCapacitorLocalNotifications().then((LocalNotifications) => {
      if (LocalNotifications) {
        LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Date.now(),
            sound: "default",
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#1B7A3D",
            extra: payload.data || {},
          }],
        });
      }
    }).catch(() => {
      // Fall back to web notification
      showWebNotification(title, body, payload);
    });
    return;
  }

  // Web notification
  showWebNotification(title, body, payload);
}

function showWebNotification(
  title: string,
  body: string,
  payload: { icon?: string; data?: Record<string, string> }
): void {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      dir: "rtl",
      lang: "ar",
      vibrate: [100, 50, 100],
      tag: "applenet-fcm-" + Date.now(),
      data: payload.data || {},
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  }
}

/**
 * Initialize FCM for the current user
 * Call this after authentication
 */
export async function initFCM(uid: string): Promise<() => void> {
  // Register token
  await registerFCMToken(uid);

  // Set up foreground message listener (for web)
  let unsubForeground: (() => void) | null = null;

  if (!isCapacitorNative()) {
    unsubForeground = onForegroundMessage((payload) => {
      showForegroundNotification({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data,
      });
    });
  }

  // Listen for VAPID key changes from admin settings (web only)
  let vapidUnsub: (() => void) | null = null;
  if (!isCapacitorNative()) {
    vapidUnsub = onValue(ref(db, "settings/fcmVapidKey"), async (snap) => {
      const newKey = snap.val();
      if (newKey && newKey !== getVapidKey()) {
        setVapidKey(newKey);
        // Re-register token with new VAPID key
        await registerFCMToken(uid);
      }
    });
  }

  // Return cleanup function
  return () => {
    if (unsubForeground) unsubForeground();
    if (vapidUnsub) vapidUnsub();

    // Clean up Capacitor listeners
    if (isCapacitorNative()) {
      getCapacitorPushNotifications().then((PushNotifications) => {
        if (PushNotifications) {
          PushNotifications.removeAllListeners();
        }
      }).catch(() => {});
    }
  };
}

/**
 * Get all FCM tokens for a list of user UIDs
 * Used by the admin panel to send targeted notifications
 */
export async function getFCMTokensForUsers(uids: string[]): Promise<string[]> {
  const tokens: string[] = [];
  for (const uid of uids) {
    try {
      const snap = await get(ref(db, `fcmTokens/${uid}/token`));
      if (snap.exists() && snap.val()) {
        tokens.push(snap.val());
      }
    } catch {
      // Skip failed token lookups
    }
  }
  return tokens;
}

/**
 * Request notification permission and register token
 * Returns whether permission was granted
 */
export async function requestPermissionAndRegister(uid: string): Promise<boolean> {
  // For Capacitor native
  if (isCapacitorNative()) {
    const token = await registerFCMToken(uid);
    return !!token;
  }

  // For web
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const token = await registerFCMToken(uid);
  return !!token;
}
