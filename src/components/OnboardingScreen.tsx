import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  FolderOpen, 
  QrCode, 
  Fingerprint,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur DocSafe',
    description: 'Votre coffre-fort numérique personnel pour tous vos documents importants.',
    color: 'hsl(168 76% 36%)'
  },
  {
    icon: Shield,
    title: 'Sécurité maximale',
    description: 'Tous vos documents sont chiffrés avec AES-256, le même algorithme utilisé par les banques.',
    color: 'hsl(142 70% 40%)'
  },
  {
    icon: Lock,
    title: '100% local',
    description: 'Aucune donnée n\'est envoyée vers le cloud. Tout reste sur votre appareil, sous votre contrôle.',
    color: 'hsl(220 70% 50%)'
  },
  {
    icon: FolderOpen,
    title: 'Organisation intuitive',
    description: 'Classez vos documents par catégories, ajoutez des tags et retrouvez-les instantanément.',
    color: 'hsl(280 65% 50%)'
  },
  {
    icon: QrCode,
    title: 'Partage sécurisé',
    description: 'Partagez vos documents via QR code temporaire, sans jamais compromettre leur sécurité.',
    color: 'hsl(35 90% 50%)'
  },
  {
    icon: Fingerprint,
    title: 'Accès biométrique',
    description: 'Déverrouillez DocSafe avec votre empreinte digitale ou Face ID pour un accès rapide et sécurisé.',
    color: 'hsl(340 65% 50%)'
  }
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
          Passer
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
              style={{ backgroundColor: step.color + '20' }}
            >
              <Icon className="w-12 h-12" style={{ color: step.color }} />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-foreground mb-4"
            >
              {step.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg leading-relaxed"
            >
              {step.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-6">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentStep 
                ? "w-6 bg-primary" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 safe-area-bottom">
        <Button
          variant="ghost"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={cn(currentStep === 0 && "invisible")}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Précédent
        </Button>

        <Button onClick={handleNext} className="gradient-primary min-w-32">
          {isLastStep ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Commencer
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="w-5 h-5 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}