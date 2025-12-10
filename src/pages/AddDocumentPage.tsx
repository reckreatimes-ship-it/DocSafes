import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, FileText, Image as ImageIcon, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categories } from '@/lib/categories';
import { saveDocument, Document } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { encryptData, exportKey } from '@/lib/crypto';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type Step = 'select' | 'category' | 'details';

export function AddDocumentPage() {
  const navigate = useNavigate();
  const { encryptionKey } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<Step>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [documentName, setDocumentName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Format non supporté',
        description: 'Veuillez sélectionner un fichier PDF, JPG ou PNG.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    setDocumentName(file.name.replace(/\.[^/.]+$/, ''));

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setStep('category');
  };

  const handleCameraCapture = () => {
    // For now, just open file picker with camera option
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !selectedCategory || !documentName || !encryptionKey) return;

    setIsProcessing(true);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Encrypt the file
      const { encrypted, iv } = await encryptData(arrayBuffer, encryptionKey);
      
      // Convert to base64 for storage
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      const ivBase64 = btoa(String.fromCharCode(...iv));

      // Create document record
      const doc: Document = {
        id: crypto.randomUUID(),
        name: documentName,
        category: selectedCategory,
        type: selectedFile.type === 'application/pdf' ? 'pdf' : 'image',
        mimeType: selectedFile.type,
        size: selectedFile.size,
        encryptedData: encryptedBase64,
        iv: ivBase64,
        thumbnail: preview || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await saveDocument(doc);

      toast({
        title: 'Document ajouté',
        description: 'Votre document a été chiffré et sauvegardé localement.'
      });

      navigate('/home');
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le document.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <Header title="Ajouter un document" showBack />

      <div className="px-4 py-6">
        {step === 'select' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <p className="text-muted-foreground text-center">
              Choisissez comment ajouter votre document
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Upload from files */}
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = '.pdf,image/jpeg,image/png,image/webp';
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-4 p-6 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Importer</p>
                  <p className="text-sm text-muted-foreground">PDF, JPG, PNG</p>
                </div>
              </button>

              {/* Camera scan */}
              <button
                onClick={handleCameraCapture}
                className="flex flex-col items-center gap-4 p-6 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Scanner</p>
                  <p className="text-sm text-muted-foreground">Prendre une photo</p>
                </div>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </motion.div>
        )}

        {step === 'category' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* File preview */}
            {selectedFile && (
              <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {selectedFile.type === 'application/pdf' ? (
                    <FileText className="w-6 h-6 text-primary" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Choisissez une catégorie
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {categories.map((category, index) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;
                  
                  return (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border bg-card hover:border-primary/30"
                      )}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: category.color + '20', color: category.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-foreground text-sm truncate">
                        {category.name}
                      </span>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary ml-auto shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => setStep('details')}
              disabled={!selectedCategory}
              className="w-full gradient-primary h-12 text-base"
            >
              Continuer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Preview */}
            {preview && (
              <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-foreground">
                  Nom du document
                </Label>
                <Input
                  id="name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Mon document"
                  className="mt-2 h-12 bg-secondary border-0"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('category')}
                className="flex-1 h-12"
              >
                Retour
              </Button>
              <Button
                onClick={handleSave}
                disabled={!documentName || isProcessing}
                className="flex-1 gradient-primary h-12"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              🔒 Ce document sera chiffré en AES-256 et stocké uniquement sur votre appareil.
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
