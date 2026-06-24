import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';
export const DEFAULT_API_BASE_URL = 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

// Dynamic API base URL resolver.
// If VITE_API_BASE_URL is specified in env, it uses it.
// If running on a native device/emulator, it uses the production URL (Render)
// unless customized via a developer mode setting in localStorage.
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  const devUrl = localStorage.getItem('dev_api_base_url');
  if (devUrl) return devUrl;

  // Default production server
  return DEFAULT_API_BASE_URL;
}

// Request camera and location permissions natively via Capacitor plugins.
// This ensures that Android system permissions are granted, which also unblocks the WebView camera & GPS.
export async function requestNativePermissions() {
  if (!isNative) return { camera: 'granted', location: 'granted' };
  
  let cameraStatus = 'prompt';
  let locationStatus = 'prompt';

  try {
    const { Camera } = await import('@capacitor/camera');
    const cam = await Camera.checkPermissions();
    cameraStatus = cam.camera;
    if (cameraStatus !== 'granted') {
      const reqCam = await Camera.requestPermissions({ permissions: ['camera'] });
      cameraStatus = reqCam.camera;
    }
  } catch (e) {
    console.warn("Camera permissions request failed", e);
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const loc = await Geolocation.checkPermissions();
    locationStatus = loc.location;
    if (locationStatus !== 'granted') {
      const reqLoc = await Geolocation.requestPermissions({ permissions: ['location'] });
      locationStatus = reqLoc.location;
    }
  } catch (e) {
    console.warn("Location permissions request failed", e);
  }

  return { camera: cameraStatus, location: locationStatus };
}

// Open native camera UI to capture base64 photo on mobile/native platform
export async function takeNativePhoto() {
  if (!isNative) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera
    });
    return `data:image/jpeg;base64,${image.base64String}`;
  } catch (e) {
    console.error("Failed to capture native photo:", e);
    return null;
  }
}
