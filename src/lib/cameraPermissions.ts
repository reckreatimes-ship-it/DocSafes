/**
 * Camera Permission Manager for Capacitor Android
 * 
 * This module solves the SecurityException issue when using WebRTC (getUserMedia)
 * in a Capacitor WebView on Android.
 * 
 * Root Cause: The WebView requires BOTH:
 * 1. Android runtime permission (via Capacitor Camera plugin)
 * 2. WebView permission grant (via WebChromeClient.onPermissionRequest)
 * 
 * This manager ensures proper sequencing and prevents concurrent permission requests.
 */

import { Capacitor } from '@capacitor/core';

export interface CameraPermissionState {
  granted: boolean;
  denied: boolean;
  permanentlyDenied: boolean;
  error?: string;
}

// Permission request lock to prevent concurrent requests
let permissionRequestInProgress = false;
let permissionRequestPromise: Promise<CameraPermissionState> | null = null;

/**
 * Check if we're running on native Android platform
 */
export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Check if we're running on any native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): 'android' | 'ios' | 'web' {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as 'android' | 'ios';
  }
  return 'web';
}

/**
 * Check Android camera permission status without requesting
 * Uses Capacitor Camera plugin
 */
export async function checkCameraPermission(): Promise<CameraPermissionState> {
  try {
    if (!isNativePlatform()) {
      // Web: use Permissions API
      return await checkWebCameraPermission();
    }

    const { Camera } = await import('@capacitor/camera');
    const status = await Camera.checkPermissions();
    
    return {
      granted: status.camera === 'granted',
      denied: status.camera === 'denied',
      permanentlyDenied: false // Can't detect this without requesting
    };
  } catch (error) {
    console.error('[CameraPermissions] Check failed:', error);
    return { granted: false, denied: false, permanentlyDenied: false };
  }
}

/**
 * Check web camera permission using Permissions API
 */
async function checkWebCameraPermission(): Promise<CameraPermissionState> {
  try {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return {
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        permanentlyDenied: result.state === 'denied'
      };
    }
  } catch (e) {
    // Fallback: permission API not supported
  }
  
  return { granted: false, denied: false, permanentlyDenied: false };
}

/**
 * Request camera permission with proper sequencing
 * Ensures only one request is active at a time
 * 
 * CRITICAL: This function MUST be called and awaited BEFORE starting getUserMedia
 */
export async function requestCameraPermission(): Promise<CameraPermissionState> {
  // If a request is already in progress, wait for it
  if (permissionRequestInProgress && permissionRequestPromise) {
    console.log('[CameraPermissions] Request already in progress, waiting...');
    return permissionRequestPromise;
  }

  permissionRequestInProgress = true;
  
  permissionRequestPromise = (async () => {
    try {
      console.log('[CameraPermissions] Starting permission request...');
      
      if (!isNativePlatform()) {
        // Web: request via getUserMedia and immediately stop
        return await requestWebCameraPermission();
      }

      // Native: Use Capacitor Camera plugin
      const { Camera } = await import('@capacitor/camera');
      
      // Step 1: Check current status
      const currentStatus = await Camera.checkPermissions();
      console.log('[CameraPermissions] Current status:', currentStatus.camera);
      
      if (currentStatus.camera === 'granted') {
        return { granted: true, denied: false, permanentlyDenied: false };
      }

      // Step 2: Request permission
      console.log('[CameraPermissions] Requesting camera permission...');
      const result = await Camera.requestPermissions({ permissions: ['camera'] });
      console.log('[CameraPermissions] Request result:', result.camera);

      if (result.camera === 'granted') {
        // Wait a brief moment for the permission to propagate to WebView
        await new Promise(resolve => setTimeout(resolve, 100));
        return { granted: true, denied: false, permanentlyDenied: false };
      }

      // Check if permanently denied
      if (result.camera === 'denied') {
        // Re-check to determine if permanently denied
        const recheck = await Camera.checkPermissions();
        const isPermanent = recheck.camera === 'denied';
        
        return {
          granted: false,
          denied: true,
          permanentlyDenied: isPermanent,
          error: isPermanent 
            ? 'Permission définitivement refusée. Veuillez l\'activer dans les paramètres.'
            : 'Permission refusée.'
        };
      }

      return { granted: false, denied: true, permanentlyDenied: false };
      
    } catch (error: any) {
      console.error('[CameraPermissions] Request failed:', error);
      return {
        granted: false,
        denied: true,
        permanentlyDenied: false,
        error: error.message || 'Erreur lors de la demande de permission'
      };
    } finally {
      permissionRequestInProgress = false;
      permissionRequestPromise = null;
    }
  })();

  return permissionRequestPromise;
}

