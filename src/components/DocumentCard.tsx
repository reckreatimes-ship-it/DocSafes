import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, MoreVertical, Share2, Trash2, Eye } from 'lucide-react';
import { Document } from '@/lib/storage';
import { getCategoryById } from '@/lib/categories';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  delay?: number;
}

export function DocumentCard({ document, onView, onShare, onDelete, delay = 0 }: DocumentCardProps) {
  const category = getCategoryById(document.category);
  const Icon = document.type === 'pdf' ? FileText : ImageIcon;
  
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      className="bg-card rounded-xl p-4 border border-border hover:border-primary/30 transition-all duration-200 group"
      onClick={() => onView(document)}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail or Icon */}
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

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {document.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {category?.name || 'Document'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatDate(document.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatSize(document.size)}
            </span>
          </div>
        </div>

        {/* Actions */}
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
            <DropdownMenuItem onClick={() => onView(document)}>
              <Eye className="w-4 h-4 mr-2" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(document)}>
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </DropdownMenuItem>
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
    </motion.div>
  );
}
