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
import { 
  initializeCameraForScanner, 
  openAppSettings,
  isNativePlatform 
} from '@/lib/cameraPermissions';

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
type CameraState = 'initializing' | 'ready' | 'error' | 'denied' | 'permanently_denied';

export function ProfessionalScanner({ onComplete, onClose }: ProfessionalScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  
  const [step, setStep] = useState<ScanStep>('capture');
  const [pages, setPages] = useState<ProcessedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  
  // Camera state - simplified and robust
  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [webcamReady, setWebcamReady] = useState(false);
  
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

  // Initialize camera with proper permission handling
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      setCameraState('initializing');
      setCameraError(null);
      
      console.log('[Scanner] Initializing camera...');
      
      const result = await initializeCameraForScanner();
      
      if (!mounted) return;
      
      if (result.success) {
        console.log('[Scanner] Camera initialized successfully');
        setCameraState('ready');
      } else {
        console.error('[Scanner] Camera initialization failed:', result.error);
        setCameraError(result.error || 'Erreur d\'initialisation de la caméra');
        setCameraState(result.permanentlyDenied ? 'permanently_denied' : 'denied');
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
    };
  }, []);

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: { ideal: facingMode },
  };

  const handleUserMedia = useCallback(() => {
    console.log('[Scanner] Webcam stream started');
    setWebcamReady(true);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error('[Scanner] Webcam error:', error);
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
      setCameraError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
      setCameraState('denied');
    } else if (errorMessage.includes('NotFound') || errorMessage.includes('DevicesNotFound')) {
      setCameraError('Aucune caméra détectée sur cet appareil.');
      setCameraState('error');
    } else {
      setCameraError(`Erreur de caméra: ${errorMessage}`);
      setCameraState('error');
    }
  }, []);

  const retryCamera = useCallback(async () => {
    setCameraState('initializing');
    setCameraError(null);
    setWebcamReady(false);
    
    const result = await initializeCameraForScanner();
    
    if (result.success) {
      setCameraState('ready');
    } else {
      setCameraError(result.error || 'Erreur');
      setCameraState(result.permanentlyDenied ? 'permanently_denied' : 'denied');
    }
  }, []);

  const capture = useCallback(() => {
    if (!webcamRef.current || !webcamReady) {
      console.warn('[Scanner] Cannot capture - webcam not ready');
      return;
    }
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      console.log('[Scanner] Captured image');
      setCurrentCapture(imageSrc);
    }
  }, [webcamReady]);

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
    setWebcamReady(false);
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
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;
        
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
        
        ctx.putImageData(imageDataObj, 0, 0);
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

  // Render camera error/permission state
  const renderCameraError = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center bg-black">
      <AlertCircle className="w-16 h-16 text-destructive" />
      <p className="text-lg font-medium text-foreground">{cameraError}</p>
      
      {cameraState === 'permanently_denied' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            La permission a été refusée définitivement. 
            Veuillez l'activer manuellement dans les paramètres.
          </p>
          <Button onClick={openAppSettings} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Ouvrir les paramètres
          </Button>
          <Button onClick={retryCamera} variant="ghost">
            <RotateCcw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      ) : (
        <Button onClick={retryCamera} disabled={cameraState === 'initializing'}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {cameraState === 'initializing' ? 'Initialisation...' : 'Réessayer'}
        </Button>
      )}
    </div>
  );

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
                {/* Camera loading/error states */}
                {cameraState === 'initializing' && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Initialisation de la caméra...</p>
                  </div>
                )}
                
                {(cameraState === 'error' || cameraState === 'denied' || cameraState === 'permanently_denied') && 
                  renderCameraError()
                }
                
                {/* Current capture preview */}
                {cameraState === 'ready' && currentCapture && (
                  <img src={currentCapture} alt="Capture" className="w-full h-full object-contain" />
                )}
                
                {/* Live webcam feed */}
                {cameraState === 'ready' && !currentCapture && (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      className="w-full h-full object-cover"
                      screenshotQuality={0.95}
                      onUserMedia={handleUserMedia}
                      onUserMediaError={handleUserMediaError}
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
                    
                    {/* Loading indicator for webcam */}
                    {!webcamReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Pages strip */}
              {pages.length > 0 && !currentCapture && cameraState === 'ready' && (
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
                      disabled={cameraState !== 'ready' || !webcamReady}
                      className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-7 h-7 text-primary-foreground" />
                    </button>
                    
                    <button 
                      onClick={toggleCamera} 
                      disabled={cameraState !== 'ready'}
                      className="p-3 rounded-full bg-secondary disabled:opacity-50"
                    >
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
              <div className="flex-1 relative bg-black overflow-hidden">
                {isCropping ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={currentPage.original} 
                      alt="Original" 
                      className="w-full h-full object-contain opacity-50"
                    />
                    {/* Crop overlay */}
                    <div 
                      className="absolute border-2 border-primary bg-transparent"
                      style={{
                        left: `${cropArea.x}%`,
                        top: `${cropArea.y}%`,
                        width: `${cropArea.width}%`,
                        height: `${cropArea.height}%`
                      }}
                    >
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full" />
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full" />
                      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary rounded-full" />
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full" />
                    </div>
                  </div>
                ) : (
                  <img 
                    src={currentPage.processed} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Page thumbnails */}
              {pages.length > 1 && (
                <div className="p-3 bg-secondary/50 border-t border-border">
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
                          "relative shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                          index === currentPageIndex ? "border-primary" : "border-transparent"
                        )}
                      >
                        <img 
                          src={page.processed} 
                          alt={`Page ${index + 1}`}
                          className="w-14 h-18 object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                          {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit controls */}
              <div className="p-4 bg-background border-t border-border space-y-4 max-h-[40vh] overflow-y-auto">
                {isCropping ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Position X (%)</Label>
                        <Slider
                          value={[cropArea.x]}
                          onValueChange={([v]) => setCropArea(prev => ({ ...prev, x: v }))}
                          min={0}
                          max={90}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Position Y (%)</Label>
                        <Slider
                          value={[cropArea.y]}
                          onValueChange={([v]) => setCropArea(prev => ({ ...prev, y: v }))}
                          min={0}
                          max={90}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Largeur (%)</Label>
                        <Slider
                          value={[cropArea.width]}
                          onValueChange={([v]) => setCropArea(prev => ({ ...prev, width: v }))}
                          min={10}
                          max={100 - cropArea.x}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hauteur (%)</Label>
                        <Slider
                          value={[cropArea.height]}
                          onValueChange={([v]) => setCropArea(prev => ({ ...prev, height: v }))}
                          min={10}
                          max={100 - cropArea.y}
                          step={1}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsCropping(false)}>
                        Annuler
                      </Button>
                      <Button className="flex-1" onClick={applyCrop}>
                        Appliquer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Color mode */}
                    <div>
                      <Label className="text-xs mb-2 block">Mode couleur</Label>
                      <div className="flex gap-2">
                        {(['color', 'grayscale', 'bw'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setColorMode(mode)}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                              colorMode === mode 
                                ? "border-primary bg-primary/10 text-primary" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {mode === 'color' && 'Couleur'}
                            {mode === 'grayscale' && 'N&B'}
                            {mode === 'bw' && 'Document'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Brightness */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Sun className="w-3 h-3" />
                          Luminosité
                        </Label>
                        <span className="text-xs text-muted-foreground">{brightness}%</span>
                      </div>
                      <Slider
                        value={[brightness]}
                        onValueChange={([v]) => setBrightness(v)}
                        min={50}
                        max={150}
                        step={5}
                      />
                    </div>

                    {/* Contrast */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Contrast className="w-3 h-3" />
                          Contraste
                        </Label>
                        <span className="text-xs text-muted-foreground">{contrast}%</span>
                      </div>
                      <Slider
                        value={[contrast]}
                        onValueChange={([v]) => setContrast(v)}
                        min={50}
                        max={150}
                        step={5}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setIsCropping(true)}>
                        <Crop className="w-4 h-4 mr-1" />
                        Recadrer
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removePage(currentPageIndex)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={addMorePages}>
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter une page
                      </Button>
                      <Button className="flex-1 gradient-primary" onClick={goToFinalize}>
                        <Check className="w-4 h-4 mr-1" />
                        Terminer
                      </Button>
                    </div>
                  </>
                )}
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
              className="h-full flex flex-col p-4"
            >
              {/* Preview */}
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="relative">
                  <img 
                    src={pages[0]?.processed} 
                    alt="Preview" 
                    className="max-h-[40vh] object-contain rounded-lg shadow-lg"
                  />
                  {pages.length > 1 && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {pages.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="docName">Nom du document</Label>
                  <Input
                    id="docName"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Nom du document"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Catégorie</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {categories.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all",
                            selectedCategory === cat.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div style={{ color: cat.color }}><cat.icon className="w-5 h-5" /></div>
                          <span className="truncate w-full text-center">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setStep('edit')}
                  >
                    Retour
                  </Button>
                  <Button 
                    className="flex-1 gradient-primary"
                    onClick={generateDocument}
                    disabled={isGenerating || !documentName.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {pages.length > 1 ? 'Créer le PDF' : 'Enregistrer'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
