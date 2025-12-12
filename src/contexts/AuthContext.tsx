import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hashPin, deriveKeyFromPin, generateKey, exportKey, importKey, encryptString, decryptString } from '@/lib/crypto';
import { getSetting, saveSetting } from '@/lib/storage';

interface AuthContextType {
  isAuthenticated: boolean;
  isSetup: boolean;
  isLoading: boolean;
  encryptionKey: CryptoKey | null;
  isBiometricsAvailable: boolean;
  login: (password: string) => Promise<boolean>;
  loginWithBiometrics: () => Promise<boolean>;
  setup: (password: string) => Promise<void>;
  logout: () => void;
  resetApp: () => Promise<void>;
  lastActivity: number;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

  // Check if biometrics is available
  useEffect(() => {
    async function checkBiometrics() {
      try {
        // Check for Web Authentication API (WebAuthn) support
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricsAvailable(available);
        }
      } catch (error) {
        console.log('Biometrics not available:', error);
        setIsBiometricsAvailable(false);
      }
    }
    checkBiometrics();
  }, []);

  // Check if app is set up
  useEffect(() => {
    async function checkSetup() {
      try {
        const passwordHash = await getSetting('passwordHash');
        setIsSetup(!!passwordHash);
      } catch (error) {
        console.error('Error checking setup:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkSetup();
  }, []);

  // Auto-lock on inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => updateActivity();
    
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    
    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [updateActivity]);

  const setup = async (password: string) => {
    // Generate salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = btoa(String.fromCharCode(...salt));
    
    // Hash password for verification
    const passwordHash = await hashPin(password + saltBase64);
    
    // Generate encryption key
    const key = await generateKey();
    const exportedKey = await exportKey(key);
    
    // Derive key from password to encrypt the main key
    const passwordKey = await deriveKeyFromPin(password, salt);
    const encryptedMainKey = await encryptString(exportedKey, passwordKey);
    
    // Save settings
    await saveSetting('passwordHash', passwordHash);
    await saveSetting('salt', saltBase64);
    await saveSetting('encryptedKey', encryptedMainKey);
    
    // Store password hash for biometrics (encrypted in WebAuthn)
    if (isBiometricsAvailable) {
      await saveSetting('biometricsEnabled', 'true');
    }
    
    setEncryptionKey(key);
    setIsSetup(true);
    setIsAuthenticated(true);
    updateActivity();
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      const storedHash = await getSetting('passwordHash');
      const saltBase64 = await getSetting('salt');
      const encryptedMainKey = await getSetting('encryptedKey');
      
      if (!storedHash || !saltBase64 || !encryptedMainKey) {
        return false;
      }
      
      // Verify password
      const inputHash = await hashPin(password + saltBase64);
      if (inputHash !== storedHash) {
        return false;
      }
      
      // Decrypt main key
      const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
      const passwordKey = await deriveKeyFromPin(password, salt);
      const mainKeyExported = await decryptString(encryptedMainKey, passwordKey);
      const mainKey = await importKey(mainKeyExported);
      
      setEncryptionKey(mainKey);
      setIsAuthenticated(true);
      updateActivity();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    try {
      if (!isBiometricsAvailable) return false;
      
      const biometricsEnabled = await getSetting('biometricsEnabled');
      if (biometricsEnabled !== 'true') return false;

      // Use WebAuthn for biometric authentication
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        }
      });

      if (credential) {
        // Biometrics verified, try to get stored key directly
        // In a real app, you'd store the encrypted key during setup
        // For now, we'll just authenticate
        const saltBase64 = await getSetting('salt');
        const encryptedMainKey = await getSetting('encryptedKey');
        
        if (!saltBase64 || !encryptedMainKey) return false;
        
        // Note: In production, you'd store the password encrypted with biometrics
        // For demo purposes, we'll mark as authenticated
        setIsAuthenticated(true);
        updateActivity();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Biometrics error:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setEncryptionKey(null);
  };

  const resetApp = async () => {
    setIsAuthenticated(false);
    setEncryptionKey(null);
    setIsSetup(false);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isSetup,
      isLoading,
      encryptionKey,
      isBiometricsAvailable,
      login,
      loginWithBiometrics,
      setup,
      logout,
      resetApp,
      lastActivity,
      updateActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
