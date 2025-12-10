import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Delete, Fingerprint } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LockScreenProps {
  isSetup?: boolean;
}

export function LockScreen({ isSetup = false }: LockScreenProps) {
  const { login, setup } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNumberPress = async (num: string) => {
    setError('');
    
    if (isSetup) {
      if (isConfirming) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
        
        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            setIsLoading(true);
            await setup(newConfirm);
            setIsLoading(false);
          } else {
            setError('Les codes ne correspondent pas');
            setPin('');
            setConfirmPin('');
            setIsConfirming(false);
          }
        }
      } else {
        const newPin = pin + num;
        setPin(newPin);
        
        if (newPin.length === 4) {
          setIsConfirming(true);
        }
      }
    } else {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setIsLoading(true);
        const success = await login(newPin);
        setIsLoading(false);
        
        if (!success) {
          setError('Code incorrect');
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
    setError('');
  };

  const currentPin = isConfirming ? confirmPin : pin;
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

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
        <h1 className="text-2xl font-bold text-foreground mb-2">DocWallet</h1>
        <p className="text-muted-foreground">
          {isSetup 
            ? (isConfirming ? 'Confirmez votre code' : 'Créez un code PIN')
            : 'Entrez votre code PIN'
          }
        </p>
      </motion.div>

      {/* PIN Dots */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 mb-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: currentPin.length > i ? 1.2 : 1,
              backgroundColor: currentPin.length > i ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
            }}
            className={cn(
              "w-4 h-4 rounded-full transition-colors duration-200"
            )}
          />
        ))}
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-destructive text-sm mb-4 h-6"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      
      {!error && <div className="h-10" />}

      {/* Number Pad */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-4 w-full max-w-xs"
      >
        {numbers.map((num, idx) => (
          <div key={idx} className="flex justify-center">
            {num === '' ? (
              <div className="w-20 h-20" />
            ) : num === 'del' ? (
              <button
                onClick={handleDelete}
                disabled={currentPin.length === 0 || isLoading}
                className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
              >
                <Delete className="w-6 h-6 text-muted-foreground" />
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleNumberPress(num)}
                disabled={currentPin.length >= 4 || isLoading}
                className="w-20 h-20 rounded-2xl bg-secondary hover:bg-secondary/80 flex items-center justify-center text-2xl font-semibold text-foreground active:bg-primary active:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {num}
              </motion.button>
            )}
          </div>
        ))}
      </motion.div>

      {/* Biometric option (visual only for now) */}
      {!isSetup && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <Fingerprint className="w-6 h-6" />
          <span className="text-sm">Utiliser la biométrie</span>
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
