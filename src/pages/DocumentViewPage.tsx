import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Trash2, Download, QrCode, FileText } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { getDocument, deleteDocument, Document } from '@/lib/storage';
import { getCategoryById } from '@/lib/categories';
import { useAuth } from '@/contexts/AuthContext';
import { decryptData } from '@/lib/crypto';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DocumentViewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { encryptionKey } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId || !encryptionKey) return;

    try {
      const doc = await getDocument(documentId);
      if (!doc) {
        setIsLoading(false);
        return;
      }

      setDocument(doc);

      // Decrypt the file
      const encryptedBytes = Uint8Array.from(atob(doc.encryptedData), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(doc.iv), c => c.charCodeAt(0));
      
      const decrypted = await decryptData(encryptedBytes.buffer, encryptionKey, iv);
      const blob = new Blob([decrypted], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      
      setDecryptedUrl(url);
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déchiffrer le document.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;

    try {
      await deleteDocument(documentId);
      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé de manière sécurisée.'
      });
      navigate('/home');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document.',
        variant: 'destructive'
      });
    }
  };

  const handleShare = () => {
    if (document) {
      navigate(`/share/${document.id}`);
    }
  };

  const handleDownload = () => {
    if (!decryptedUrl || !document) return;

    const a = window.document.createElement('a');
    a.href = decryptedUrl;
    a.download = document.name + (document.type === 'pdf' ? '.pdf' : '.jpg');
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);

    toast({
      title: 'Téléchargé',
      description: 'Le document a été téléchargé.'
    });
  };

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (decryptedUrl) {
        URL.revokeObjectURL(decryptedUrl);
      }
    };
  }, [decryptedUrl]);

  if (isLoading) {
    return (
      <Layout>
        <Header title="Document" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <Header title="Document" showBack />
        <EmptyState
          title="Document introuvable"
          description="Ce document n'existe pas ou a été supprimé."
        />
      </Layout>
    );
  }

  const category = getCategoryById(document.category);

  return (
    <Layout>
      <Header 
        title={document.name} 
        showBack
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-5 h-5 text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le document sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <div className="px-4 py-6 space-y-6">
        {/* Document preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="aspect-[3/4] rounded-2xl overflow-hidden bg-secondary border border-border"
        >
          {document.type === 'image' && decryptedUrl ? (
            <img 
              src={decryptedUrl} 
              alt={document.name}
              className="w-full h-full object-contain"
            />
          ) : document.type === 'pdf' && decryptedUrl ? (
            <iframe 
              src={decryptedUrl}
              title={document.name}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        {/* Document info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {category && (
              <div 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: category.color + '20',
                  color: category.color
                }}
              >
                {category.name}
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {(document.size / 1024).toFixed(1)} KB
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Ajouté le {new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).format(new Date(document.createdAt))}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs">Télécharger</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleShare}
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs">Partager</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(`/qr/${document.id}`)}
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <QrCode className="w-5 h-5" />
            <span className="text-xs">QR Code</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          🔒 Ce document est chiffré et stocké uniquement sur votre appareil.
        </p>
      </div>
    </Layout>
  );
}
