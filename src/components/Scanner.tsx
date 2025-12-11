import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { Camera, X, RotateCcw, Check, Flashlight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export function Scanner({ onCapture, onClose }: ScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoConstraints = {
    width: 1920,
    height: 1080,
    facingMode: facingMode,
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

      {/* Camera or Preview */}
      <div className="absolute inset-0 flex items-center justify-center">
        {capturedImage ? (
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
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:scale-95 transition-transform active:scale-90"
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
    </motion.div>
  );
}
