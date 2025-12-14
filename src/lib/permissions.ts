// Android permissions management utilities for Capacitor
import { Camera, CameraResultType, CameraSource, PermissionStatus } from '@capacitor/camera';

export type PermissionType = 'camera' | 'photos' | 'storage';

export interface PermissionResult {
  granted: boolean;
  denied: boolean;
  permanentlyDenied: boolean;
  canRequest: boolean;
}

export interface PermissionsState {
  camera: PermissionResult;
  photos: PermissionResult;
  storage: PermissionResult;
}

/**
 * Check current permission status without requesting
 */
export async function checkPermissions(): Promise<PermissionsState> {
  const defaultResult: PermissionResult = {
    granted: false,
    denied: false,
    permanentlyDenied: false,
    canRequest: true
  };

  try {
    // Check Capacitor Camera permissions (includes camera and photos)
    const cameraPermissions = await Camera.checkPermissions();
    
    return {
      camera: mapCapacitorPermission(cameraPermissions.camera),
      photos: mapCapacitorPermission(cameraPermissions.photos),
      storage: await checkStoragePermission()
    };
  } catch (error) {
    console.log('Capacitor not available, using web fallback');
    // Web fallback
    return {
      camera: await checkWebCameraPermission(),
      photos: { ...defaultResult, granted: true }, // Web doesn't need photo library permission
      storage: { ...defaultResult, granted: 'indexedDB' in window }
    };
  }
}

/**
 * Map Capacitor permission status to our format
 */
function mapCapacitorPermission(status: string): PermissionResult {
  switch (status) {
    case 'granted':
      return {
        granted: true,
        denied: false,
        permanentlyDenied: false,
        canRequest: false
      };
    case 'denied':
      return {
        granted: false,
        denied: true,
        permanentlyDenied: false,
        canRequest: true
      };
    case 'prompt':
    case 'prompt-with-rationale':
      return {
        granted: false,
        denied: false,
        permanentlyDenied: false,
        canRequest: true
      };
    case 'limited':
      return {
        granted: true,
        denied: false,
        permanentlyDenied: false,
        canRequest: false
      };
    default:
      return {
        granted: false,
        denied: false,
        permanentlyDenied: false,
        canRequest: true
      };
  }
}

/**
 * Check web camera permission using Permissions API
 */
async function checkWebCameraPermission(): Promise<PermissionResult> {
  try {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return {
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        permanentlyDenied: result.state === 'denied',
        canRequest: result.state === 'prompt'
      };
    }
  } catch {
    // Fallback
  }
  return {
    granted: false,
    denied: false,
    permanentlyDenied: false,
    canRequest: true
  };
}

/**
 * Check storage permission (IndexedDB for web, actual storage for Android)
 */
async function checkStoragePermission(): Promise<PermissionResult> {
  // For Android 10+ (API 29+), scoped storage is used and no runtime permission needed
  // For older versions, READ_EXTERNAL_STORAGE is handled by Camera plugin for photos
  
  // Check IndexedDB availability as primary storage
  const hasIndexedDB = 'indexedDB' in window;
  
  return {
    granted: hasIndexedDB,
    denied: !hasIndexedDB,
    permanentlyDenied: false,
    canRequest: false
  };
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  try {
    // Try Capacitor first
    const result = await Camera.requestPermissions({ permissions: ['camera'] });
    const status = mapCapacitorPermission(result.camera);
    
    // If denied on Android, it might be permanently denied
    if (status.denied) {
      // Check if we should show rationale (only works on Android)
      const checkAgain = await Camera.checkPermissions();
      if (checkAgain.camera === 'denied') {
        return {
          ...status,
          permanentlyDenied: true,
          canRequest: false
        };
      }
    }
    
    return status;
  } catch (error) {
    console.log('Using web camera permission request');
    // Web fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return {
        granted: true,
        denied: false,
        permanentlyDenied: false,
        canRequest: false
      };
    } catch (err: any) {
      const isPermanentlyDenied = err.name === 'NotAllowedError';
      return {
        granted: false,
        denied: true,
        permanentlyDenied: isPermanentlyDenied,
        canRequest: !isPermanentlyDenied
      };
    }
  }
}

/**
 * Request photo library permission
 */
export async function requestPhotosPermission(): Promise<PermissionResult> {
  try {
    const result = await Camera.requestPermissions({ permissions: ['photos'] });
    const status = mapCapacitorPermission(result.photos);
    
    if (status.denied) {
      const checkAgain = await Camera.checkPermissions();
      if (checkAgain.photos === 'denied') {
        return {
          ...status,
          permanentlyDenied: true,
          canRequest: false
        };
      }
    }
    
    return status;
  } catch {
    // Web doesn't need photo library permission
    return {
      granted: true,
      denied: false,
      permanentlyDenied: false,
      canRequest: false
    };
  }
}

/**
 * Request all necessary permissions
 */
export async function requestAllPermissions(): Promise<PermissionsState> {
  const camera = await requestCameraPermission();
  const photos = await requestPhotosPermission();
  const storage = await checkStoragePermission();
  
  return { camera, photos, storage };
}

/**
 * Open app settings page
 * This guides the user to manually enable permissions if permanently denied
 */
export function openAppSettings(): void {
  // For web, show instructions
  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  
  let instructions = '';
  
  if (isAndroid) {
    instructions = `Pour autoriser les permissions :

1. Ouvrez les Paramètres de votre téléphone
2. Appuyez sur "Applications" ou "Gestionnaire d'applications"
3. Recherchez et sélectionnez "DocSafe"
4. Appuyez sur "Autorisations"
5. Activez les permissions nécessaires :
   • Caméra
   • Photos et médias (ou Stockage)
6. Revenez dans l'application

Android ${getAndroidVersion() || ''} détecté`;
  } else if (isIOS) {
    instructions = `Pour autoriser les permissions :

1. Ouvrez l'app Réglages
2. Faites défiler et sélectionnez "DocSafe"
3. Activez les permissions nécessaires :
   • Appareil photo
   • Photos
4. Revenez dans l'application`;
  } else {
    instructions = `Pour autoriser les permissions :

1. Cliquez sur l'icône de cadenas dans la barre d'adresse
2. Recherchez les paramètres de permissions
3. Autorisez l'accès à la caméra
4. Rechargez la page`;
  }
  
  alert(instructions);
}

/**
 * Detect Android version from user agent
 */
function getAndroidVersion(): string | null {
  const match = navigator.userAgent.match(/Android\s+([\d.]+)/);
  return match ? match[1] : null;
}

/**
 * Get permission explanation for a specific permission type
 */
export function getPermissionExplanation(type: PermissionType): string {
  switch (type) {
    case 'camera':
      return 'La caméra est nécessaire pour scanner vos documents et lire les codes QR.';
    case 'photos':
      return 'L\'accès aux photos permet d\'importer des documents depuis votre galerie.';
    case 'storage':
      return 'Le stockage local permet de sauvegarder vos documents de manière sécurisée sur votre appareil.';
    default:
      return '';
  }
}

/**
 * Check if running on native platform
 */
export function isNativePlatform(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): 'android' | 'ios' | 'web' {
  if (typeof (window as any).Capacitor !== 'undefined') {
    const platform = (window as any).Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }
  return 'web';
}
