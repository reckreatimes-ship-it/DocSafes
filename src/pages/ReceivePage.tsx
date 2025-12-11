import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Image, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base64ToArrayBuffer } from '@/lib/base64';

interface SharedDocument {
  name: string;
  type: 'pdf' | 'image';
  mimeType: string;
  data: string;
  size: number;
}

export function ReceivePage() {
  const [searchParams] = useSearchParams();
  
  const [document, setDocument] = useState<SharedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    parseShareData();
  }, [searchParams]);

  const parseShareData = () => {
    try {
      const data = searchParams.get('d');
      const expires = searchParams.get('e');
      
      if (!data) {
        setError('Aucune donnée de document trouvée');
        return;
      }

      // Check expiration
      if (expires) {
        const expiryTime = parseInt(expires, 10);
        if (Date.now() > expiryTime) {
          setIsExpired(true);
          setError('Ce lien de partage a expiré');
          return;
        }
      }

      // Decode the document data
      const decoded = JSON.parse(atob(decodeURIComponent(data)));
      setDocument(decoded);
    } catch (err) {
      console.error('Error parsing share data:', err);
      setError('Données de partage invalides');
    }
  };

  const handleDownload = () => {
    if (!document) return;

    try {
      // Convert base64 to blob
      const binaryData = base64ToArrayBuffer(document.data);
      const blob = new Blob([binaryData], { type: document.mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setDownloaded(true);
    } catch (err) {
      console.error('Error downloading:', err);
      setError('Erreur lors du téléchargement');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Standalone page without Layout (accessible without auth)
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-center p-4 border-b border-border bg-card">
        <h1 className="text-lg font-semibold text-foreground">DocSafe</h1>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                isExpired ? 'bg-yellow-500/20' : 'bg-destructive/20'
              }`}
            >
              <AlertCircle className={`w-10 h-10 ${isExpired ? 'text-yellow-500' : 'text-destructive'}`} />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {isExpired ? 'Lien expiré' : 'Erreur'}
            </h2>
            <p className="text-muted-foreground text-center">{error}</p>
          </div>
        ) : !document ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : downloaded ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-500" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-2">Téléchargé !</h2>
            <p className="text-muted-foreground text-center">
              Le document a été enregistré dans vos téléchargements
            </p>
          </motion.div>
        ) : (
          <>
            {/* Document preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                {document.type === 'pdf' ? (
                  <FileText className="w-12 h-12 text-primary" />
                ) : (
                  <Image className="w-12 h-12 text-primary" />
                )}
              </div>
              
              <h2 className="text-lg font-semibold text-foreground text-center mb-1">
                {document.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {document.type === 'pdf' ? 'Document PDF' : 'Image'} • {formatSize(document.size)}
              </p>
            </motion.div>

            {/* Security info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl"
            >
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Transfert sécurisé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ce document a été partagé via DocSafe. Aucun serveur n'a été utilisé pour ce transfert.
                </p>
              </div>
            </motion.div>

            {/* Download button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Télécharger le document
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
