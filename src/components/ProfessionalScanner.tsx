import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Settings,
  Plus,
  FileText,
  Trash2,
  Crop,
  Sun,
  Contrast,
  Zap,
  Focus,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { jsPDF } from 'jspdf';
import { categories } from '@/lib/categories';
import { cn } from '@/lib/utils';
import {
  initializeCameraForScanner,
  openAppSettings,
  isAndroidNative,
} from '@/lib/cameraPermissions';
import {
  detectDocument,
  resetDetection,
  applyPerspectiveCorrection,
  enhanceDocument,
  Quadrilateral,
  DetectionResult,
} from '@/lib/documentDetection';
import {
  canvasToJpegBlob,
  blobToObjectUrl,
  safeRevokeObjectUrl,
  constrainSize,
  drawImageToCanvas,
  getCssHsl,
} from '@/lib/imageBlobs';

interface ScanPage {
  processedUrl: string; // blob: URL
  bytes: number;
  brightness: number;
  contrast: number;
  mode: 'color' | 'grayscale' | 'bw';
}

interface ProfessionalScannerProps {
  onComplete: (file: File, preview: string, name: string, category: string) => void;
  onClose: () => void;
}

type ScanStep = 'capture' | 'edit' | 'finalize';
type CameraState =
  | 'initializing'
  | 'ready'
  | 'error'
  | 'denied'
  | 'permanently_denied';

const ANDROID_CAPTURE_MAX_SIDE = 1200;
const WEB_CAPTURE_MAX_SIDE = 1600;
const PDF_MAX_SIDE = 1240;
const JPEG_QUALITY_CAPTURE = 0.82;
const JPEG_QUALITY_PDF = 0.8;

function stopWebcamStream(video?: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  if (video) video.srcObject = null;
}

