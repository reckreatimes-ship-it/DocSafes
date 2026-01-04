import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Moon, 
  Sun, 
  Bell, 
  Trash2, 
  HelpCircle,
  ChevronRight,
  Lock,
  Database,
  AlertTriangle,
  Fingerprint,
  ScanFace,
  QrCode,
  Scale,
  FileText
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { wipeAllData, getStorageStats, getSetting, saveSetting } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { logout, isBiometricsAvailable, biometryType, isBiometricsEnabled, enableBiometrics, disableBiometrics } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [stats, setStats] = useState({ count: 0, totalSize: 0 });
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [isEnablingBiometrics, setIsEnablingBiometrics] = useState(false);
  const [qrDuration, setQrDuration] = useState('60');
  const [showLegalDialog, setShowLegalDialog] = useState(false);

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    const data = await getStorageStats();
    setStats(data);
  };

  const loadSettings = async () => {
    const savedQrDuration = await getSetting('qrDuration');
    if (savedQrDuration) {
      setQrDuration(savedQrDuration);
    }
  };

  const handleQrDurationChange = async (value: string) => {
    setQrDuration(value);
    await saveSetting('qrDuration', value);
    toast({
      title: 'Paramètre enregistré',
      description: `Durée de validité des QR codes : ${getDurationLabel(value)}`
    });
  };

  const getDurationLabel = (seconds: string) => {
    const s = parseInt(seconds);
    if (s < 60) return `${s} secondes`;
    return `${s / 60} minute${s > 60 ? 's' : ''}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleWipeData = async () => {
    try {
      await wipeAllData();
      toast({
        title: 'Données supprimées',
        description: 'Tous vos documents ont été supprimés de manière sécurisée.'
      });
      logout();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les données.',
        variant: 'destructive'
      });
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowBiometricDialog(true);
    } else {
      await disableBiometrics();
      toast({
        title: 'Biométrie désactivée',
        description: 'Le déverrouillage biométrique a été désactivé.'
      });
    }
  };

  const handleEnableBiometrics = async () => {
    if (!biometricPassword) return;
    
    setIsEnablingBiometrics(true);
    const success = await enableBiometrics(biometricPassword);
    setIsEnablingBiometrics(false);
    
    if (success) {
      setShowBiometricDialog(false);
      setBiometricPassword('');
      toast({
        title: 'Biométrie activée',
        description: 'Vous pouvez maintenant déverrouiller avec votre empreinte ou Face ID.'
      });
    } else {
      toast({
        title: 'Erreur',
        description: 'Mot de passe incorrect.',
        variant: 'destructive'
      });
    }
  };

  const getBiometricLabel = () => {
    if (biometryType === 'faceId') return 'Face ID';
    if (biometryType === 'fingerprint') return 'Empreinte digitale';
    return 'Biométrie';
  };

  const getBiometricIcon = () => {
    if (biometryType === 'faceId') return ScanFace;
    return Fingerprint;
  };

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    description,
    action,
    danger = false,
    onClick
  }: { 
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description?: string;
    action?: React.ReactNode;
    danger?: boolean;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left",
        onClick && "hover:bg-secondary",
        danger && "text-destructive"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        danger ? "bg-destructive/10" : "bg-primary/10"
      )}>
        <Icon className={cn("w-5 h-5", danger ? "text-destructive" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium", danger ? "text-destructive" : "text-foreground")}>
          {label}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action || (onClick && <ChevronRight className="w-5 h-5 text-muted-foreground" />)}
    </button>
  );

  return (
    <Layout>
      <Header title="Paramètres" />

      <div className="px-4 py-6 space-y-6">
        {/* Storage Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Stockage local</p>
              <p className="text-sm text-muted-foreground">
                {stats.count} document{stats.count !== 1 ? 's' : ''} • {formatSize(stats.totalSize)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
            Sécurité
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SettingItem
              icon={Lock}
              label="Modifier le code PIN"
              description="Changer votre code d'accès"
              onClick={() => toast({ title: 'Bientôt disponible' })}
            />
            <div className="h-px bg-border mx-4" />
            <SettingItem
              icon={Shield}
              label="Chiffrement AES-256"
              description="Tous vos documents sont chiffrés"
              action={
                <div className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                  Actif
                </div>
              }
            />
            {isBiometricsAvailable && (
              <>
                <div className="h-px bg-border mx-4" />
                <SettingItem
                  icon={getBiometricIcon()}
                  label={getBiometricLabel()}
                  description="Déverrouiller avec la biométrie"
                  action={
                    <Switch
                      checked={isBiometricsEnabled}
                      onCheckedChange={handleBiometricToggle}
                    />
                  }
                />
              </>
            )}
          </div>
        </motion.section>

        {/* Biometric Dialog */}
        <Dialog open={showBiometricDialog} onOpenChange={setShowBiometricDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {biometryType === 'faceId' ? (
                  <ScanFace className="w-5 h-5 text-primary" />
                ) : (
                  <Fingerprint className="w-5 h-5 text-primary" />
                )}
                Activer {getBiometricLabel()}
              </DialogTitle>
              <DialogDescription>
                Entrez votre mot de passe pour activer le déverrouillage biométrique.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="password"
                placeholder="Votre mot de passe"
                value={biometricPassword}
                onChange={(e) => setBiometricPassword(e.target.value)}
                className="h-12"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBiometricDialog(false);
                  setBiometricPassword('');
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleEnableBiometrics}
                disabled={!biometricPassword || isEnablingBiometrics}
                className="gradient-primary"
              >
                {isEnablingBiometrics ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Activer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appearance Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
            Apparence
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SettingItem
              icon={theme === 'dark' ? Moon : Sun}
              label="Mode sombre"
              description={theme === 'dark' ? 'Activé' : 'Désactivé'}
              action={
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              }
            />
          </div>
        </motion.section>

        {/* QR Code Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
            Partage
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SettingItem
              icon={QrCode}
              label="Durée des QR codes"
              description="Validité avant expiration"
              action={
                <Select value={qrDuration} onValueChange={handleQrDurationChange}>
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 sec</SelectItem>
                    <SelectItem value="60">1 min</SelectItem>
                    <SelectItem value="120">2 min</SelectItem>
                    <SelectItem value="300">5 min</SelectItem>
                    <SelectItem value="600">10 min</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </motion.section>

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
            Notifications
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SettingItem
              icon={Bell}
              label="Notifications locales"
              description="Rappels de sauvegarde"
              action={
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              }
            />
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3 px-4">
            Zone dangereuse
          </h2>
          <div className="bg-card rounded-2xl border border-destructive/30 overflow-hidden">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div>
                  <SettingItem
                    icon={Trash2}
                    label="Supprimer toutes les données"
                    description="Action irréversible"
                    danger
                    onClick={() => {}}
                  />
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Confirmer la suppression
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Tous vos documents seront définitivement supprimés de cet appareil.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleWipeData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer tout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SettingItem
              icon={HelpCircle}
              label="À propos de DocSafe"
              description="Version 1.0.0"
              onClick={() => toast({ title: 'DocSafe v1.0.0', description: 'Vos documents sécurisés, 100% locaux.' })}
            />
            <div className="h-px bg-border mx-4" />
            <SettingItem
              icon={Scale}
              label="Informations légales"
              description="Confidentialité & RGPD"
              onClick={() => setShowLegalDialog(true)}
            />
          </div>
        </motion.section>

        {/* Legal Dialog */}
        <Dialog open={showLegalDialog} onOpenChange={setShowLegalDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Informations légales
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-primary/10 rounded-xl">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Stockage 100% local
                </h3>
                <p className="text-sm text-muted-foreground">
                  Toutes vos données sont stockées exclusivement sur votre appareil. 
                  Aucune information n'est transmise à des serveurs externes.
                </p>
              </div>

              <div className="p-4 bg-secondary rounded-xl">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Chiffrement AES-256
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tous vos documents sont chiffrés avec l'algorithme AES-256, 
                  un standard de sécurité utilisé par les gouvernements et les banques.
                </p>
              </div>

              <div className="p-4 bg-secondary rounded-xl">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Aucune collecte de données
                </h3>
                <p className="text-sm text-muted-foreground">
                  DocSafe ne collecte aucune donnée personnelle. Pas d'inscription requise, 
                  pas de tracking, pas d'analytics. Votre vie privée est totalement préservée.
                </p>
              </div>

              <div className="p-4 bg-secondary rounded-xl">
                <h3 className="font-semibold text-foreground mb-2">
                  Conformité RGPD
                </h3>
                <p className="text-sm text-muted-foreground">
                  En l'absence de toute collecte de données personnelles et de tout 
                  transfert vers des serveurs, DocSafe est conforme au Règlement 
                  Général sur la Protection des Données (RGPD).
                </p>
              </div>

              <div className="p-4 border border-border rounded-xl">
                <h3 className="font-semibold text-foreground mb-2">
                  Vos droits
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Vous êtes le seul propriétaire de vos données</li>
                  <li>• Vous pouvez supprimer toutes vos données à tout moment</li>
                  <li>• Aucun compte utilisateur n'est nécessaire</li>
                  <li>• L'application fonctionne entièrement hors-ligne</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowLegalDialog(false)} className="w-full">
                J'ai compris
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          DocSafe - Stockage 100% local et sécurisé
        </p>
      </div>
    </Layout>
  );
}
