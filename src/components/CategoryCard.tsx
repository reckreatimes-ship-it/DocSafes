import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MoreVertical, Edit2, Eye, EyeOff, RotateCcw, Check, X, Palette } from 'lucide-react';
import { Category, categories as defaultCategories } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateCategorySettings, resetCategoryToDefault } from '@/lib/categorySettings';
import { toast } from '@/hooks/use-toast';

const CATEGORY_COLORS = [
  'hsl(168 76% 36%)', 'hsl(220 70% 50%)', 'hsl(280 65% 50%)', 'hsl(35 90% 50%)',
  'hsl(45 95% 50%)', 'hsl(340 65% 50%)', 'hsl(142 70% 40%)', 'hsl(0 70% 50%)',
];

interface CategoryCardProps {
  category: Category;
  count: number;
  onClick: () => void;
  onUpdate?: () => void;
  delay?: number;
  originalName?: string;
}

export function CategoryCard({ category, count, onClick, onUpdate, delay = 0, originalName }: CategoryCardProps) {
  const Icon = category.icon;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editColor, setEditColor] = useState(category.color);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isModified = originalName && category.name !== originalName;

  const handleSave = async () => {
    if (!editName.trim()) return;
    await updateCategorySettings(category.id, { 
      customName: editName.trim(),
      customColor: editColor
    });
    setIsEditing(false);
    setShowColorPicker(false);
    onUpdate?.();
    toast({ title: 'Catégorie renommée', description: editName.trim() });
  };

  const handleReset = async () => {
    await resetCategoryToDefault(category.id);
    const defaultCat = defaultCategories.find(c => c.id === category.id);
    if (defaultCat) {
      setEditName(defaultCat.name);
      setEditColor(defaultCat.color);
    }
    onUpdate?.();
    toast({ title: 'Catégorie réinitialisée' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowColorPicker(false);
    setEditName(category.name);
    setEditColor(category.color);
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-card rounded-xl p-4 border-2 border-primary"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105"
              style={{ backgroundColor: editColor + '20' }}
            >
              <div className="w-6 h-6" style={{ color: editColor }}>
                <Icon className="w-6 h-6" />
              </div>
            </button>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 h-10"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          
          {showColorPicker && (
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-transform",
                    editColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              <Check className="w-4 h-4 mr-1" /> Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05 }}
      className="w-full bg-card rounded-xl p-4 border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onClick}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
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
            {isModified && (
              <p className="text-xs text-muted-foreground/60">
                ({originalName})
              </p>
            )}
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setIsEditing(true); setShowColorPicker(true); }}>
              <Palette className="w-4 h-4 mr-2" />
              Changer la couleur
            </DropdownMenuItem>
            {isModified && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={onClick} className="p-2">
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </motion.div>
  );
}
