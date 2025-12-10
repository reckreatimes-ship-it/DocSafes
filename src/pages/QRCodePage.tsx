import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, RefreshCw, Shield, Wifi, Bluetooth } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { getDocument, Document } from '@/lib/storage';
import { getCategoryById } from '@/lib/categories';

export function QRCodePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (documentId) {
      loadDocument();
      generateToken();
    }
  }, [documentId]);

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

  const generateToken = () => {
    // Generate a temporary token (NOT the actual file)
    const tempToken = crypto.randomUUID().slice(0, 8).toUpperCase();
    setToken(tempToken);
    setTimeLeft(60);
    setIsExpired(false);
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
  const qrValue = JSON.stringify({
    token,
    docId: document.id,
    type: 'docwallet-share',
    expires: Date.now() + timeLeft * 1000
  });

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
                  <Button onClick={generateToken} size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Régénérer
                  </Button>
                </div>
              </div>
            )}
            
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="H"
              includeMargin
              className="rounded-lg"
            />
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

          <p className="text-xs text-muted-foreground mt-2">
            Code temporaire: <span className="font-mono font-bold">{token}</span>
          </p>
        </motion.div>

        {/* Transfer methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Méthodes de transfert
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Wi-Fi Direct</p>
                <p className="text-xs text-muted-foreground">Rapide</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bluetooth className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Bluetooth</p>
                <p className="text-xs text-muted-foreground">Universel</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-3 p-4 bg-primary/10 rounded-xl"
        >
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Transfert chiffré</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le QR code contient uniquement un token temporaire. Le document sera transféré de manière chiffrée via Wi-Fi Direct ou Bluetooth.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
