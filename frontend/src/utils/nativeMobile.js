import { isNative } from './platform';

const PUSH_TOKEN_KEY = 'smart_attendance_push_token';
const DEVICE_ID_KEY = 'smart_attendance_device_id';

export function getStableDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function getStoredPushToken() {
  return localStorage.getItem(PUSH_TOKEN_KEY) || '';
}

export async function triggerNativeHaptic(type = 'light') {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[type] || ImpactStyle.Light });
  } catch (e) {
    console.warn('Native haptic unavailable:', e);
  }
}

export async function initializePushNotifications(onToken) {
  if (!isNative) return { status: 'web' };
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      return { status: 'denied' };
    }

    await PushNotifications.addListener('registration', (token) => {
      localStorage.setItem(PUSH_TOKEN_KEY, token.value);
      if (onToken) onToken(token.value);
    });
    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('Push registration failed:', error);
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', () => {
      window.dispatchEvent(new CustomEvent('smart-attendance:notification-opened'));
    });
    await PushNotifications.register();
    return { status: 'registered' };
  } catch (e) {
    console.warn('Push notifications unavailable:', e);
    return { status: 'unavailable', error: String(e?.message || e) };
  }
}

export async function setupNativeResumeSync(syncCallback) {
  if (!isNative || !syncCallback) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) syncCallback();
    });
    return () => listener.remove();
  } catch (e) {
    console.warn('App resume listener unavailable:', e);
    return () => {};
  }
}
