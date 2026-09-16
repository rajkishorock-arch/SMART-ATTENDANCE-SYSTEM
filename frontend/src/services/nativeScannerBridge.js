/**
 * Native Scanner Bridge (Capacitor Android / iOS)
 * 
 * Bridges high-performance native CameraX and on-device TFLite/ONNX scanning
 * when running inside an Android/iOS APK, while automatically falling back to
 * Web MediaPipe/WebRTC when running in browser.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

// Attempt to resolve registered native plugin FastFaceScanner
const FastFaceScannerNative = registerPlugin('FastFaceScanner');

class NativeScannerBridge {
  constructor() {
    this._isNative = Capacitor.isNativePlatform();
    this._pluginAvailable = false;
    this._initCheck();
  }

  async _initCheck() {
    if (this._isNative && FastFaceScannerNative) {
      try {
        const res = await FastFaceScannerNative.isAvailable();
        this._pluginAvailable = !!(res && res.available);
      } catch {
        this._pluginAvailable = false;
      }
    }
  }

  isNativeAvailable() {
    return this._isNative && this._pluginAvailable;
  }

  /**
   * Start native CameraX 60 FPS scanner preview with hardware AE/AF lock
   */
  async startScanner(options = {}) {
    if (this.isNativeAvailable()) {
      try {
        return await FastFaceScannerNative.startScanner({
          targetFps: options.targetFps || 60,
          resolution: options.resolution || '640x480',
          institutionId: options.institutionId || 1,
          confidenceThreshold: options.confidenceThreshold || 0.50
        });
      } catch (err) {
        console.warn('[NativeScannerBridge] Native start failed, falling back to Web:', err);
        return { success: false, fallbackToWeb: true };
      }
    }
    return { success: false, fallbackToWeb: true };
  }

  /**
   * Stop native scanner preview
   */
  async stopScanner() {
    if (this.isNativeAvailable()) {
      try {
        return await FastFaceScannerNative.stopScanner();
      } catch (err) {
        console.warn('[NativeScannerBridge] Native stop error:', err);
      }
    }
    return { success: true };
  }

  /**
   * Send pre-cached embeddings into native C++/Java memory matrix
   */
  async syncEmbeddings(embeddingsList) {
    if (this.isNativeAvailable()) {
      try {
        return await FastFaceScannerNative.syncEmbeddings({
          embeddings: embeddingsList
        });
      } catch (err) {
        console.warn('[NativeScannerBridge] Embeddings sync to native failed:', err);
      }
    }
    return { success: false };
  }

  /**
   * Listen for native face match events
   */
  addListener(eventName, callback) {
    if (this.isNativeAvailable()) {
      return FastFaceScannerNative.addListener(eventName, callback);
    }
    return { remove: () => {} };
  }
}

export const nativeScannerBridge = new NativeScannerBridge();
