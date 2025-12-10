import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Category } from '@/lib/categories';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
  count: number;
  onClick: () => void;
  delay?: number;
}

export function CategoryCard({ category, count, onClick, delay = 0 }: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05 }}
      onClick={onClick}
      className="w-full bg-card rounded-xl p-4 border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left group"
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: category.color + '20' }}
        >
          <div className="w-6 h-6" style={{ color: category.color }}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {category.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {count} document{count !== 1 ? 's' : ''}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.button>
  );
}
