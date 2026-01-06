import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, MoreVertical, Share2, Trash2, Eye, Star, Edit2, Check, X } from 'lucide-react';
import { Document, updateDocument } from '@/lib/storage';
import { getCategoryById } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onUpdate?: () => void;
  delay?: number;
}

export function DocumentCard({ document, onView, onShare, onDelete, onUpdate, delay = 0 }: DocumentCardProps) {
  const category = getCategoryById(document.category);
  const Icon = document.type === 'pdf' ? FileText : ImageIcon;
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(document.name);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateDocument(document.id, { isFavorite: !document.isFavorite });
    onUpdate?.();
    toast({
      title: document.isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris',
      description: document.name
    });
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    await updateDocument(document.id, { name: newName.trim() });
    setIsEditing(false);
    onUpdate?.();
    toast({ title: 'Document renommé', description: newName.trim() });
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setNewName(document.name);
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 border-2 border-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: category?.color + '20' }}
          >
            {document.thumbnail ? (
              <img 
                src={document.thumbnail} 
                alt={document.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Icon className="w-6 h-6" style={{ color: category?.color }} />
            )}
          </div>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 h-10"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') handleCancelRename();
            }}
          />
          <Button size="icon" onClick={handleRename} className="h-10 w-10">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancelRename} className="h-10 w-10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: delay * 0.05 }}
      className="bg-card rounded-xl p-4 border border-border hover:border-primary/30 transition-all duration-200 group"
      onClick={() => onView(document)}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail or Icon */}
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 relative"
          style={{ backgroundColor: category?.color + '20' }}
        >
          {document.thumbnail ? (
            <img 
              src={document.thumbnail} 
              alt={document.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Icon className="w-6 h-6" style={{ color: category?.color }} />
          )}
          {document.isFavorite && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-warning rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-warning-foreground fill-current" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {document.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {category?.name || 'Document'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {formatDate(document.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatSize(document.size)}
            </span>
            {document.tags && document.tags.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <div className="flex gap-1 flex-wrap">
                  {document.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 h-5">
                      {tag}
                    </Badge>
                  ))}
                  {document.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                      +{document.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "p-2 rounded-lg transition-colors",
              document.isFavorite 
                ? "text-warning hover:bg-warning/10" 
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Star className={cn("w-5 h-5", document.isFavorite && "fill-current")} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                <Edit2 className="w-4 h-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(document)}>
                <Eye className="w-4 h-4 mr-2" />
                Voir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(document)}>
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(document)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
