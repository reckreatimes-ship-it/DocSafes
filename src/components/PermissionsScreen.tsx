import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FolderOpen, Shield, ChevronRight, Check, X, Settings, AlertTriangle, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSetting, saveSetting } from '@/lib/storage';
import { 
  checkPermissions, 
  requestCameraPermission, 
  requestPhotosPermission,
  openAppSettings,
  getPermissionExplanation,
  getPlatform,
  type PermissionResult
} from '@/lib/permissions';

interface Permission {
  id: 'camera' | 'photos' | 'storage';
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'granted' | 'denied' | 'permanently_denied';
  required: boolean;
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
      status: 'pending',
      required: true
    },
    {
      id: 'photos',
      name: 'Photos et Médias',
      description: 'Importer des documents depuis votre galerie',
      icon: <Image className="w-6 h-6" />,
      status: 'pending',
      required: true
    },
    {
      id: 'storage',
      name: 'Stockage Local',
      description: 'Enregistrer vos documents de façon sécurisée',
      icon: <FolderOpen className="w-6 h-6" />,
      status: 'pending',
      required: true
    }
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPermanentDeniedInfo, setShowPermanentDeniedInfo] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'web'>('web');

  // Check current permissions on mount
  useEffect(() => {
    async function init() {
      setPlatform(getPlatform());
      await checkCurrentPermissions();
    }
    init();
  }, []);

  const checkCurrentPermissions = async () => {
    try {
      const currentState = await checkPermissions();
      
      setPermissions(prev => prev.map(p => {
        const state = currentState[p.id as keyof typeof currentState];
        let status: Permission['status'] = 'pending';
        
        if (state.granted) {
          status = 'granted';
        } else if (state.permanentlyDenied) {
          status = 'permanently_denied';
        } else if (state.denied) {
          status = 'denied';
        }
        
        return { ...p, status };
      }));

      // Find first pending permission
      const firstPending = permissions.findIndex(p => {
        const state = currentState[p.id as keyof typeof currentState];
        return !state.granted;
      });
      
      if (firstPending >= 0) {
        setCurrentStep(firstPending);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const updatePermissionStatus = (id: string, result: PermissionResult) => {
    let status: Permission['status'] = 'pending';
    
    if (result.granted) {
      status = 'granted';
    } else if (result.permanentlyDenied) {
      status = 'permanently_denied';
      setShowPermanentDeniedInfo(true);
    } else if (result.denied) {
      status = 'denied';
    }
    
    setPermissions(prev => prev.map(p => 
      p.id === id ? { ...p, status } : p
    ));
    
    return status;
  };

  const requestPermission = async (permissionId: string) => {
    setIsRequesting(true);
    
    try {
      let result: PermissionResult;
      
      switch (permissionId) {
        case 'camera':
          result = await requestCameraPermission();
          break;
        case 'photos':
          result = await requestPhotosPermission();
          break;
        case 'storage':
          // Storage uses IndexedDB, always available on web
          result = { granted: true, denied: false, permanentlyDenied: false, canRequest: false };
          break;
        default:
          result = { granted: false, denied: true, permanentlyDenied: false, canRequest: false };
      }
      
      const status = updatePermissionStatus(permissionId, result);
      
      // Move to next step after a short delay
      setTimeout(() => {
        if (currentStep < permissions.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
      }, 500);
      
    } catch (error) {
      console.error('Permission request error:', error);
      updatePermissionStatus(permissionId, { 
        granted: false, 
        denied: true, 
        permanentlyDenied: false, 
        canRequest: true 
      });
    }
    
    setIsRequesting(false);
  };

  const handleOpenSettings = () => {
    openAppSettings();
    // After user returns from settings, recheck permissions
    setTimeout(checkCurrentPermissions, 1000);
  };

  const handleContinue = async () => {
    await saveSetting('permissionsRequested', 'true');
    onComplete();
  };

  const handleSkip = async () => {
    await saveSetting('permissionsRequested', 'true');
    onComplete();
  };

  const allPermissionsHandled = permissions.every(p => p.status !== 'pending');
  const hasAnyGranted = permissions.some(p => p.status === 'granted');
  const hasPermanentlyDenied = permissions.some(p => p.status === 'permanently_denied');
  const currentPermission = permissions[currentStep];

  const getStatusIcon = (status: Permission['status']) => {
    switch (status) {
      case 'granted':
        return <Check className="w-6 h-6" />;
      case 'denied':
        return <X className="w-6 h-6" />;
      case 'permanently_denied':
        return <AlertTriangle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: Permission['status']) => {
    switch (status) {
      case 'granted':
        return 'bg-green-500/20 text-green-500';
      case 'denied':
        return 'bg-amber-500/20 text-amber-500';
      case 'permanently_denied':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-primary/20 text-primary';
    }
  };

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
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur DocSafe</h1>
        <p className="text-muted-foreground text-sm">
          Pour fonctionner correctement, l'application a besoin de quelques autorisations
        </p>
        {platform !== 'web' && (
          <p className="text-xs text-muted-foreground mt-1">
            Plateforme : {platform === 'android' ? 'Android' : 'iOS'}
          </p>
        )}
      </motion.div>

      {/* Permissions list */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-3 mb-6"
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
                ? 'border-primary bg-primary/10 shadow-lg' 
                : 'border-border bg-secondary/50'}
              ${permission.status !== 'pending' ? 'opacity-80' : ''}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all
                ${permission.status !== 'pending' 
                  ? getStatusColor(permission.status)
                  : 'bg-primary/20 text-primary'}
              `}>
                {permission.status !== 'pending' 
                  ? getStatusIcon(permission.status)
                  : permission.icon
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">{permission.name}</h3>
                  {permission.required && permission.status === 'pending' && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      Requis
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{permission.description}</p>
                
                {permission.status === 'permanently_denied' && (
                  <p className="text-xs text-destructive mt-1">
                    Permission refusée définitivement
                  </p>
                )}
              </div>
              
              {/* Action button */}
              {currentStep === index && permission.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => requestPermission(permission.id)}
                  disabled={isRequesting}
                  className="gradient-primary shrink-0"
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
              
              {permission.status === 'permanently_denied' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenSettings}
                  className="shrink-0"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              
              {permission.status === 'denied' && currentStep === index && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => requestPermission(permission.id)}
                  disabled={isRequesting}
                  className="shrink-0"
                >
                  Réessayer
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Permanently denied info */}
      <AnimatePresence>
        {hasPermanentlyDenied && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-sm mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">
                  Certaines permissions ont été refusées
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour les activer, ouvrez les paramètres de l'application sur votre téléphone.
                </p>
                <Button
                  size="sm"
                  variant="link"
                  onClick={handleOpenSettings}
                  className="p-0 h-auto mt-2 text-amber-500"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Ouvrir les paramètres
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            
            {!hasAnyGranted && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Certaines fonctionnalités seront limitées sans ces permissions
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip option */}
      {!allPermissionsHandled && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSkip}
          className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Passer cette étape
        </motion.button>
      )}

      {/* Platform-specific info */}
      {platform === 'android' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
          className="absolute bottom-4 text-xs text-muted-foreground text-center px-4"
        >
          Compatible Android 10, 11, 12, 13 et 14
        </motion.p>
      )}
    </div>
  );
}
