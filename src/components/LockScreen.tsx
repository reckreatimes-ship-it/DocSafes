import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Fingerprint, ScanFace } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LockScreenProps {
  isSetup?: boolean;
}

// Validation du mot de passe: au moins 8 caractères, 1 majuscule, 1 caractère spécial AZERTY
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }
  // Caractères spéciaux courants sur clavier AZERTY
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?€£µ§²°`~]/.test(password)) {
    errors.push('Au moins un caractère spécial (!@#$%&*...)');
  }
  
  return { valid: errors.length === 0, errors };
};

export function LockScreen({ isSetup = false }: LockScreenProps) {
  const { login, setup, loginWithBiometrics, isBiometricsAvailable } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    if (isSetup) {
      if (isConfirming) {
        if (confirmPassword !== password) {
          setError('Les mots de passe ne correspondent pas');
          setConfirmPassword('');
          return;
        }
        
        setIsLoading(true);
        await setup(confirmPassword);
        setIsLoading(false);
      } else {
        const validation = validatePassword(password);
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          return;
        }
        setIsConfirming(true);
      }
    } else {
      setIsLoading(true);
      const success = await login(password);
      setIsLoading(false);
      
      if (!success) {
        setError('Mot de passe incorrect');
        setPassword('');
      }
    }
  };

  const handleBiometrics = async () => {
    if (!isBiometricsAvailable) return;
    
    setIsLoading(true);
    const success = await loginWithBiometrics();
    setIsLoading(false);
    
    if (!success) {
      setError('Authentification biométrique échouée');
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Shield className="w-10 h-10 text-primary-foreground" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">DocSafe</h1>
        <p className="text-muted-foreground">
          {isSetup 
            ? (isConfirming ? 'Confirmez votre mot de passe' : 'Créez un mot de passe sécurisé')
            : 'Entrez votre mot de passe'
          }
        </p>
      </motion.div>

      {/* Password Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={isConfirming ? confirmPassword : password}
            onChange={(e) => {
              if (isConfirming) {
                setConfirmPassword(e.target.value);
              } else {
                setPassword(e.target.value);
              }
              setError('');
              setValidationErrors([]);
            }}
            placeholder={isConfirming ? 'Confirmez le mot de passe' : 'Mot de passe'}
            className="h-14 text-lg pr-12 bg-secondary border-0"
            autoFocus
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Validation errors for setup */}
        {isSetup && !isConfirming && validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm space-y-1"
          >
            {validationErrors.map((err, i) => (
              <p key={i} className="text-destructive flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                {err}
              </p>
            ))}
          </motion.div>
        )}

        {/* Password requirements hint for setup */}
        {isSetup && !isConfirming && validationErrors.length === 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className={cn(password.length >= 8 && "text-green-500")}>
              • Au moins 8 caractères
            </p>
            <p className={cn(/[A-Z]/.test(password) && "text-green-500")}>
              • Au moins une majuscule
            </p>
            <p className={cn(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?€£µ§²°`~]/.test(password) && "text-green-500")}>
              • Au moins un caractère spécial
            </p>
          </div>
        )}

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-destructive text-sm text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={isLoading || (isConfirming ? !confirmPassword : !password)}
          className="w-full h-14 text-lg gradient-primary"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : isSetup ? (
            isConfirming ? 'Confirmer' : 'Continuer'
          ) : (
            'Déverrouiller'
          )}
        </Button>
      </motion.form>

      {/* Biometric options */}
      {!isSetup && isBiometricsAvailable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <p className="text-sm text-muted-foreground">ou utilisez</p>
          <div className="flex gap-4">
            <button
              onClick={handleBiometrics}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <Fingerprint className="w-8 h-8 text-primary" />
              <span className="text-xs text-muted-foreground">Empreinte</span>
            </button>
            <button
              onClick={handleBiometrics}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <ScanFace className="w-8 h-8 text-primary" />
              <span className="text-xs text-muted-foreground">Face ID</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 flex items-center justify-center"
          >
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
