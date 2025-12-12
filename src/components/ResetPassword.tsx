import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Trash2, ArrowLeft } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { wipeAllData } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

interface ResetPasswordProps {
  onBack: () => void;
  onReset: () => void;
}

export function ResetPassword({ onBack, onReset }: ResetPasswordProps) {
  const { resetApp } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await wipeAllData();
      await resetApp();
      onReset();
    } catch (error) {
      console.error('Error resetting:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 p-2 rounded-lg hover:bg-secondary transition-colors safe-area-top"
      >
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8 max-w-sm"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Mot de passe oublié ?
        </h1>
        <p className="text-muted-foreground">
          Pour des raisons de sécurité, vos documents sont chiffrés avec votre mot de passe. 
          Sans celui-ci, il est <strong>impossible</strong> de les récupérer.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-8"
      >
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive mb-1">Protection des données</p>
            <p className="text-muted-foreground">
              La seule option est de réinitialiser l'application, ce qui supprimera 
              définitivement tous vos documents chiffrés.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-3"
      >
        <Button variant="outline" onClick={onBack} className="w-full h-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la connexion
        </Button>
        <Button variant="destructive" onClick={() => setShowConfirm(true)} className="w-full h-12">
          <Trash2 className="w-4 h-4 mr-2" />
          Réinitialiser l'application
        </Button>
      </motion.div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Êtes-vous sûr ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Tous vos documents 
              seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <div className="w-5 h-5 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                'Supprimer tout'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