export function ProfessionalScanner({ onComplete, onClose }: ProfessionalScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const autoCaptureIntervalRef = useRef<number | null>(null);

  const [step, setStep] = useState<ScanStep>('capture');
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentCaptureUrl, setCurrentCaptureUrl] = useState<string | null>(null);
  const [detectedQuad, setDetectedQuad] = useState<Quadrilateral | null>(null);

  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [webcamReady, setWebcamReady] = useState(false);

  // Detection settings
  const [autoCapture, setAutoCapture] = useState(false);
  const [isDocumentStable, setIsDocumentStable] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);
  const [stableMode, setStableMode] = useState(false); // disables real-time detection

  // Edit state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(115);
  const [colorMode, setColorMode] = useState<'color' | 'grayscale' | 'bw'>('bw');
  const [sharpen, setSharpen] = useState(true);
  const [removeBackground, setRemoveBackground] = useState(true);

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, width: 80, height: 80 });

  // Finalize state
  const [documentName, setDocumentName] = useState(
    `Scan ${new Date().toLocaleDateString('fr-FR')}`
  );
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [isGenerating, setIsGenerating] = useState(false);

  const captureMaxSide = useMemo(() => {
    return isAndroidNative() ? ANDROID_CAPTURE_MAX_SIDE : WEB_CAPTURE_MAX_SIDE;
  }, []);

  // ---------- Lifecycle / cleanup ----------

  const fullCleanup = useCallback(() => {
    resetDetection();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (autoCaptureIntervalRef.current) {
      window.clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }

    stopWebcamStream(webcamRef.current?.video);
    setWebcamReady(false);

    safeRevokeObjectUrl(currentCaptureUrl);

    // Revoke all page URLs
    pages.forEach((p) => safeRevokeObjectUrl(p.processedUrl));
  }, [currentCaptureUrl, pages]);

  useEffect(() => {
    return () => {
      fullCleanup();
    };
  }, [fullCleanup]);

  // Stop camera + detection when leaving capture step
  useEffect(() => {
    if (step !== 'capture') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (autoCaptureIntervalRef.current) {
        window.clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
      stopWebcamStream(webcamRef.current?.video);
      setWebcamReady(false);
      setAutoCaptureCountdown(null);
      setDetectedQuad(null);
      setIsDocumentStable(false);
      setDetectionConfidence(0);
    }
  }, [step]);

  // ---------- Camera init ----------

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      setCameraState('initializing');
      setCameraError(null);

      const result = await initializeCameraForScanner();
      if (!mounted) return;

      if (result.success) {
        setCameraState('ready');
      } else {
        setCameraError(result.error || "Erreur d'initialisation de la caméra");
        setCameraState(result.permanentlyDenied ? 'permanently_denied' : 'denied');
      }
    };

    initCamera();

    return () => {
      mounted = false;
    };
  }, []);

  const videoConstraints = useMemo(
    () => ({
      // lower ideals reduce pressure on some WebViews
      width: { ideal: isAndroidNative() ? 1280 : 1920 },
      height: { ideal: isAndroidNative() ? 720 : 1080 },
      facingMode: { ideal: facingMode },
    }),
    [facingMode]
  );

  const handleUserMedia = useCallback(() => {
    setWebcamReady(true);
  }, []);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    const errorMessage = typeof error === 'string' ? error : error.message;

    if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
      setCameraError('Accès à la caméra refusé.');
      setCameraState('denied');
    } else if (errorMessage.includes('NotFound')) {
      setCameraError('Aucune caméra détectée.');
      setCameraState('error');
    } else if (errorMessage.includes('NotReadable')) {
      setCameraError('Caméra occupée par une autre application.');
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

  // ---------- Detection loop (throttled) ----------

  useEffect(() => {
    const shouldRun =
      step === 'capture' &&
      webcamReady &&
      !currentCaptureUrl &&
      cameraState === 'ready' &&
      !stableMode;

    if (!shouldRun) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 280; // ms

    const detectLoop = (timestamp: number) => {
      if (timestamp - lastDetectionTime >= DETECTION_INTERVAL) {
        lastDetectionTime = timestamp;

        const video = webcamRef.current?.video;
        const overlay = overlayRef.current;

        if (video && overlay && video.readyState === 4) {
          const result = detectDocument(video, 320);

          setDetectedQuad(result.quad);
          setIsDocumentStable(result.stable);
          setDetectionConfidence(result.confidence);

          drawOverlay(overlay, video, result);

          if (autoCapture && result.stable && result.confidence > 0.6) {
            handleAutoCapture();
          }
        }
      }

      animationRef.current = requestAnimationFrame(detectLoop);
    };

    animationRef.current = requestAnimationFrame(detectLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [step, webcamReady, currentCaptureUrl, cameraState, autoCapture, stableMode]);

  // Auto-capture countdown (single timer)
  const handleAutoCapture = useCallback(() => {
    if (autoCaptureCountdown !== null) return;

    setAutoCaptureCountdown(3);

    if (autoCaptureIntervalRef.current) {
      window.clearInterval(autoCaptureIntervalRef.current);
    }

    autoCaptureIntervalRef.current = window.setInterval(() => {
      setAutoCaptureCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (autoCaptureIntervalRef.current) {
            window.clearInterval(autoCaptureIntervalRef.current);
            autoCaptureIntervalRef.current = null;
          }
          capture();
          return null;
        }
        return prev - 1;
      });
    }, 500);
  }, [autoCaptureCountdown]);

  // Draw detection overlay (avoid heavy layout thrash)
  const drawOverlay = (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    result: DetectionResult
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result.detected || !result.quad) {
      ctx.strokeStyle = getCssHsl('--muted-foreground', 0.35);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);

      const padding = 40;
      ctx.strokeRect(padding, padding, canvas.width - padding * 2, canvas.height - padding * 2);
      ctx.setLineDash([]);
      return;
    }

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    const points = [
      { x: result.quad.topLeft.x * scaleX, y: result.quad.topLeft.y * scaleY },
      { x: result.quad.topRight.x * scaleX, y: result.quad.topRight.y * scaleY },
      { x: result.quad.bottomRight.x * scaleX, y: result.quad.bottomRight.y * scaleY },
      { x: result.quad.bottomLeft.x * scaleX, y: result.quad.bottomLeft.y * scaleY },
    ];

    const fill = result.stable ? getCssHsl('--success', 0.12) : getCssHsl('--primary', 0.12);
    const stroke = result.stable ? getCssHsl('--success', 0.9) : getCssHsl('--primary', 0.9);

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // ---------- Capture (Blob/ObjectURL) ----------

  const capture = useCallback(async () => {
    if (!webcamRef.current || !webcamReady) return;

    setAutoCaptureCountdown(null);

    const video = webcamRef.current.video;
    if (!video) return;

    // Capture to constrained canvas (avoid huge allocations)
    const { width, height } = constrainSize(video.videoWidth, video.videoHeight, captureMaxSide);
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = width;
    captureCanvas.height = height;

    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    // Apply perspective correction when available
    let finalCanvas = captureCanvas;
    if (detectedQuad) {
      try {
        // Adjust quad to scaled capture canvas coordinates
        const scaleX = width / video.videoWidth;
        const scaleY = height / video.videoHeight;
        const scaledQuad: Quadrilateral = {
          topLeft: { x: detectedQuad.topLeft.x * scaleX, y: detectedQuad.topLeft.y * scaleY },
          topRight: { x: detectedQuad.topRight.x * scaleX, y: detectedQuad.topRight.y * scaleY },
          bottomRight: { x: detectedQuad.bottomRight.x * scaleX, y: detectedQuad.bottomRight.y * scaleY },
          bottomLeft: { x: detectedQuad.bottomLeft.x * scaleX, y: detectedQuad.bottomLeft.y * scaleY },
        };

        finalCanvas = await applyPerspectiveCorrection(captureCanvas, scaledQuad);
      } catch {
        // keep uncorrected
      }
    }

    const blob = await canvasToJpegBlob(finalCanvas, JPEG_QUALITY_CAPTURE);
    const url = blobToObjectUrl(blob);

    safeRevokeObjectUrl(currentCaptureUrl);
    setCurrentCaptureUrl(url);

    console.log('[Scanner] capture ok', { w: finalCanvas.width, h: finalCanvas.height, bytes: blob.size });
  }, [webcamReady, detectedQuad, captureMaxSide, currentCaptureUrl]);

  const confirmCapture = useCallback(async () => {
    if (!currentCaptureUrl) return;

    const { canvas } = await drawImageToCanvas(currentCaptureUrl, captureMaxSide);

    enhanceDocument(canvas, {
      mode: colorMode,
      brightness,
      contrast,
      sharpen,
      removeBackground,
    });

    const processedBlob = await canvasToJpegBlob(canvas, JPEG_QUALITY_CAPTURE);
    const processedUrl = blobToObjectUrl(processedBlob);

    const newPage: ScanPage = {
      processedUrl,
      bytes: processedBlob.size,
      brightness,
      contrast,
      mode: colorMode,
    };

    setPages((prev) => {
      const next = [...prev, newPage];
      console.log('[Scanner] page added', {
        pageCount: next.length,
        approxMB: Math.round((next.reduce((s, p) => s + p.bytes, 0) / 1024 / 1024) * 10) / 10,
      });
      return next;
    });

    setCurrentPageIndex(pages.length);
    safeRevokeObjectUrl(currentCaptureUrl);
    setCurrentCaptureUrl(null);
    setDetectedQuad(null);
    setStep('edit');
  }, [currentCaptureUrl, captureMaxSide, colorMode, brightness, contrast, sharpen, removeBackground, pages.length]);

  const retakeCapture = useCallback(() => {
    safeRevokeObjectUrl(currentCaptureUrl);
    setCurrentCaptureUrl(null);
    setDetectedQuad(null);
    setAutoCaptureCountdown(null);
  }, [currentCaptureUrl]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setWebcamReady(false);
  }, []);

  // ---------- Image processing (edit/crop) ----------

  const processImageFromUrl = useCallback(
    async (
      sourceUrl: string,
      brightnessVal: number,
      contrastVal: number,
      mode: 'color' | 'grayscale' | 'bw',
      crop?: { x: number; y: number; width: number; height: number }
    ): Promise<{ url: string; bytes: number }> => {
      const { canvas } = await drawImageToCanvas(sourceUrl, captureMaxSide);

      if (crop) {
        const sx = (crop.x / 100) * canvas.width;
        const sy = (crop.y / 100) * canvas.height;
        const sw = (crop.width / 100) * canvas.width;
        const sh = (crop.height / 100) * canvas.height;

        const cropped = document.createElement('canvas');
        cropped.width = Math.max(1, Math.round(sw));
        cropped.height = Math.max(1, Math.round(sh));
        const cctx = cropped.getContext('2d');
        if (!cctx) throw new Error('No 2D context');
        cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, cropped.width, cropped.height);

        enhanceDocument(cropped, {
          mode,
          brightness: brightnessVal,
          contrast: contrastVal,
          sharpen,
          removeBackground,
        });

        const blob = await canvasToJpegBlob(cropped, JPEG_QUALITY_CAPTURE);
        return { url: blobToObjectUrl(blob), bytes: blob.size };
      }

      enhanceDocument(canvas, {
        mode,
        brightness: brightnessVal,
        contrast: contrastVal,
        sharpen,
        removeBackground,
      });

      const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY_CAPTURE);
      return { url: blobToObjectUrl(blob), bytes: blob.size };
    },
    [captureMaxSide, sharpen, removeBackground]
  );

  const applyEdits = useCallback(async () => {
    if (pages.length === 0) return;

    const current = pages[currentPageIndex];
    const { url, bytes } = await processImageFromUrl(
      current.processedUrl,
      brightness,
      contrast,
      colorMode
    );

    setPages((prev) => {
      const next = [...prev];
      const old = next[currentPageIndex];
      safeRevokeObjectUrl(old?.processedUrl);
      next[currentPageIndex] = {
        ...old,
        processedUrl: url,
        bytes,
        brightness,
        contrast,
        mode: colorMode,
      };
      return next;
    });
  }, [pages, currentPageIndex, brightness, contrast, colorMode, processImageFromUrl]);

  useEffect(() => {
    if (step !== 'edit' || pages.length === 0) return;

    const debounce = window.setTimeout(() => {
      applyEdits().catch((e) => console.warn('[Scanner] applyEdits failed', e));
    }, 250);

    return () => window.clearTimeout(debounce);
  }, [brightness, contrast, colorMode, sharpen, removeBackground, step, pages.length, applyEdits]);

  const applyCrop = useCallback(async () => {
    if (pages.length === 0) return;

    const current = pages[currentPageIndex];
    const { url, bytes } = await processImageFromUrl(
      current.processedUrl,
      current.brightness,
      current.contrast,
      current.mode,
      cropArea
    );

    setPages((prev) => {
      const next = [...prev];
      const old = next[currentPageIndex];
      safeRevokeObjectUrl(old?.processedUrl);
      next[currentPageIndex] = {
        ...old,
        processedUrl: url,
        bytes,
      };
      return next;
    });

    setIsCropping(false);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
  }, [pages.length, currentPageIndex, cropArea, processImageFromUrl]);

  const removePage = useCallback(
    (index: number) => {
      setPages((prev) => {
        const toRemove = prev[index];
        safeRevokeObjectUrl(toRemove?.processedUrl);

        const next = prev.filter((_, i) => i !== index);
        console.log('[Scanner] page removed', {
          pageCount: next.length,
          approxMB: Math.round((next.reduce((s, p) => s + p.bytes, 0) / 1024 / 1024) * 10) / 10,
        });
        return next;
      });

      setCurrentPageIndex((prev) => {
        const nextLen = pages.length - 1;
        if (nextLen <= 0) return 0;
        return prev >= nextLen ? nextLen - 1 : prev;
      });
    },
    [pages.length]
  );

  const addMorePages = useCallback(() => {
    setStep('capture');
    resetDetection();
  }, []);

  const goToFinalize = useCallback(() => {
    setStep('finalize');
  }, []);

  // ---------- PDF generation (sequential, low peak RAM) ----------

  const generateDocument = useCallback(async () => {
    if (pages.length === 0) return;

    setIsGenerating(true);

    try {
      if (pages.length === 1) {
        const response = await fetch(pages[0].processedUrl);
        const blob = await response.blob();
        const file = new File([blob], `${documentName}.jpg`, { type: 'image/jpeg' });
        onComplete(file, pages[0].processedUrl, documentName, selectedCategory);
        return;
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        // Load page image, scale down further for PDF to keep memory predictable
        const { canvas, width, height } = await drawImageToCanvas(pages[i].processedUrl, PDF_MAX_SIDE);

        // Convert to dataURL ONLY for this page (jsPDF requirement), then discard
        const jpegBlob = await canvasToJpegBlob(canvas, JPEG_QUALITY_PDF);
        const tmpUrl = blobToObjectUrl(jpegBlob);
        const { canvas: pdfCanvas } = await drawImageToCanvas(tmpUrl, PDF_MAX_SIDE);
        safeRevokeObjectUrl(tmpUrl);

        const imgData = pdfCanvas.toDataURL('image/jpeg', JPEG_QUALITY_PDF);

        const imgRatio = width / height;
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

        pdf.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `${documentName}.pdf`, { type: 'application/pdf' });
      onComplete(file, pages[0].processedUrl, documentName, selectedCategory);

      console.log('[Scanner] pdf generated', { pageCount: pages.length, bytes: pdfBlob.size });
    } catch (error) {
      console.error('[Scanner] Error generating document:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [pages, documentName, selectedCategory, onComplete]);

  const currentPage = pages[currentPageIndex];

  const renderCameraError = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center bg-black">
      <AlertCircle className="w-16 h-16 text-destructive" />
      <p className="text-lg font-medium text-foreground">{cameraError}</p>

      {cameraState === 'permanently_denied' ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Veuillez activer la caméra dans les paramètres.</p>
          <Button onClick={openAppSettings} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
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

  const onCloseSafe = () => {
    fullCleanup();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border safe-area-top">
        <button onClick={onCloseSafe} className="p-2 rounded-lg hover:bg-secondary">
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="font-medium">
            {step === 'capture' && 'Scanner Pro'}
            {step === 'edit' && `Édition (${currentPageIndex + 1}/${pages.length})`}
            {step === 'finalize' && 'Finaliser'}
          </span>
          {step === 'capture' && !stableMode && detectionConfidence > 0 && (
            <div className="text-xs text-muted-foreground">
              {isDocumentStable ? (
                <span className="text-success flex items-center justify-center gap-1">
                  <Focus className="w-3 h-3" /> Document détecté
                </span>
              ) : (
                <span className="text-primary">Recherche...</span>
              )}
            </div>
          )}
          {step === 'capture' && stableMode && (
            <div className="text-xs text-muted-foreground">Mode stable (détection désactivée)</div>
          )}
        </div>
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
              <div className="flex-1 relative bg-black overflow-hidden">
                {cameraState === 'initializing' && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Initialisation de la caméra...</p>
                  </div>
                )}

                {(cameraState === 'error' || cameraState === 'denied' || cameraState === 'permanently_denied') &&
                  renderCameraError()}

                {cameraState === 'ready' && currentCaptureUrl && (
                  <img src={currentCaptureUrl} alt="Capture" className="w-full h-full object-contain" />
                )}

                {cameraState === 'ready' && !currentCaptureUrl && (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={videoConstraints}
                      className="w-full h-full object-cover"
                      screenshotQuality={0.85}
                      onUserMedia={handleUserMedia}
                      onUserMediaError={handleUserMediaError}
                    />

                    {/* Detection overlay */}
                    {!stableMode && (
                      <canvas
                        ref={overlayRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      />
                    )}

                    {/* Auto-capture countdown */}
                    {autoCaptureCountdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary-foreground">
                            {autoCaptureCountdown}
                          </span>
                        </div>
                      </div>
                    )}

                    {!webcamReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Settings bar */}
              {cameraState === 'ready' && !currentCaptureUrl && (
                <div className="px-4 py-2 bg-secondary/50 border-t border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={stableMode}
                        onCheckedChange={(v) => {
                          setStableMode(v);
                          if (v) {
                            setAutoCapture(false);
                            setAutoCaptureCountdown(null);
                          }
                        }}
                        id="stable-mode"
                      />
                      <Label htmlFor="stable-mode" className="text-xs flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        Mode stable
                      </Label>
                    </div>

                    {!stableMode && (
                      <div className="flex items-center gap-2">
                        <Switch checked={autoCapture} onCheckedChange={setAutoCapture} id="auto-capture" />
                        <Label htmlFor="auto-capture" className="text-xs">
                          Capture auto
                        </Label>
                      </div>
                    )}
                  </div>

                  {pages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {pages.map((page, index) => (
                        <div key={index} className="relative shrink-0">
                          <img
                            src={page.processedUrl}
                            alt={`Page ${index + 1}`}
                            className="w-10 h-14 object-cover rounded border border-border"
                            loading="lazy"
                          />
                          <button
                            onClick={() => removePage(index)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                          >
                            <X className="w-2.5 h-2.5 text-destructive-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Capture controls */}
              <div className="p-4 bg-background border-t border-border safe-area-bottom">
                {currentCaptureUrl ? (
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
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        isDocumentStable && !stableMode
                          ? 'bg-success hover:opacity-90 scale-110'
                          : 'bg-primary hover:scale-95'
                      )}
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
              <div className="flex-1 relative bg-black overflow-hidden">
                {isCropping ? (
                  <div className="relative w-full h-full">
                    <img
                      src={currentPage.processedUrl}
                      alt="Original"
                      className="w-full h-full object-contain opacity-50"
                    />
                    <div
                      className="absolute border-2 border-primary bg-transparent"
                      style={{
                        left: `${cropArea.x}%`,
                        top: `${cropArea.y}%`,
                        width: `${cropArea.width}%`,
                        height: `${cropArea.height}%`,
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
                    src={currentPage.processedUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

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
                          'relative shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                          index === currentPageIndex ? 'border-primary' : 'border-transparent'
                        )}
                      >
                        <img
                          src={page.processedUrl}
                          alt={`Page ${index + 1}`}
                          className="w-14 h-18 object-cover"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                          {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-background border-t border-border space-y-4 max-h-[40vh] overflow-y-auto">
                {isCropping ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Position X (%)</Label>
                        <Slider
                          value={[cropArea.x]}
                          onValueChange={([v]) => setCropArea((prev) => ({ ...prev, x: v }))}
                          min={0}
                          max={90}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Position Y (%)</Label>
                        <Slider
                          value={[cropArea.y]}
                          onValueChange={([v]) => setCropArea((prev) => ({ ...prev, y: v }))}
                          min={0}
                          max={90}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Largeur (%)</Label>
                        <Slider
                          value={[cropArea.width]}
                          onValueChange={([v]) => setCropArea((prev) => ({ ...prev, width: v }))}
                          min={10}
                          max={100 - cropArea.x}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hauteur (%)</Label>
                        <Slider
                          value={[cropArea.height]}
                          onValueChange={([v]) => setCropArea((prev) => ({ ...prev, height: v }))}
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
                    <div>
                      <Label className="text-xs mb-2 block">Mode document</Label>
                      <div className="flex gap-2">
                        {(['color', 'grayscale', 'bw'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setColorMode(mode)}
                            className={cn(
                              'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                              colorMode === mode
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {mode === 'color' && 'Couleur'}
                            {mode === 'grayscale' && 'Gris'}
                            {mode === 'bw' && 'Document'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Luminosité
                        </Label>
                        <span className="text-xs text-muted-foreground">{brightness}%</span>
                      </div>
                      <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={50} max={150} step={5} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Contrast className="w-3 h-3" /> Contraste
                        </Label>
                        <span className="text-xs text-muted-foreground">{contrast}%</span>
                      </div>
                      <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={50} max={150} step={5} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Netteté
                      </Label>
                      <Switch checked={sharpen} onCheckedChange={setSharpen} />
                    </div>

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

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={addMorePages}>
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter page
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
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="relative">
                  <img
                    src={pages[0]?.processedUrl}
                    alt="Preview"
                    className="max-h-[40vh] object-contain rounded-lg shadow-lg"
                    loading="lazy"
                  />
                  {pages.length > 1 && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {pages.length}
                    </div>
                  )}
                </div>
              </div>

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
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all',
                          selectedCategory === cat.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div style={{ color: cat.color }}>
                          <cat.icon className="w-5 h-5" />
                        </div>
                        <span className="truncate w-full text-center">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('edit')}>
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
                        {pages.length > 1 ? 'Créer PDF' : 'Enregistrer'}
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">🔒 100% local - Aucune donnée envoyée</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
