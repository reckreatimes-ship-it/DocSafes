// Android permissions management utilities for Capacitor
import { Camera, CameraResultType, CameraSource, PermissionStatus } from '@capacitor/camera';

export type PermissionType = 'camera' | 'photos' | 'storage' | 'biometrics';

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
  biometrics: PermissionResult;
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
      storage: await checkStoragePermission(),
      biometrics: await checkBiometricPermission()
    };
  } catch (error) {
    console.log('Capacitor not available, using web fallback');
    // Web fallback
    return {
      camera: await checkWebCameraPermission(),
      photos: { ...defaultResult, granted: true }, // Web doesn't need photo library permission
      storage: { ...defaultResult, granted: 'indexedDB' in window },
      biometrics: await checkBiometricPermission()
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
 * Check biometric permission and availability
 */
async function checkBiometricPermission(): Promise<PermissionResult> {
  try {
    // Check if WebAuthn/biometrics is available
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        granted: available,
        denied: !available,
        permanentlyDenied: false,
        canRequest: false // Biometrics is either available or not, no runtime permission needed
      };
    }
  } catch (error) {
    console.log('Biometric check error:', error);
  }
  
  return {
    granted: false,
    denied: true,
    permanentlyDenied: false,
    canRequest: false
  };
}

/**
 * Get biometric type available on device
 */
export async function getBiometricType(): Promise<'fingerprint' | 'faceId' | 'none'> {
  try {
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        // On iOS, check for Face ID vs Touch ID
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isIOS) {
          // iPhone X and later use Face ID, older use Touch ID
          const hasFaceID = window.screen.height >= 812 && window.devicePixelRatio >= 3;
          return hasFaceID ? 'faceId' : 'fingerprint';
        }
        // Android typically uses fingerprint
        return 'fingerprint';
      }
    }
  } catch (error) {
    console.log('Error detecting biometric type:', error);
  }
  return 'none';
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
  const biometrics = await checkBiometricPermission();
  
  return { camera, photos, storage, biometrics };
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
   • Biométrie (empreinte/visage)
6. Revenez dans l'application

Pour la biométrie :
• Assurez-vous d'avoir configuré une empreinte ou Face unlock dans les paramètres de sécurité de votre téléphone

Android ${getAndroidVersion() || ''} détecté`;
  } else if (isIOS) {
    instructions = `Pour autoriser les permissions :

1. Ouvrez l'app Réglages
2. Faites défiler et sélectionnez "DocSafe"
3. Activez les permissions nécessaires :
   • Appareil photo
   • Photos
   • Face ID ou Touch ID
4. Revenez dans l'application

Pour la biométrie :
• Assurez-vous que Face ID ou Touch ID est configuré dans Réglages > Face ID et code`;
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
    case 'biometrics':
      return 'L\'authentification biométrique (empreinte digitale ou reconnaissance faciale) permet de déverrouiller l\'application de manière sécurisée et rapide.';
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
