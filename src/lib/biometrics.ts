// Biometric authentication utilities using WebAuthn

export interface BiometricResult {
  available: boolean;
  biometryType: 'fingerprint' | 'faceId' | 'none';
}

export async function checkBiometricAvailability(): Promise<BiometricResult> {
  try {
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const biometryType = await detectBiometryType();
        return {
          available: true,
          biometryType
        };
      }
    }
  } catch (error) {
    console.log('Biometrics check error:', error);
  }
  
  return {
    available: false,
    biometryType: 'none'
  };
}

/**
 * Detect the type of biometric authentication available
 */
async function detectBiometryType(): Promise<'fingerprint' | 'faceId' | 'none'> {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  
  if (isIOS) {
    // iPhone X and later (with notch) use Face ID
    // Check for Face ID by screen dimensions and pixel ratio
    const hasFaceID = window.screen.height >= 812 && window.devicePixelRatio >= 3;
    return hasFaceID ? 'faceId' : 'fingerprint';
  }
  
  // Android - could be fingerprint or face unlock
  // Most Android devices use fingerprint, but newer ones support face
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) {
    // Android typically reports fingerprint by default
    return 'fingerprint';
  }
  
  return 'fingerprint';
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) {
      console.log('WebAuthn not available');
      return false;
    }

    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      console.log('Platform authenticator not available');
      return false;
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    // Create credential options for authentication
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      }
    });
    
    return !!credential;
  } catch (error: any) {
    // User cancelled or biometric failed
    if (error.name === 'NotAllowedError') {
      console.log('Biometric authentication cancelled or failed');
    } else {
      console.log('Biometric authentication error:', error);
    }
    return false;
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  const { saveSetting } = await import('@/lib/storage');
  await saveSetting('biometricsEnabled', enabled ? 'true' : 'false');
}

export async function isBiometricsEnabled(): Promise<boolean> {
  const { getSetting } = await import('@/lib/storage');
  const value = await getSetting('biometricsEnabled');
  return value === 'true';
}

/**
 * Get human-readable biometric type label
 */
export function getBiometricLabel(type: 'fingerprint' | 'faceId' | 'none'): string {
  switch (type) {
    case 'fingerprint':
      return 'Empreinte digitale';
    case 'faceId':
      return 'Reconnaissance faciale';
    default:
      return 'Biométrie';
  }
}
