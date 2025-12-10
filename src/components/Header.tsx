import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showLogo?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export function Header({ title, showBack, showLogo, action, className }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={cn(
      "sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          
          {showLogo && (
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl font-bold text-foreground"
          >
            {title}
          </motion.h1>
        </div>

        {action && (
          <div>{action}</div>
        )}
      </div>
    </header>
  );
}
