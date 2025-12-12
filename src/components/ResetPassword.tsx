import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ArrowLeft, Check, Eye, EyeOff, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ResetPasswordProps {
  onBack: () => void;
  onReset: () => void;
}

const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?€£µ§²°`~]/.test(password)) {
    errors.push('Au moins un caractère spécial');
  }
  return { valid: errors.length === 0, errors };
};

type Step = 'question' | 'newPassword' | 'confirm';

export function ResetPassword({ onBack, onReset }: ResetPasswordProps) {
  const { verifySecretAnswer, resetPasswordWithSecret, getSecretQuestion, login } = useAuth();
  const [step, setStep] = useState<Step>('question');
  const [secretQuestion, setSecretQuestion] = useState<string>('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSecretQuestion();
  }, []);

  const loadSecretQuestion = async () => {
    const question = await getSecretQuestion();
    if (question) {
      setSecretQuestion(question);
    } else {
      setError('Aucune question secrète configurée. Impossible de réinitialiser.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);

    if (step === 'question') {
      if (!secretAnswer.trim()) {
        setError('Veuillez entrer votre réponse');
        return;
      }
      
      setIsLoading(true);
      const isValid = await verifySecretAnswer(secretAnswer);
      setIsLoading(false);
      
      if (isValid) {
        setStep('newPassword');
      } else {
        setError('Réponse incorrecte');
        setSecretAnswer('');
      }
    } else if (step === 'newPassword') {
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }
      setStep('confirm');
    } else if (step === 'confirm') {
      if (confirmPassword !== newPassword) {
        setError('Les mots de passe ne correspondent pas');
        setConfirmPassword('');
        return;
      }
      
      setIsLoading(true);
      const success = await resetPasswordWithSecret(newPassword);
      
      if (success) {
        // Try to login with new password
        const loginSuccess = await login(newPassword);
        setIsLoading(false);
        
        if (loginSuccess) {
          toast({
            title: 'Mot de passe réinitialisé',
            description: 'Votre nouveau mot de passe a été configuré avec succès.'
          });
          onReset();
        } else {
          toast({
            title: 'Mot de passe mis à jour',
            description: 'Veuillez vous reconnecter avec votre nouveau mot de passe.'
          });
          onBack();
        }
      } else {
        setIsLoading(false);
        setError('Erreur lors de la réinitialisation');
      }
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'question': return 'Répondez à votre question secrète';
      case 'newPassword': return 'Créez un nouveau mot de passe';
      case 'confirm': return 'Confirmez le mot de passe';
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom overflow-y-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 p-2 rounded-lg hover:bg-secondary transition-colors safe-area-top"
      >
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          {step === 'question' ? (
            <ShieldQuestion className="w-10 h-10 text-primary" />
          ) : (
            <KeyRound className="w-10 h-10 text-primary" />
          )}
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6 max-w-sm"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Récupération du compte
        </h1>
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
        {step === 'question' && (
          <>
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Question secrète :</p>
              <p className="font-medium text-foreground">{secretQuestion || 'Chargement...'}</p>
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
                disabled={isLoading || !secretQuestion}
              />
            </div>
          </>
        )}

        {(step === 'newPassword' || step === 'confirm') && (
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={step === 'confirm' ? confirmPassword : newPassword}
              onChange={(e) => {
                if (step === 'confirm') {
                  setConfirmPassword(e.target.value);
                } else {
                  setNewPassword(e.target.value);
                }
                setError('');
                setValidationErrors([]);
              }}
              placeholder={step === 'confirm' ? 'Confirmez le mot de passe' : 'Nouveau mot de passe'}
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

        {/* Validation errors */}
        {step === 'newPassword' && validationErrors.length > 0 && (
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

        {/* Password requirements hint */}
        {step === 'newPassword' && validationErrors.length === 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className={cn(newPassword.length >= 8 && "text-green-500")}>
              • Au moins 8 caractères
            </p>
            <p className={cn(/[A-Z]/.test(newPassword) && "text-green-500")}>
              • Au moins une majuscule
            </p>
            <p className={cn(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?€£µ§²°`~]/.test(newPassword) && "text-green-500")}>
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
          disabled={isLoading || (step === 'question' ? !secretAnswer.trim() : step === 'newPassword' ? !newPassword : !confirmPassword)}
          className="w-full h-14 text-lg gradient-primary"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : step === 'confirm' ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Réinitialiser
            </>
          ) : (
            'Continuer'
          )}
        </Button>

        {/* Back button during steps */}
        {step !== 'question' && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (step === 'newPassword') setStep('question');
              else if (step === 'confirm') setStep('newPassword');
            }}
            className="w-full"
          >
            Retour
          </Button>
        )}
      </motion.form>

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
