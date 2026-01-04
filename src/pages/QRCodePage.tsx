import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { getDocument, Document, getSetting } from '@/lib/storage';
import { getCategoryById } from '@/lib/categories';
import { useAuth } from '@/contexts/AuthContext';
import { decryptData } from '@/lib/crypto';
import { base64ToArrayBuffer, base64ToUint8Array, arrayBufferToBase64 } from '@/lib/base64';

const MAX_QR_SIZE = 2000; // Maximum characters for QR code
const DEFAULT_DURATION = 60; // Default 60 seconds

export function QRCodePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { encryptionKey } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrValue, setQrValue] = useState<string>('');
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [isExpired, setIsExpired] = useState(false);
  const [isTooLarge, setIsTooLarge] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (documentId && encryptionKey) {
      loadDocumentAndGenerateQR();
    }
  }, [documentId, encryptionKey]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const loadDocumentAndGenerateQR = async () => {
    if (!documentId || !encryptionKey) return;

    try {
      // Load QR duration setting
      const savedDuration = await getSetting('qrDuration');
      const qrDuration = savedDuration ? parseInt(savedDuration) : DEFAULT_DURATION;
      setDuration(qrDuration);
      setTimeLeft(qrDuration);

      const doc = await getDocument(documentId);
      setDocument(doc || null);
      
      if (doc) {
        await generateQRCode(doc, qrDuration);
      }
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async (doc: Document, qrDuration: number = duration) => {
    try {
      // Decrypt the document data
      const encryptedBuffer = base64ToArrayBuffer(doc.encryptedData);
      const iv = base64ToUint8Array(doc.iv);
      const decryptedData = await decryptData(encryptedBuffer, encryptionKey!, iv);
      
      // Convert to base64 for sharing
      const fileBase64 = arrayBufferToBase64(decryptedData);
      
      // Create share data
      const shareData = {
        name: doc.name,
        type: doc.type,
        mimeType: doc.mimeType,
        data: fileBase64,
        size: doc.size
      };
      
      const encodedData = btoa(JSON.stringify(shareData));
      const expiryTime = Date.now() + (qrDuration * 1000);
      
      // Build the URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/receive?d=${encodeURIComponent(encodedData)}&e=${expiryTime}`;
      
      // Check if the URL is too large for QR code
      if (shareUrl.length > MAX_QR_SIZE) {
        setIsTooLarge(true);
        // Generate a simple token-based QR for large files
        const tempToken = crypto.randomUUID().slice(0, 8).toUpperCase();
        setToken(tempToken);
        setQrValue(`${baseUrl}/receive?token=${tempToken}&size=large`);
      } else {
        setIsTooLarge(false);
        setQrValue(shareUrl);
      }
      
      setTimeLeft(qrDuration);
      setIsExpired(false);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const regenerateQR = async () => {
    if (document && encryptionKey) {
      const savedDuration = await getSetting('qrDuration');
      const qrDuration = savedDuration ? parseInt(savedDuration) : DEFAULT_DURATION;
      setDuration(qrDuration);
      generateQRCode(document, qrDuration);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Header title="QR Code" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <Header title="QR Code" showBack />
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
      <Header title="Partage QR" showBack />

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

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <div className={`p-6 bg-card rounded-2xl border ${isExpired ? 'border-destructive/50' : 'border-border'} relative`}>
            {isExpired && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                <div className="text-center">
                  <p className="text-destructive font-medium mb-2">QR Code expiré</p>
                  <Button onClick={regenerateQR} size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Régénérer
                  </Button>
                </div>
              </div>
            )}
            
            {qrValue && (
              <QRCodeSVG
                value={qrValue}
                size={200}
                level="L"
                includeMargin
                className="rounded-lg"
              />
            )}
          </div>

          {/* Timer */}
          <motion.div
            animate={{ scale: timeLeft <= 10 ? [1, 1.1, 1] : 1 }}
            transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 1 }}
            className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-full ${
              timeLeft <= 10 ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono font-medium">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </motion.div>

          {isTooLarge && (
            <p className="text-xs text-muted-foreground mt-2">
              Token: <span className="font-mono font-bold">{token}</span>
            </p>
          )}
        </motion.div>

        {/* Warning for large files */}
        {isTooLarge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 p-4 bg-warning/10 rounded-xl"
          >
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Fichier volumineux</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ce fichier est trop volumineux pour être intégré au QR code. Utilisez le partage classique pour les gros fichiers.
              </p>
            </div>
          </motion.div>
        )}

        {/* Security info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl"
        >
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Transfert direct</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scannez ce QR code avec n'importe quelle app de scan. Le document sera téléchargé directement sans passer par un serveur.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
