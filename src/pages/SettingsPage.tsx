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
  AlertTriangle
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { wipeAllData, getStorageStats } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [stats, setStats] = useState({ count: 0, totalSize: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getStorageStats();
    setStats(data);
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
          </div>
        </motion.section>

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

        {/* Notifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
          </div>
        </motion.section>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          DocSafe - Stockage 100% local et sécurisé
        </p>
      </div>
    </Layout>
  );
}
