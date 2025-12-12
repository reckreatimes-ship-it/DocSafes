import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Folder, Edit2, Trash2, Check, X } from 'lucide-react';
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
import { getAllFolders, saveFolder, deleteFolder, Folder as FolderType } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FolderManagerProps {
  selectedFolderId?: string;
  onFolderSelect?: (folderId: string | undefined) => void;
  mode?: 'select' | 'manage';
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function FolderManager({ selectedFolderId, onFolderSelect, mode = 'select' }: FolderManagerProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    const data = await getAllFolders();
    setFolders(data);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folder: FolderType = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      color: selectedColor,
      createdAt: new Date()
    };

    await saveFolder(folder);
    setFolders([...folders, folder]);
    setNewFolderName('');
    setIsCreating(false);
    toast({ title: 'Dossier créé', description: `"${folder.name}" a été créé.` });
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return;

    await saveFolder(editingFolder);
    setFolders(folders.map(f => f.id === editingFolder.id ? editingFolder : f));
    setEditingFolder(null);
    toast({ title: 'Dossier modifié' });
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    setFolders(folders.filter(f => f.id !== folderId));
    setDeletingFolderId(null);
    if (selectedFolderId === folderId) {
      onFolderSelect?.(undefined);
    }
    toast({ title: 'Dossier supprimé' });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Folder className="w-4 h-4" />
            {mode === 'manage' ? 'Gérer les dossiers' : 'Dossiers personnalisés'}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Mes dossiers</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Create new folder */}
            {isCreating ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-secondary rounded-xl space-y-3"
              >
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nom du dossier"
                  className="bg-background"
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform",
                        selectedColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                    <Check className="w-4 h-4 mr-1" />
                    Créer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Annuler
                  </Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setIsCreating(true)} className="w-full gap-2">
                <FolderPlus className="w-4 h-4" />
                Nouveau dossier
              </Button>
            )}

            {/* Folder list */}
            <div className="space-y-2">
              {folders.length === 0 && !isCreating && (
                <p className="text-muted-foreground text-center py-8">
                  Aucun dossier personnalisé. Créez-en un !
                </p>
              )}

              <AnimatePresence>
                {folders.map((folder, index) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                      selectedFolderId === folder.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {editingFolder?.id === folder.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingFolder.name}
                          onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                          className="flex-1 h-8"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleUpdateFolder}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingFolder(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => mode === 'select' && onFolderSelect?.(folder.id)}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: folder.color + '20' }}
                          >
                            <Folder className="w-5 h-5" style={{ color: folder.color }} />
                          </div>
                          <span className="font-medium text-foreground">{folder.name}</span>
                        </button>
                        <button
                          onClick={() => setEditingFolder(folder)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeletingFolderId(folder.id)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingFolderId} onOpenChange={() => setDeletingFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier sera supprimé mais les documents qu'il contenait seront conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFolderId && handleDeleteFolder(deletingFolderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
