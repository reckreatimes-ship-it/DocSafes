// Biometric authentication utilities using WebAuthn

export interface BiometricResult {
  available: boolean;
  biometryType: 'fingerprint' | 'faceId' | 'none';
}

export async function checkBiometricAvailability(): Promise<BiometricResult> {
  try {
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        available,
        biometryType: available ? 'fingerprint' : 'none'
      };
    }
  } catch (error) {
    console.log('Biometrics check error:', error);
  }
  
  return {
    available: false,
    biometryType: 'none'
  };
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) {
      return false;
    }

    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
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
  } catch (error) {
    console.log('Biometric authentication error:', error);
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
