import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Moon, 
  Sun, 
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
  FileText,
  Clock,
  EyeOff,
  Download,
  Upload,
  Languages,
  Contrast,
  CheckCircle
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { wipeAllData, getStorageStats, getSetting, saveSetting, getAllDocuments, getAllFolders } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { logout, isBiometricsAvailable, biometryType, isBiometricsEnabled, enableBiometrics, disableBiometrics } = useAuth();
  const [stats, setStats] = useState({ count: 0, totalSize: 0 });
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [isEnablingBiometrics, setIsEnablingBiometrics] = useState(false);
  const [qrDuration, setQrDuration] = useState('60');
  const [autoLockDelay, setAutoLockDelay] = useState('5');
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [language, setLanguage] = useState('fr');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'amoled'>('dark');
  const [isExporting, setIsExporting] = useState(false);

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
    if (savedQrDuration) setQrDuration(savedQrDuration);
    
    const savedAutoLock = await getSetting('autoLockDelay');
    if (savedAutoLock) setAutoLockDelay(savedAutoLock);
    
    const savedPanicMode = await getSetting('panicMode');
    if (savedPanicMode) setPanicMode(savedPanicMode === 'true');
    
    const savedHiddenCats = await getSetting('panicHiddenCategories');
    if (savedHiddenCats) setHiddenCategories(JSON.parse(savedHiddenCats));
    
    const savedLang = await getSetting('language');
    if (savedLang) setLanguage(savedLang);
    
    const savedTheme = await getSetting('themeMode');
    if (savedTheme) setThemeMode(savedTheme as 'light' | 'dark' | 'amoled');
  };

  const handleQrDurationChange = async (value: string) => {
    setQrDuration(value);
    await saveSetting('qrDuration', value);
    toast({
      title: 'Paramètre enregistré',
      description: `Durée de validité des QR codes : ${getDurationLabel(value)}`
    });
  };

  const handleAutoLockChange = async (value: string) => {
    setAutoLockDelay(value);
    await saveSetting('autoLockDelay', value);
    toast({
      title: 'Paramètre enregistré',
      description: `Verrouillage automatique : ${getAutoLockLabel(value)}`
    });
  };

  const handleThemeModeChange = async (mode: 'light' | 'dark' | 'amoled') => {
    setThemeMode(mode);
    await saveSetting('themeMode', mode);
    
    if (mode === 'amoled') {
      document.documentElement.classList.add('amoled');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('amoled');
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    toast({ title: 'Thème modifié' });
  };

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    await saveSetting('language', lang);
    toast({ title: 'Langue modifiée', description: 'Les changements seront appliqués au prochain redémarrage.' });
  };

  const handlePanicModeToggle = async (enabled: boolean) => {
    setPanicMode(enabled);
    await saveSetting('panicMode', String(enabled));
    toast({
      title: enabled ? 'Mode panique activé' : 'Mode panique désactivé',
      description: enabled ? 'Certaines catégories sont maintenant masquées' : 'Toutes les catégories sont visibles'
    });
  };

  const getDurationLabel = (seconds: string) => {
    const s = parseInt(seconds);
    if (s < 60) return `${s} secondes`;
    return `${s / 60} minute${s > 60 ? 's' : ''}`;
  };

  const getAutoLockLabel = (minutes: string) => {
    const m = parseInt(minutes);
    if (m === 0) return 'Désactivé';
    if (m === 1) return '1 minute';
    return `${m} minutes`;
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

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const documents = await getAllDocuments();
      const folders = await getAllFolders();
      
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        documents,
        folders,
        settings: {
          qrDuration,
          autoLockDelay,
          language,
          themeMode
        }
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docsafe-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportDialog(false);
      toast({ title: 'Export réussi', description: 'Votre sauvegarde a été téléchargée.' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'exporter les données.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
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
      disabled={!onClick && !action}
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
              icon={Clock}
              label="Verrouillage automatique"
              description="Après inactivité"
              action={
                <Select value={autoLockDelay} onValueChange={handleAutoLockChange}>
                  <SelectTrigger className="w-24 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Jamais</SelectItem>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                  </SelectContent>
                </Select>
              }
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
            <div className="h-px bg-border mx-4" />
            <SettingItem
              icon={EyeOff}
              label="Mode panique"
              description="Masquer les catégories sensibles"
              action={
                <Switch
                  checked={panicMode}
                  onCheckedChange={handlePanicModeToggle}
                />
              }
            />
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
              icon={Contrast}
              label="Thème"
              description={themeMode === 'amoled' ? 'AMOLED' : themeMode === 'dark' ? 'Sombre' : 'Clair'}
              action={
                <Select value={themeMode} onValueChange={(v) => handleThemeModeChange(v as 'light' | 'dark' | 'amoled')}>
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Clair
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Sombre
                      </div>
                    </SelectItem>
                    <SelectItem value="amoled">
                      <div className="flex items-center gap-2">
                        <Contrast className="w-4 h-4" />
                        AMOLED
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <div className="h-px bg-border mx-4" />
            <SettingItem
              icon={Languages}
              label="Langue"
              description="Interface en français"
              action={
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-28 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </motion.section>

        {/* Backup Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
            Sauvegarde
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SettingItem
              icon={Download}
              label="Exporter les données"
              description="Créer une sauvegarde locale"
              onClick={() => setShowExportDialog(true)}
            />
            <div className="h-px bg-border mx-4" />
            <SettingItem
              icon={Upload}
              label="Importer une sauvegarde"
              description="Restaurer depuis un fichier"
              onClick={() => setShowImportDialog(true)}
            />
          </div>
        </motion.section>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Exporter les données
              </DialogTitle>
              <DialogDescription>
                Créez une sauvegarde chiffrée de tous vos documents et paramètres.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="p-3 bg-secondary rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm">{stats.count} documents seront exportés</span>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Le fichier de sauvegarde contiendra vos documents chiffrés. 
                Conservez-le en lieu sûr.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleExportData} disabled={isExporting} className="gradient-primary">
                {isExporting ? 'Export en cours...' : 'Exporter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Importer une sauvegarde
              </DialogTitle>
              <DialogDescription>
                Restaurez vos documents depuis un fichier de sauvegarde.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="file"
                accept=".json"
                className="h-12"
                onChange={() => toast({ title: 'Bientôt disponible' })}
              />
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ L'import remplacera tous les documents existants.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Annuler
              </Button>
              <Button disabled className="gradient-primary">
                Importer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  pas de tracking, pas d'analytics.
                </p>
              </div>

              <div className="p-4 border border-border rounded-xl">
                <h3 className="font-semibold text-foreground mb-2">
                  Conformité RGPD
                </h3>
                <p className="text-sm text-muted-foreground">
                  En l'absence de toute collecte de données, DocSafe est conforme au RGPD.
                </p>
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