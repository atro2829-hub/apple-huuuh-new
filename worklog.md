---
Task ID: 1
Agent: Main Agent
Task: Implement FCM push notifications system for Apple.NET

Work Log:
- Updated src/lib/firebase.ts to add FCM messaging support with lazy initialization
- Created src/lib/fcm.ts with complete FCM integration (web + Capacitor native)
- Created src/app/api/send-notification/route.ts for server-side FCM push sending via firebase-admin
- Updated src/lib/notifications.ts with vibration, sound, and FCM helper functions
- Created public/firebase-messaging-sw.js for FCM background message handling
- Updated src/app/page.tsx to register FCM token on login and cleanup on logout
- Updated src/components/AdminPanel.tsx with enhanced notification tab (target selection, FCM push toggle, VAPID key settings, notification type)
- Updated src/components/NotificationCenter.tsx with vibration and sound on new notifications
- Updated Android project: added MyFirebaseMessagingService.java, firebase-messaging dependency, notification channel in AndroidManifest.xml, colors.xml
- Fixed next.config.ts to remove deprecated eslint option
- Verified project builds successfully with Next.js 16

Stage Summary:
- FCM push notifications system fully implemented for both web (PWA) and Android (Capacitor)
- Admin panel can send targeted or bulk notifications with optional FCM push
- FCM tokens stored in Firebase RTDB under fcmTokens/{uid}
- VAPID key configurable from admin panel settings
- Notification vibration and sound added for both web and Android
- Android project ready with FirebaseMessagingService and notification channel
- Build passes successfully