/**
 * Request web camera permission
 */
async function requestWebCameraPermission(): Promise<CameraPermissionState> {
  try {
    // Request camera access briefly to trigger permission prompt
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }
    });
    
    // Immediately stop all tracks
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true, denied: false, permanentlyDenied: false };
  } catch (error: any) {
    console.error('[CameraPermissions] Web request failed:', error);
    
    const isPermanentlyDenied = error.name === 'NotAllowedError';
    
    return {
      granted: false,
      denied: true,
      permanentlyDenied: isPermanentlyDenied,
      error: isPermanentlyDenied 
        ? 'Permission refusée. Veuillez l\'activer dans les paramètres du navigateur.'
        : error.name === 'NotFoundError'
          ? 'Aucune caméra détectée.'
          : 'Erreur lors de l\'accès à la caméra.'
    };
  }
}

/**
 * Wait for camera to be fully ready after permission grant
 * This ensures the WebView has properly registered the permission
 */
export async function waitForCameraReady(maxWaitMs: number = 3000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Try to access camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        // Permission not yet propagated, wait and retry
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        // Other error (e.g., NotFoundError), stop waiting
        console.error('[CameraPermissions] Camera not ready:', error);
        return false;
      }
    }
  }
  
  console.warn('[CameraPermissions] Timeout waiting for camera');
  return false;
}

/**
 * Full camera initialization flow for scanner
 * Call this before starting any WebRTC camera stream
 */
export async function initializeCameraForScanner(): Promise<{
  success: boolean;
  error?: string;
  permanentlyDenied?: boolean;
}> {
  console.log('[CameraPermissions] Initializing camera for scanner...');
  
  // Step 1: Request native permission
  const permissionResult = await requestCameraPermission();
  
  if (!permissionResult.granted) {
    return {
      success: false,
      error: permissionResult.error || 'Permission caméra refusée',
      permanentlyDenied: permissionResult.permanentlyDenied
    };
  }

  // Step 2: Wait for camera to be accessible in WebView
  if (isNativePlatform()) {
    console.log('[CameraPermissions] Waiting for WebView camera access...');
    const cameraReady = await waitForCameraReady(3000);
    
    if (!cameraReady) {
      return {
        success: false,
        error: 'La caméra n\'est pas accessible. Veuillez redémarrer l\'application.',
        permanentlyDenied: false
      };
    }
  }
  
  console.log('[CameraPermissions] Camera ready!');
  return { success: true };
}

/**
 * Open app settings for manual permission management
 */
export function openAppSettings(): void {
  const platform = getPlatform();
  
  let instructions = '';
  
  if (platform === 'android') {
    instructions = `Pour autoriser la caméra :

1. Ouvrez les Paramètres de votre téléphone
2. Appuyez sur "Applications" ou "Gestionnaire d'applications"
3. Recherchez et sélectionnez "DocSafe"
4. Appuyez sur "Autorisations"
5. Activez "Caméra"
6. Revenez dans l'application`;
  } else if (platform === 'ios') {
    instructions = `Pour autoriser la caméra :

1. Ouvrez l'app Réglages
2. Faites défiler et sélectionnez "DocSafe"
3. Activez "Appareil photo"
4. Revenez dans l'application`;
  } else {
    instructions = `Pour autoriser la caméra :

1. Cliquez sur l'icône de cadenas dans la barre d'adresse
2. Recherchez les paramètres de caméra
3. Autorisez l'accès à la caméra
4. Rechargez la page`;
  }
  
  alert(instructions);
}
