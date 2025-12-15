import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Fingerprint, ScanFace, HelpCircle, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResetPassword } from '@/components/ResetPassword';
import { cn } from '@/lib/utils';

interface LockScreenProps {
  isSetup?: boolean;
  onReset?: () => void;
}

const SECRET_QUESTIONS = [
  "Quel est le nom de votre premier animal ?",
  "Quelle est votre ville de naissance ?",
  "Quel est le prénom de votre meilleur ami d'enfance ?",
  "Quel est le nom de jeune fille de votre mère ?",
  "Quelle était votre école primaire ?",
  "Quel est votre plat préféré ?",
];

// Validation du mot de passe: au moins 8 caractères, 1 majuscule, 1 caractère spécial AZERTY
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?€£µ§²°`~]/.test(password)) {
    errors.push('Au moins un caractère spécial (!@#$%&*...)');
  }
  
  return { valid: errors.length === 0, errors };
};

type SetupStep = 'password' | 'confirm' | 'secret';

export function LockScreen({ isSetup = false, onReset }: LockScreenProps) {
  const { login, setup, loginWithBiometrics, isBiometricsAvailable, biometryType, isBiometricsEnabled } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupStep, setSetupStep] = useState<SetupStep>('password');
  const [secretQuestion, setSecretQuestion] = useState(SECRET_QUESTIONS[0]);
  const [secretAnswer, setSecretAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  if (showResetPassword && !isSetup) {
    return (
      <ResetPassword 
        onBack={() => setShowResetPassword(false)} 
        onReset={() => {
          setShowResetPassword(false);
          onReset?.();
        }} 
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    if (isSetup) {
      if (setupStep === 'password') {
        const validation = validatePassword(password);
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          return;
        }
        setSetupStep('confirm');
      } else if (setupStep === 'confirm') {
        if (confirmPassword !== password) {
          setError('Les mots de passe ne correspondent pas');
          setConfirmPassword('');
          return;
        }
        setSetupStep('secret');
      } else if (setupStep === 'secret') {
        if (!secretAnswer.trim()) {
          setError('Veuillez entrer une réponse');
          return;
        }
        setIsLoading(true);
        await setup(password, secretQuestion, secretAnswer);
        setIsLoading(false);
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

  const getTitle = () => {
    if (!isSetup) return 'Entrez votre mot de passe';
    switch (setupStep) {
      case 'password': return 'Créez un mot de passe sécurisé';
      case 'confirm': return 'Confirmez votre mot de passe';
      case 'secret': return 'Question secrète de récupération';
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom overflow-y-auto">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          {setupStep === 'secret' && isSetup ? (
            <KeyRound className="w-10 h-10 text-primary-foreground" />
          ) : (
            <Shield className="w-10 h-10 text-primary-foreground" />
          )}
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">DocSafe</h1>
        <p className="text-muted-foreground">{getTitle()}</p>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
        {/* Password input (for login or setup password/confirm steps) */}
        {(!isSetup || setupStep === 'password' || setupStep === 'confirm') && (
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={setupStep === 'confirm' ? confirmPassword : password}
              onChange={(e) => {
                if (setupStep === 'confirm') {
                  setConfirmPassword(e.target.value);
                } else {
                  setPassword(e.target.value);
                }
                setError('');
                setValidationErrors([]);
              }}
              placeholder={setupStep === 'confirm' ? 'Confirmez le mot de passe' : 'Mot de passe'}
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
        )}

        {/* Secret question setup */}
        {isSetup && setupStep === 'secret' && (
          <div className="space-y-4">
            <div>
              <Label className="text-foreground mb-2 block">Question secrète</Label>
              <select
                value={secretQuestion}
                onChange={(e) => setSecretQuestion(e.target.value)}
                className="w-full h-12 px-4 bg-secondary border-0 rounded-md text-foreground"
              >
                {SECRET_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-foreground mb-2 block">Votre réponse</Label>
              <Input
                type="text"
                value={secretAnswer}
                onChange={(e) => {
                  setSecretAnswer(e.target.value);
                  setError('');
                }}
                placeholder="Entrez votre réponse..."
                className="h-12 bg-secondary border-0"
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Cette réponse vous permettra de récupérer votre compte si vous oubliez votre mot de passe.
              </p>
            </div>
          </div>
        )}

        {/* Validation errors for setup */}
        {isSetup && setupStep === 'password' && validationErrors.length > 0 && (
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
        {isSetup && setupStep === 'password' && validationErrors.length === 0 && (
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
          disabled={isLoading || (setupStep === 'confirm' ? !confirmPassword : setupStep === 'secret' ? !secretAnswer.trim() : !password)}
          className="w-full h-14 text-lg gradient-primary"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : isSetup ? (
            setupStep === 'secret' ? 'Terminer la configuration' : 'Continuer'
          ) : (
            'Déverrouiller'
          )}
        </Button>

        {/* Back button during setup */}
        {isSetup && setupStep !== 'password' && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (setupStep === 'confirm') setSetupStep('password');
              else if (setupStep === 'secret') setSetupStep('confirm');
            }}
            className="w-full"
          >
            Retour
          </Button>
        )}
      </motion.form>

      {/* Biometric button - visible and prominent */}
      {!isSetup && isBiometricsAvailable && isBiometricsEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm mt-4"
        >
          <div className="relative flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleBiometrics}
            disabled={isLoading}
            className="w-full h-14 text-base border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
          >
            {biometryType === 'faceId' ? (
              <>
                <ScanFace className="w-6 h-6 mr-3 text-primary" />
                Déverrouiller avec Face ID
              </>
            ) : (
              <>
                <Fingerprint className="w-6 h-6 mr-3 text-primary" />
                Déverrouiller avec Empreinte
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Forgot password link */}
      {!isSetup && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setShowResetPassword(true)}
          className="mt-6 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Mot de passe oublié ?
        </motion.button>
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
