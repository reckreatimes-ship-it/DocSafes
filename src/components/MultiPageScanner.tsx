import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RotateCcw, Check, AlertCircle, Settings, Plus, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';

interface MultiPageScannerProps {
  onComplete: (file: File, preview: string) => void;
  onClose: () => void;
}

export function MultiPageScanner({ onComplete, onClose }: MultiPageScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [currentCapture, setCurrentCapture] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
          setCameraError('Accès à la caméra refusé. Ouvrez les paramètres pour autoriser l\'accès.');
          setHasPermission(false);
          setIsRequestingPermission(false);
          return;
        }
      } catch (capacitorError) {
        console.log('Capacitor not available, using web API');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setCameraError(null);
    } catch (error: any) {
      console.error('Camera permission error:', error);
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

  const openAppSettings = () => {
    alert('Pour autoriser l\'accès à la caméra :\n\n1. Ouvrez les Paramètres de votre téléphone\n2. Allez dans Applications > DocSafe\n3. Activez la permission Caméra\n4. Revenez dans l\'application');
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
  }, [webcamRef]);

  const confirmPage = () => {
    if (currentCapture) {
      setCapturedPages(prev => [...prev, currentCapture]);
      setCurrentCapture(null);
    }
  };

  const retake = () => {
    setCurrentCapture(null);
  };

  const removePage = (index: number) => {
    setCapturedPages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleUserMediaError = () => {
    setHasPermission(false);
    setCameraError('Accès à la caméra refusé.');
  };

  const generatePdf = async () => {
    if (capturedPages.length === 0) return;

    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < capturedPages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const imgData = capturedPages[i];
        
        // Load image to get dimensions
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.src = imgData;
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

        pdf.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight);
      }

      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `scan_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      // Generate preview from first page
      const preview = capturedPages[0];
      
      onComplete(file, preview);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 safe-area-top">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-medium">
          {capturedPages.length > 0 
            ? `${capturedPages.length} page${capturedPages.length > 1 ? 's' : ''} scannée${capturedPages.length > 1 ? 's' : ''}` 
            : 'Scanner multi-pages'
          }
        </span>
        <button
          onClick={toggleCamera}
          className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      {/* Camera or Preview or Error */}
      <div className="absolute inset-0 flex items-center justify-center">
        {cameraError ? (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-white max-w-xs">{cameraError}</p>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={requestCameraPermission}
                disabled={isRequestingPermission}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                {isRequestingPermission ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Réessayer
              </Button>
              <Button
                variant="outline"
                onClick={openAppSettings}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </Button>
            </div>
          </div>
        ) : currentCapture ? (
          <img 
            src={currentCapture} 
            alt="Captured" 
            className="w-full h-full object-contain"
          />
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
            screenshotQuality={0.95}
            onUserMediaError={handleUserMediaError}
          />
        )}
      </div>

      {/* Scan overlay guide */}
      {!currentCapture && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85%] aspect-[3/4] border-2 border-white/50 rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
          </div>
        </div>
      )}

      {/* Pages thumbnail strip */}
      {capturedPages.length > 0 && !currentCapture && (
        <div className="absolute left-4 right-4 bottom-36 z-10">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {capturedPages.map((page, index) => (
              <div key={index} className="relative shrink-0">
                <img 
                  src={page} 
                  alt={`Page ${index + 1}`}
                  className="w-16 h-20 object-cover rounded-lg border-2 border-white/30"
                />
                <button
                  onClick={() => removePage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-1 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {!cameraError && (
        <div className="absolute bottom-0 left-0 right-0 p-6 safe-area-bottom">
          {currentCapture ? (
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="lg"
                onClick={retake}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reprendre
              </Button>
              <Button
                size="lg"
                onClick={confirmPage}
                className="gradient-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              {capturedPages.length > 0 && (
                <Button
                  size="lg"
                  onClick={generatePdf}
                  disabled={isGeneratingPdf}
                  className="gradient-primary"
                >
                  {isGeneratingPdf ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <FileText className="w-5 h-5 mr-2" />
                  )}
                  Créer PDF ({capturedPages.length})
                </Button>
              )}
              
              <button
                onClick={capture}
                disabled={!hasPermission}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:scale-95 transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
              </button>
            </div>
          )}
          
          <p className="text-center text-white/70 text-sm mt-4">
            {capturedPages.length === 0 
              ? 'Scannez la première page' 
              : 'Ajoutez d\'autres pages ou créez le PDF'
            }
          </p>
        </div>
      )}
    </motion.div>
  );
}