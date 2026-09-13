/**
 * Push Notification Service (Capacitor FCM & Web Push Integration)
 * Handles client-side push token registration, notification channel setup,
 * foreground notification alerts, and deep-link routing.
 */
import { PushNotifications } from '@capacitor/push-notifications';
import { getApiBaseUrl, isNative } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export async function setupAndroidNotificationChannels() {
  if (!isNative) return;

  try {
    const channels = [
      {
        id: 'attendance',
        name: 'Attendance Updates',
        description: 'Instant alerts when attendance is marked or missed',
        importance: 5, // High
        visibility: 1, // Public
        vibration: true,
        sound: 'default'
      },
      {
        id: 'class_reminders',
        name: 'Class & Timetable Reminders',
        description: 'Upcoming session and schedule change alerts',
        importance: 3, // Default
        visibility: 1,
        vibration: true,
        sound: 'default'
      },
      {
        id: 'leave_and_disputes',
        name: 'Leaves & Dispute Corrections',
        description: 'Status updates for leave applications and attendance disputes',
        importance: 4, // High
        visibility: 1,
        vibration: true,
        sound: 'default'
      },
      {
        id: 'low_attendance',
        name: 'Low Attendance Warnings',
        description: 'Critical alerts when attendance drops below threshold',
        importance: 5, // High
        visibility: 1,
        vibration: true,
        sound: 'default'
      },
      {
        id: 'system_and_security',
        name: 'System & Security Alerts',
        description: 'Device status, proxy detection, and account security alerts',
        importance: 5, // High
        visibility: 1,
        vibration: true,
        sound: 'default'
      },
      {
        id: 'promotional',
        name: 'Campus News & Events',
        description: 'General campus updates and announcements (Opt-in)',
        importance: 2, // Low
        visibility: 0,
        vibration: false
      }
    ];

    for (const channel of channels) {
      await PushNotifications.createChannel(channel);
    }
    console.info('[PushService] Android Notification Channels successfully configured.');
  } catch (err) {
    console.warn('[PushService] Failed to create Android notification channels:', err);
  }
}

export async function registerBackendPushToken(token, userEmail, userRole, pushToken, platform = 'android') {
  if (!token || !pushToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/register-device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        push_token: pushToken,
        platform: platform,
        user_email: userEmail,
        role: userRole
      })
    });
    if (res.ok) {
      console.info('[PushService] Push token registered with backend successfully.');
      return true;
    }
  } catch (err) {
    console.warn('[PushService] Failed to register push token with backend:', err);
  }
  return false;
}

export async function initializePushNotifications(token, currentUser, onNotificationTap = null) {
  if (!token || !currentUser) return;

  if (isNative) {
    try {

      await setupAndroidNotificationChannels();

      // Request notification permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        await PushNotifications.register();

        // Listen for token registration
        PushNotifications.addListener('registration', async (tokenObj) => {
          console.info('[PushService] FCM Push Token acquired:', tokenObj.value);
          await registerBackendPushToken(token, currentUser.email, currentUser.role, tokenObj.value, 'android');
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('[PushService] FCM Push Token registration error:', err);
        });

        // Listen for foreground notification arrival
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.info('[PushService] Push notification received in foreground:', notification);
        });

        // Listen for notification action tap (Deep Linking)
        PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
          const data = notificationAction.notification.data || {};
          console.info('[PushService] Push notification tapped:', data);
          if (onNotificationTap) {
            onNotificationTap(data);
          }
        });
      } else {
        console.warn('[PushService] Push notification permission denied by user.');
      }
    } catch (err) {
      console.warn('[PushService] PushNotification initialization error:', err);
    }
  } else {
    // Web / Browser environment fallback
    console.info('[PushService] Web environment active. Real-time polling & WebSocket active for notifications.');
  }
}
