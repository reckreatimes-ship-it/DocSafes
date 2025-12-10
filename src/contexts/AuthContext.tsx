import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hashPin, deriveKeyFromPin, generateKey, exportKey, importKey, encryptString, decryptString } from '@/lib/crypto';
import { getSetting, saveSetting } from '@/lib/storage';

interface AuthContextType {
  isAuthenticated: boolean;
  isSetup: boolean;
  isLoading: boolean;
  encryptionKey: CryptoKey | null;
  login: (pin: string) => Promise<boolean>;
  setup: (pin: string) => Promise<void>;
  logout: () => void;
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

  // Check if app is set up
  useEffect(() => {
    async function checkSetup() {
      try {
        const pinHash = await getSetting('pinHash');
        setIsSetup(!!pinHash);
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

  const setup = async (pin: string) => {
    // Generate salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = btoa(String.fromCharCode(...salt));
    
    // Hash PIN for verification
    const pinHash = await hashPin(pin + saltBase64);
    
    // Generate encryption key
    const key = await generateKey();
    const exportedKey = await exportKey(key);
    
    // Derive key from PIN to encrypt the main key
    const pinKey = await deriveKeyFromPin(pin, salt);
    const encryptedMainKey = await encryptString(exportedKey, pinKey);
    
    // Save settings
    await saveSetting('pinHash', pinHash);
    await saveSetting('salt', saltBase64);
    await saveSetting('encryptedKey', encryptedMainKey);
    
    setEncryptionKey(key);
    setIsSetup(true);
    setIsAuthenticated(true);
    updateActivity();
  };

  const login = async (pin: string): Promise<boolean> => {
    try {
      const storedHash = await getSetting('pinHash');
      const saltBase64 = await getSetting('salt');
      const encryptedMainKey = await getSetting('encryptedKey');
      
      if (!storedHash || !saltBase64 || !encryptedMainKey) {
        return false;
      }
      
      // Verify PIN
      const inputHash = await hashPin(pin + saltBase64);
      if (inputHash !== storedHash) {
        return false;
      }
      
      // Decrypt main key
      const salt = new Uint8Array(atob(saltBase64).split('').map(c => c.charCodeAt(0)));
      const pinKey = await deriveKeyFromPin(pin, salt);
      const mainKeyExported = await decryptString(encryptedMainKey, pinKey);
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

  const logout = () => {
    setIsAuthenticated(false);
    setEncryptionKey(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isSetup,
      isLoading,
      encryptionKey,
      login,
      setup,
      logout,
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
