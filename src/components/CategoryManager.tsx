import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, 
  Edit2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  GripVertical,
  Check,
  X,
  Palette
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Category, categories as defaultCategories, getCategoryIcon } from '@/lib/categories';
import {
  getAllCategoriesWithSettings,
  updateCategorySettings,
  resetCategoryToDefault,
  saveCategoryOrder,
  getCategoryOrder
} from '@/lib/categorySettings';

interface ExtendedCategory extends Category {
  hidden: boolean;
  originalName: string;
}

const CATEGORY_COLORS = [
  'hsl(168 76% 36%)', // teal
  'hsl(220 70% 50%)', // blue
  'hsl(280 65% 50%)', // purple
  'hsl(35 90% 50%)', // orange
  'hsl(45 95% 50%)', // yellow
  'hsl(340 65% 50%)', // pink
  'hsl(142 70% 40%)', // green
  'hsl(0 70% 50%)', // red
  'hsl(200 80% 50%)', // sky blue
  'hsl(260 70% 55%)', // violet
];

interface CategoryManagerProps {
  onCategoriesChanged?: () => void;
}

export function CategoryManager({ onCategoriesChanged }: CategoryManagerProps) {
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showResetDialog, setShowResetDialog] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const cats = await getAllCategoriesWithSettings();
    setCategories(cats);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, loadCategories]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setCategories(items);
    await saveCategoryOrder(items.map(c => c.id));
    onCategoriesChanged?.();
    toast({ title: 'Ordre mis à jour' });
  };

  const handleStartEdit = (cat: ExtendedCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    await updateCategorySettings(editingId, {
      customName: editName.trim(),
      customColor: editColor
    });

    await loadCategories();
    setEditingId(null);
    onCategoriesChanged?.();
    toast({ title: 'Catégorie modifiée' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleToggleVisibility = async (cat: ExtendedCategory) => {
    await updateCategorySettings(cat.id, { hidden: !cat.hidden });
    await loadCategories();
    onCategoriesChanged?.();
    toast({ 
      title: cat.hidden ? 'Catégorie affichée' : 'Catégorie masquée',
      description: cat.hidden ? `"${cat.name}" est maintenant visible` : `"${cat.name}" est masquée de l'accueil`
    });
  };

  const handleResetCategory = async (categoryId: string) => {
    await resetCategoryToDefault(categoryId);
    await loadCategories();
    setShowResetDialog(null);
    onCategoriesChanged?.();
    toast({ title: 'Catégorie réinitialisée', description: 'Nom et couleur par défaut restaurés' });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Gérer les catégories
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Personnaliser les catégories</SheetTitle>
          </SheetHeader>

          <div className="mt-4 mb-2 text-sm text-muted-foreground">
            Glissez pour réordonner, cliquez pour modifier
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[calc(85vh-140px)] overflow-y-auto"
                >
                  {categories.map((cat, index) => {
                    const Icon = getCategoryIcon(cat.id);
                    const isEditing = editingId === cat.id;
                    const isModified = cat.name !== cat.originalName || cat.color !== defaultCategories.find(c => c.id === cat.id)?.color;

                    return (
                      <Draggable key={cat.id} draggableId={cat.id} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn(
                              "p-3 rounded-xl border transition-all",
                              snapshot.isDragging 
                                ? "border-primary bg-primary/5 shadow-lg" 
                                : "border-border bg-card",
                              cat.hidden && "opacity-50"
                            )}
                          >
                            {isEditing ? (
                              <div className="space-y-3">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Nom de la catégorie"
                                  className="h-10"
                                  autoFocus
                                />
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
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleSaveEdit}>
                                    <Check className="w-4 h-4 mr-1" />
                                    Enregistrer
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                    <X className="w-4 h-4 mr-1" />
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps} className="touch-none">
                                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                                </div>
                                
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: cat.color + '20' }}
                                >
                                  <Icon className="w-5 h-5" style={{ color: cat.color }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    {cat.name}
                                  </p>
                                  {isModified && (
                                    <p className="text-xs text-muted-foreground">
                                      Original : {cat.originalName}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEdit(cat)}
                                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleVisibility(cat)}
                                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                    title={cat.hidden ? 'Afficher' : 'Masquer'}
                                  >
                                    {cat.hidden ? (
                                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </button>
                                  {isModified && (
                                    <button
                                      onClick={() => setShowResetDialog(cat.id)}
                                      className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                      title="Réinitialiser"
                                    >
                                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </SheetContent>
      </Sheet>

      {/* Reset confirmation */}
      <AlertDialog open={!!showResetDialog} onOpenChange={() => setShowResetDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le nom et la couleur seront restaurés aux valeurs par défaut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => showResetDialog && handleResetCategory(showResetDialog)}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
