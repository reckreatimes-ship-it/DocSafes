import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  MessageCircle, 
  Send, 
  MessageSquare, 
  Share2,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { getDocument, Document } from '@/lib/storage';
import { getCategoryById } from '@/lib/categories';
import { useAuth } from '@/contexts/AuthContext';
import { decryptData } from '@/lib/crypto';
import { toast } from '@/hooks/use-toast';

const shareOptions = [
  { 
    id: 'native', 
    name: 'Partager', 
    icon: Share2, 
    color: 'hsl(168 76% 36%)',
    description: 'Utiliser le partage natif'
  },
  { 
    id: 'email', 
    name: 'Email', 
    icon: Mail, 
    color: 'hsl(220 70% 50%)',
    description: 'Envoyer par email'
  },
  { 
    id: 'whatsapp', 
    name: 'WhatsApp', 
    icon: MessageCircle, 
    color: 'hsl(142 70% 45%)',
    description: 'Partager sur WhatsApp'
  },
  { 
    id: 'telegram', 
    name: 'Telegram', 
    icon: Send, 
    color: 'hsl(200 80% 50%)',
    description: 'Partager sur Telegram'
  },
  { 
    id: 'sms', 
    name: 'SMS', 
    icon: MessageSquare, 
    color: 'hsl(35 90% 50%)',
    description: 'Envoyer par SMS'
  },
];

export function SharePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { encryptionKey } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId) return;

    try {
      const doc = await getDocument(documentId);
      setDocument(doc || null);
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (method: string) => {
    if (!document || !encryptionKey) return;

    setIsSharing(true);

    try {
      // Decrypt the file for sharing
      const encryptedBytes = Uint8Array.from(atob(document.encryptedData), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(document.iv), c => c.charCodeAt(0));
      const decrypted = await decryptData(encryptedBytes.buffer, encryptionKey, iv);
      
      const blob = new Blob([decrypted], { type: document.mimeType });
      const file = new File([blob], document.name + (document.type === 'pdf' ? '.pdf' : '.jpg'), {
        type: document.mimeType
      });

      if (method === 'native' && navigator.share) {
        await navigator.share({
          files: [file],
          title: document.name,
          text: `Document partagé depuis DocWallet: ${document.name}`
        });
        
        toast({
          title: 'Partage réussi',
          description: 'Votre document a été partagé avec succès.'
        });
      } else {
        // Fallback: download the file
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name + (document.type === 'pdf' ? '.pdf' : '.jpg');
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Document prêt',
          description: 'Le document a été téléchargé. Vous pouvez maintenant le partager manuellement.'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: 'Erreur de partage',
          description: 'Impossible de partager ce document.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Header title="Partager" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <Header title="Partager" showBack />
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
      <Header title="Partager" showBack />

      <div className="px-4 py-6 space-y-6">
        {/* Document info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
        >
          {category && (
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: category.color + '20', color: category.color }}
            >
              <category.icon className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{document.name}</p>
            <p className="text-sm text-muted-foreground">{category?.name}</p>
          </div>
        </motion.div>

        {/* Security notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl"
        >
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Partage sécurisé</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le document sera déchiffré localement puis partagé directement. Aucune donnée n'est envoyée vers un serveur intermédiaire.
            </p>
          </div>
        </motion.div>

        {/* Share options */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Choisir une méthode</h2>
          
          {shareOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                onClick={() => handleShare(option.id)}
                disabled={isSharing}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all disabled:opacity-50"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: option.color + '20' }}
                >
                  <Icon className="w-6 h-6" style={{ color: option.color }} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{option.name}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-xl">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Une fois partagé, le destinataire aura accès au document en clair. Partagez uniquement avec des personnes de confiance.
          </p>
        </div>
      </div>
    </Layout>
  );
}
