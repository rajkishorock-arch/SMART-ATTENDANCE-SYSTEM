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
  const devUrl = localStorage.getItem('dev_api_base_url');
  if (devUrl) return devUrl;

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

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

// Save file natively in phone app cache and open share menu, or run browser download on Web
export async function saveAndShareFile(dataContent, filename, mimeType) {
  if (!isNative) {
    const blob = dataContent instanceof Blob ? dataContent : new Blob([dataContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    let base64Data;
    if (dataContent instanceof Blob) {
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(dataContent);
      });
    } else {
      base64Data = btoa(unescape(encodeURIComponent(dataContent)));
    }

    const fileResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: filename,
      url: fileResult.uri,
      dialogTitle: `Save ${filename}`,
    });

    return true;
  } catch (e) {
    console.error("Native file export failed:", e);
    alert("Export failed: " + e.message);
    return false;
  }
}
