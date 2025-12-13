import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { Camera, X, RotateCcw, Check, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export function Scanner({ onCapture, onClose }: ScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check camera permission on mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    setIsRequestingPermission(true);
    setCameraError(null);
    
    try {
      // First try using Capacitor Camera plugin for native permissions
      try {
        const { Camera: CapCamera } = await import('@capacitor/camera');
        const permissions = await CapCamera.requestPermissions({ permissions: ['camera'] });
        
        if (permissions.camera === 'granted') {
          setHasPermission(true);
          setIsRequestingPermission(false);
          return;
        } else if (permissions.camera === 'denied') {
          setCameraError('Accès à la caméra refusé. Ouvrez les paramètres de votre téléphone pour autoriser l\'accès.');
          setHasPermission(false);
          setIsRequestingPermission(false);
          return;
        }
      } catch (capacitorError) {
        console.log('Capacitor not available, using web API');
      }
      
      // Fallback to web API
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
        setCameraError('Accès à la caméra refusé. Ouvrez les paramètres de votre téléphone pour autoriser l\'accès à DocSafe.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('Aucune caméra détectée sur cet appareil.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('La caméra est utilisée par une autre application.');
      } else {
        setCameraError('Erreur lors de l\'accès à la caméra. Veuillez réessayer.');
      }
    }
    setIsRequestingPermission(false);
  };

  const openAppSettings = () => {
    // On native platforms, guide user to open settings
    // This message helps users understand what to do
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
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const retake = () => {
    setCapturedImage(null);
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleUserMediaError = (error: string | DOMException) => {
    console.error('Webcam error:', error);
    setHasPermission(false);
    setCameraError('Accès à la caméra refusé. Ouvrez les paramètres pour autoriser l\'accès.');
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
        <span className="text-white font-medium">Scanner un document</span>
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
                Ouvrir les paramètres
              </Button>
            </div>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
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
      {!capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85%] aspect-[3/4] border-2 border-white/50 rounded-lg">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {!cameraError && (
        <div className="absolute bottom-0 left-0 right-0 p-6 safe-area-bottom">
          {capturedImage ? (
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
                onClick={confirm}
                className="gradient-primary"
              >
                <Check className="w-5 h-5 mr-2" />
                Utiliser
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
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
            Placez le document dans le cadre
          </p>
        </div>
      )}
    </motion.div>
  );
}
