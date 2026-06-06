import { NextRequest, NextResponse } from "next/server";

// Firebase Admin SDK initialization for server-side FCM
// Uses the FIREBASE_SERVICE_ACCOUNT env variable or application default credentials
let adminApp: any = null;
let adminMessaging: any = null;

async function getAdminMessaging() {
  if (adminMessaging) return adminMessaging;

  try {
    const admin = await import("firebase-admin");
    const { getApps, initializeApp, cert } = admin;

    if (getApps().length === 0) {
      // Try to initialize with service account from environment variable
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (serviceAccountStr) {
        const serviceAccount = JSON.parse(serviceAccountStr);
        initializeApp({
          credential: cert(serviceAccount),
          databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
        });
      } else {
        // Use application default credentials (works in Cloud Run, Cloud Functions, etc.)
        initializeApp({
          databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
        });
      }
    }

    adminMessaging = admin.getMessaging();
    return adminMessaging;
  } catch (error) {
    console.error("[FCM Admin] Initialization error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens, title, message, type, data, uid } = body;

    // Validate required fields
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: "tokens array is required" },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    const messaging = await getAdminMessaging();
    if (!messaging) {
      return NextResponse.json(
        { error: "Firebase Admin not initialized. Set FIREBASE_SERVICE_ACCOUNT env variable." },
        { status: 500 }
      );
    }

    // Build the FCM message
    const notification = {
      title,
      body: message,
    };

    // Android-specific config
    const android = {
      notification: {
        title,
        body: message,
        icon: "ic_stat_icon_config_sample",
        color: "#1B7A3D",
        sound: "default",
        tag: `applenet-${type || "general"}`,
        clickAction: "FCM_NOTIFICATION_CLICK",
        channelId: "applenet_notifications",
        defaultSound: true,
        defaultVibrateTimings: true,
        notificationCount: 1,
      },
      priority: "high" as const,
      data: {
        ...(data || {}),
        type: type || "general",
        click_action: "FCM_NOTIFICATION_CLICK",
      },
    };

    // Web-specific config
    const webpush = {
      notification: {
        title,
        body: message,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        dir: "rtl" as const,
        lang: "ar",
        vibrate: [100, 50, 100],
        tag: `applenet-${type || "general"}`,
        requireInteraction: false,
        actions: [
          { action: "open", title: "فتح التطبيق" },
          { action: "dismiss", title: "إغلاق" },
        ],
      },
      fcmOptions: {
        link: "/",
      },
    };

    // APNS (iOS) config
    const apns = {
      payload: {
        aps: {
          alert: {
            title,
            body: message,
          },
          sound: "default",
          badge: 1,
          "content-available": 1,
        },
      },
    };

    // Send multicast message
    const message_payload = {
      notification,
      android,
      webpush,
      apns,
      data: {
        ...(data || {}),
        type: type || "general",
        title,
        message,
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message_payload);

    console.log(`[FCM] Sent ${response.successCount}/${tokens.length} notifications successfully`);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses?.map((r: any) => ({
        success: r.success,
        error: r.error?.message || null,
      })),
    });
  } catch (error: any) {
    console.error("[FCM] Send notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
