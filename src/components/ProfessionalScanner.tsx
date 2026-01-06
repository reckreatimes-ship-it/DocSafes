import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, X, RotateCcw, Check, AlertCircle, Settings, Plus, FileText, 
  Trash2, Crop, Sun, Contrast, Palette, ZoomIn, ZoomOut, Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { jsPDF } from 'jspdf';
import { categories } from '@/lib/categories';
import { cn } from '@/lib/utils';

interface ProcessedPage {
  original: string;
  processed: string;
  brightness: number;
  contrast: number;
  mode: 'color' | 'grayscale' | 'bw';
}

interface ProfessionalScannerProps {
  onComplete: (file: File, preview: string, name: string, category: string) => void;
  onClose: () => void;
}

type ScanStep = 'capture' | 'edit' | 'finalize';

export function ProfessionalScanner({ onComplete, onClose }: ProfessionalScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<ScanStep>('capture');
  const [pages, setPages] = useState<ProcessedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  
  // Camera state
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // Edit state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [colorMode, setColorMode] = useState<'color' | 'grayscale' | 'bw'>('color');
  
  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 });
  
  // Finalize state
  const [documentName, setDocumentName] = useState(`Scan ${new Date().toLocaleDateString('fr-FR')}`);
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    setIsRequestingPermission(true);
    setCameraError(null);
    
    try {
      try {
        const { Camera: CapCamera } = await import('@capacitor/camera');
        const permissions = await CapCamera.requestPermissions({ permissions: ['camera'] });
        
        if (permissions.camera === 'granted') {
          setHasPermission(true);
          setIsRequestingPermission(false);
          return;
        } else if (permissions.camera === 'denied') {
          setCameraError('Accès à la caméra refusé.');
          setHasPermission(false);
          setIsRequestingPermission(false);
          return;
        }
      } catch {
        console.log('Capacitor not available, using web API');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (error: any) {
      setHasPermission(false);
      if (error.name === 'NotAllowedError') {
        setCameraError('Accès à la caméra refusé.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée.');
      } else {
        setCameraError('Erreur lors de l\'accès à la caméra.');
      }
    }
    setIsRequestingPermission(false);
  };

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: { ideal: facingMode },
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCurrentCapture(imageSrc);
    }
  }, []);

  const confirmCapture = () => {
    if (!currentCapture) return;
    
    const newPage: ProcessedPage = {
      original: currentCapture,
      processed: currentCapture,
      brightness: 100,
      contrast: 100,
      mode: 'color'
    };
    
    setPages(prev => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
    setCurrentCapture(null);
    setStep('edit');
    setBrightness(100);
    setContrast(100);
    setColorMode('color');
  };

  const retakeCapture = () => {
    setCurrentCapture(null);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Image processing
  const processImage = useCallback(async (
    imageData: string, 
    brightnessVal: number, 
    contrastVal: number, 
    mode: 'color' | 'grayscale' | 'bw',
    crop?: { x: number; y: number; width: number; height: number }
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Apply crop if specified
        const sx = crop ? (crop.x / 100) * img.width : 0;
        const sy = crop ? (crop.y / 100) * img.height : 0;
        const sw = crop ? (crop.width / 100) * img.width : img.width;
        const sh = crop ? (crop.height / 100) * img.height : img.height;
        
        canvas.width = sw;
        canvas.height = sh;
        
        // Draw cropped image
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        
        // Apply filters
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const brightnessFactor = brightnessVal / 100;
        const contrastFactor = (contrastVal - 100) * 2.55;
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // Apply brightness
          r = r * brightnessFactor;
          g = g * brightnessFactor;
          b = b * brightnessFactor;
          
          // Apply contrast
          r = ((r - 128) * (1 + contrastFactor / 128)) + 128;
          g = ((g - 128) * (1 + contrastFactor / 128)) + 128;
          b = ((b - 128) * (1 + contrastFactor / 128)) + 128;
          
          // Apply color mode
          if (mode === 'grayscale' || mode === 'bw') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            if (mode === 'bw') {
              const threshold = 128;
              const bwValue = gray > threshold ? 255 : 0;
              r = g = b = bwValue;
            } else {
              r = g = b = gray;
            }
          }
          
          // Clamp values
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = imageData;
    });
  }, []);

  const applyEdits = useCallback(async () => {
    if (pages.length === 0) return;
    
    const currentPage = pages[currentPageIndex];
    const processed = await processImage(
      currentPage.original, 
      brightness, 
      contrast, 
      colorMode
    );
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      processed,
      brightness,
      contrast,
      mode: colorMode
    };
    setPages(updatedPages);
  }, [pages, currentPageIndex, brightness, contrast, colorMode, processImage]);

  useEffect(() => {
    if (step === 'edit' && pages.length > 0) {
      const debounce = setTimeout(() => {
        applyEdits();
      }, 100);
      return () => clearTimeout(debounce);
    }
  }, [brightness, contrast, colorMode, applyEdits, step]);

  const applyCrop = async () => {
    if (pages.length === 0) return;
    
    const currentPage = pages[currentPageIndex];
    const cropped = await processImage(
      currentPage.original,
      currentPage.brightness,
      currentPage.contrast,
      currentPage.mode,
      cropArea
    );
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      original: cropped,
      processed: cropped
    };
    setPages(updatedPages);
    setIsCropping(false);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
  };

  const removePage = (index: number) => {
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(Math.max(0, newPages.length - 1));
    }
    if (newPages.length === 0) {
      setStep('capture');
    }
  };

  const addMorePages = () => {
    setStep('capture');
  };

  const goToFinalize = () => {
    setStep('finalize');
  };

  const generateDocument = async () => {
    if (pages.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      if (pages.length === 1) {
        // Single image - save as JPG
        const response = await fetch(pages[0].processed);
        const blob = await response.blob();
        const file = new File([blob], `${documentName}.jpg`, { type: 'image/jpeg' });
        onComplete(file, pages[0].processed, documentName, selectedCategory);
      } else {
        // Multiple pages - create PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();

          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.src = pages[i].processed;
          });

          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;

          let drawWidth = pageWidth;
          let drawHeight = pageHeight;

          if (imgRatio > pageRatio) {
            drawHeight = pageWidth / imgRatio;
          } else {
            drawWidth = pageHeight * imgRatio;
          }

          const x = (pageWidth - drawWidth) / 2;
          const y = (pageHeight - drawHeight) / 2;

          pdf.addImage(pages[i].processed, 'JPEG', x, y, drawWidth, drawHeight);
        }

        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `${documentName}.pdf`, { type: 'application/pdf' });
        onComplete(file, pages[0].processed, documentName, selectedCategory);
      }
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentPage = pages[currentPageIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border safe-area-top">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary">
          <X className="w-6 h-6" />
        </button>
        <span className="font-medium">
          {step === 'capture' && 'Scanner'}
          {step === 'edit' && `Édition (${currentPageIndex + 1}/${pages.length})`}
          {step === 'finalize' && 'Finaliser'}
        </span>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* CAPTURE STEP */}
          {step === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 relative bg-black">
                {cameraError ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <p className="text-foreground">{cameraError}</p>
                    <Button onClick={requestCameraPermission} disabled={isRequestingPermission}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Réessayer
                    </Button>
                  </div>
                ) : currentCapture ? (
                  <img src={currentCapture} alt="Capture" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      className="w-full h-full object-cover"
                      screenshotQuality={0.95}
                      onUserMediaError={() => setCameraError('Accès refusé')}
                    />
                    {/* Document guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[85%] aspect-[3/4] border-2 border-white/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Pages strip */}
              {pages.length > 0 && !currentCapture && (
                <div className="p-3 bg-secondary/50 border-t border-border">
                  <div className="flex gap-2 overflow-x-auto">
                    {pages.map((page, index) => (
                      <div key={index} className="relative shrink-0">
                        <img 
                          src={page.processed} 
                          alt={`Page ${index + 1}`}
                          className="w-14 h-18 object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => removePage(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capture controls */}
              <div className="p-4 bg-background border-t border-border safe-area-bottom">
                {currentCapture ? (
                  <div className="flex items-center justify-center gap-4">
                    <Button variant="outline" size="lg" onClick={retakeCapture}>
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Reprendre
                    </Button>
                    <Button size="lg" onClick={confirmCapture} className="gradient-primary">
                      <Check className="w-5 h-5 mr-2" />
                      Utiliser
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    {pages.length > 0 && (
                      <Button size="lg" onClick={goToFinalize} className="gradient-primary">
                        <FileText className="w-5 h-5 mr-2" />
                        Terminer ({pages.length})
                      </Button>
                    )}
                    
                    <button
                      onClick={capture}
                      disabled={!hasPermission}
                      className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:scale-95 transition-transform disabled:opacity-50"
                    >
                      <Camera className="w-7 h-7 text-primary-foreground" />
                    </button>
                    
                    <button onClick={toggleCamera} className="p-3 rounded-full bg-secondary">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* EDIT STEP */}
          {step === 'edit' && currentPage && (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Image preview */}
              <div className="flex-1 relative bg-secondary overflow-hidden">
                <img 
                  src={currentPage.processed} 
                  alt="Edit" 
                  className="w-full h-full object-contain"
                />
                
                {/* Crop overlay */}
                {isCropping && (
                  <div className="absolute inset-0 bg-black/50">
                    <div 
                      className="absolute border-2 border-primary bg-transparent"
                      style={{
                        left: `${cropArea.x}%`,
                        top: `${cropArea.y}%`,
                        width: `${cropArea.width}%`,
                        height: `${cropArea.height}%`
                      }}
                    >
                      {/* Crop handles would go here for a full implementation */}
                    </div>
                  </div>
                )}
              </div>

              {/* Page thumbnails */}
              <div className="p-3 bg-secondary/30 border-t border-border">
                <div className="flex gap-2 overflow-x-auto">
                  {pages.map((page, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentPageIndex(index);
                        setBrightness(page.brightness);
                        setContrast(page.contrast);
                        setColorMode(page.mode);
                      }}
                      className={cn(
                        "relative shrink-0 rounded-lg overflow-hidden border-2 transition-colors",
                        index === currentPageIndex ? "border-primary" : "border-transparent"
                      )}
                    >
                      <img 
                        src={page.processed} 
                        alt={`Page ${index + 1}`}
                        className="w-12 h-16 object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 text-xs bg-black/60 text-white px-1 rounded">
                        {index + 1}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={addMorePages}
                    className="w-12 h-16 shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Edit controls */}
              <div className="p-4 space-y-4 bg-background border-t border-border">
                {/* Color mode buttons */}
                <div className="flex gap-2">
                  {[
                    { mode: 'color' as const, label: 'Couleur', icon: Palette },
                    { mode: 'grayscale' as const, label: 'Gris', icon: Contrast },
                    { mode: 'bw' as const, label: 'N&B', icon: FileText },
                  ].map(({ mode, label, icon: ModeIcon }) => (
                    <button
                      key={mode}
                      onClick={() => setColorMode(mode)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors",
                        colorMode === mode 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      <ModeIcon className="w-4 h-4" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Brightness slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Luminosité
                    </Label>
                    <span className="text-sm text-muted-foreground">{brightness}%</span>
                  </div>
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) => setBrightness(v)}
                    min={50}
                    max={150}
                    step={5}
                  />
                </div>

                {/* Contrast slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Contrast className="w-4 h-4" />
                      Contraste
                    </Label>
                    <span className="text-sm text-muted-foreground">{contrast}%</span>
                  </div>
                  <Slider
                    value={[contrast]}
                    onValueChange={([v]) => setContrast(v)}
                    min={50}
                    max={150}
                    step={5}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => removePage(currentPageIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                  <Button 
                    className="flex-1 gradient-primary" 
                    onClick={goToFinalize}
                  >
                    Continuer
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FINALIZE STEP */}
          {step === 'finalize' && (
            <motion.div
              key="finalize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col p-4 overflow-y-auto"
            >
              {/* Preview */}
              <div className="aspect-video rounded-xl overflow-hidden bg-secondary mb-6">
                {pages.length > 0 && (
                  <img 
                    src={pages[0].processed} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Pages count */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-secondary rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm">
                  {pages.length} page{pages.length > 1 ? 's' : ''} • 
                  {pages.length > 1 ? ' PDF' : ' Image JPG'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => setStep('edit')}
                >
                  Modifier
                </Button>
              </div>

              {/* Document name */}
              <div className="space-y-2 mb-6">
                <Label>Nom du document</Label>
                <Input
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Mon document"
                  className="h-12"
                />
              </div>

              {/* Category selection */}
              <div className="space-y-3 mb-6">
                <Label>Catégorie</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelected = selectedCategory === category.id;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: category.color + '20', color: category.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium truncate">{category.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save button */}
              <div className="mt-auto pt-4 safe-area-bottom">
                <Button
                  onClick={generateDocument}
                  disabled={!documentName.trim() || isGenerating}
                  className="w-full h-12 gradient-primary"
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  🔒 Document chiffré en AES-256, stocké localement uniquement
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}