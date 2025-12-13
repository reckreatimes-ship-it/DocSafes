import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FolderOpen, Shield, ChevronRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSetting, saveSetting } from '@/lib/storage';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'granted' | 'denied';
}

interface PermissionsScreenProps {
  onComplete: () => void;
}

export function PermissionsScreen({ onComplete }: PermissionsScreenProps) {
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'camera',
      name: 'Caméra',
      description: 'Scanner des documents et codes QR',
      icon: <Camera className="w-6 h-6" />,
      status: 'pending'
    },
    {
      id: 'storage',
      name: 'Stockage',
      description: 'Enregistrer et accéder à vos documents',
      icon: <FolderOpen className="w-6 h-6" />,
      status: 'pending'
    }
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      // Check if Capacitor Camera plugin is available
      const { Camera } = await import('@capacitor/camera');
      const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      return result.camera === 'granted' || result.photos === 'granted';
    } catch (error) {
      // Fallback to web API
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      // For web, check if IndexedDB is available
      if ('indexedDB' in window) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const requestPermission = async (permissionId: string) => {
    setIsRequesting(true);
    let granted = false;

    switch (permissionId) {
      case 'camera':
        granted = await requestCameraPermission();
        break;
      case 'storage':
        granted = await requestStoragePermission();
        break;
    }

    setPermissions(prev => prev.map(p => 
      p.id === permissionId 
        ? { ...p, status: granted ? 'granted' : 'denied' }
        : p
    ));

    setIsRequesting(false);
    
    if (currentStep < permissions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleContinue = async () => {
    await saveSetting('permissionsRequested', 'true');
    onComplete();
  };

  const allPermissionsHandled = permissions.every(p => p.status !== 'pending');
  const currentPermission = permissions[currentStep];

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      {/* Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Shield className="w-10 h-10 text-primary-foreground" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur DocSafe</h1>
        <p className="text-muted-foreground">
          Pour fonctionner correctement, l'application a besoin de quelques autorisations
        </p>
      </motion.div>

      {/* Permissions list */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-3 mb-8"
      >
        {permissions.map((permission, index) => (
          <motion.div
            key={permission.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`
              p-4 rounded-xl border transition-all
              ${currentStep === index && permission.status === 'pending' 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-secondary/50'}
              ${permission.status !== 'pending' ? 'opacity-60' : ''}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${permission.status === 'granted' 
                  ? 'bg-green-500/20 text-green-500' 
                  : permission.status === 'denied'
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-primary/20 text-primary'}
              `}>
                {permission.status === 'granted' ? (
                  <Check className="w-6 h-6" />
                ) : permission.status === 'denied' ? (
                  <X className="w-6 h-6" />
                ) : (
                  permission.icon
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{permission.name}</h3>
                <p className="text-sm text-muted-foreground">{permission.description}</p>
              </div>
              {currentStep === index && permission.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => requestPermission(permission.id)}
                  disabled={isRequesting}
                  className="gradient-primary"
                >
                  {isRequesting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Autoriser
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Continue button */}
      <AnimatePresence>
        {allPermissionsHandled && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full max-w-sm"
          >
            <Button
              onClick={handleContinue}
              className="w-full h-14 text-lg gradient-primary"
            >
              Continuer
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip option */}
      {!allPermissionsHandled && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleContinue}
          className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Passer cette étape
        </motion.button>
      )}
    </div>
  );
}
