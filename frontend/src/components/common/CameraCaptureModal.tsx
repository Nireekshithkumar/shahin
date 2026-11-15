import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, FlipHorizontal, RotateCw, Trash2, Check, X,
  Plus, AlertCircle, Image as ImageIcon, RefreshCw, FileUp
} from 'lucide-react';

interface CapturedPage {
  id: number;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (files: File[]) => void;
  title?: string;
  documentCategory?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
  title = 'Capture Document with Camera',
  documentCategory = 'DOCUMENT'
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  const [previewPageIdx, setPreviewPageIdx] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  // Check camera devices
  const checkDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }
    } catch {
      // Ignore device enumeration issues
    }
  };

  // Start camera stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    setIsPermissionDenied(false);
    setIsInitializing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. Please use file upload.');
      setIsInitializing(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setCameraError('Camera permission denied. Please allow camera permissions in your browser or choose a file.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected on this system. Please use file upload instead.');
      } else {
        // Fallback: try default without facingMode
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play().catch(() => {});
          }
        } catch (fallbackErr: any) {
          setCameraError('Unable to access camera. Please select an existing file or photo.');
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      checkDevices();
      startCamera(facingMode);
    } else {
      stopCamera();
      setCapturedPages([]);
      setPreviewPageIdx(null);
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Flip camera between front/back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture current video frame
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const newPage: CapturedPage = {
      id: Date.now(),
      dataUrl,
      rotation: 0
    };

    setCapturedPages((prev) => [...prev, newPage]);
    setPreviewPageIdx(capturedPages.length); // focus on newly captured page
  };

  // Rotate a captured page by 90 degrees
  const handleRotatePage = (pageIdx: number) => {
    setCapturedPages((prev) =>
      prev.map((p, idx) => {
        if (idx === pageIdx) {
          return { ...p, rotation: (p.rotation + 90) % 360 };
        }
        return p;
      })
    );
  };

  // Remove a captured page
  const handleRemovePage = (pageIdx: number) => {
    setCapturedPages((prev) => {
      const next = prev.filter((_, idx) => idx !== pageIdx);
      if (next.length === 0) {
        setPreviewPageIdx(null);
      } else if (previewPageIdx !== null && previewPageIdx >= next.length) {
        setPreviewPageIdx(next.length - 1);
      }
      return next;
    });
  };

  // Retake all pages
  const handleRetakeAll = () => {
    setCapturedPages([]);
    setPreviewPageIdx(null);
  };

  // Handle fallback file selection from device or gallery
  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files);
    onCaptureComplete(fileList);
    handleClose();
  };

  // Render rotated image to blob
  const rotateDataUrlToBlob = async (dataUrl: string, rotation: number): Promise<Blob> => {
    return new Promise((resolve) => {
      if (rotation === 0) {
        fetch(dataUrl)
          .then((res) => res.blob())
          .then(resolve);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/jpeg', 0.92);
      };
      img.src = dataUrl;
    });
  };

  // Confirm and deliver files to parent
  const handleConfirmUpload = async () => {
    if (capturedPages.length === 0) return;

    const files: File[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    for (let i = 0; i < capturedPages.length; i++) {
      const page = capturedPages[i];
      const blob = await rotateDataUrlToBlob(page.dataUrl, page.rotation);
      const filename = `${documentCategory.toLowerCase()}_camera_page_${i + 1}_${timestamp}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      files.push(file);
    }

    onCaptureComplete(files);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/70 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#F4F4F6] rounded-xl border border-[#D2D2D4] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#000000]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#E7E7E7] border-b border-[#D2D2D4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FF634A] text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-[#000000] uppercase">
                {title}
              </h2>
              <p className="text-[10px] text-[#000000]/60">
                Position certificate flat within viewfinder • Multiple pages supported
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-[#D2D2D4] text-[#000000]/60 hover:text-[#000000] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {/* Camera Error / Permission Fallback Banner */}
          {cameraError && (
            <div className="p-3 bg-[#E7E7E7] border border-[#FF634A] rounded-lg text-xs space-y-2">
              <div className="flex items-start gap-2 text-[#000000]">
                <AlertCircle className="w-4 h-4 text-[#FF634A] flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{cameraError}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fallbackFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded bg-[#FF634A] text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90"
                >
                  <FileUp className="w-3.5 h-3.5" /> Choose from Gallery / Files
                </button>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-3 py-1.5 rounded bg-[#F4F4F6] border border-[#D2D2D4] text-[#000000] font-semibold text-xs flex items-center gap-1 hover:bg-[#D2D2D4]"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Picker Fallback */}
          <input
            ref={fallbackFileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            capture={facingMode === 'environment' ? 'environment' : 'user'}
            className="hidden"
            onChange={handleFallbackFileSelect}
          />

          {/* Active Viewfinder Container */}
          <div className="relative bg-[#000000] rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-[#D2D2D4]">
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${previewPageIdx !== null ? 'hidden' : 'block'}`}
            />

            {/* Viewfinder Target Framing Guides (when live) */}
            {previewPageIdx === null && !cameraError && (
              <div className="absolute inset-4 pointer-events-none border border-dashed border-white/40 rounded-lg flex flex-col justify-between p-3">
                <div className="flex justify-between items-start text-[10px] font-mono text-white/70 bg-[#000000]/40 px-2 py-0.5 rounded self-start">
                  <span>LIVE FEED • {facingMode.toUpperCase()}</span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-medium text-white/80 bg-[#000000]/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    Center document inside frame & keep steady
                  </span>
                </div>
              </div>
            )}

            {/* Single Page Review Preview */}
            {previewPageIdx !== null && capturedPages[previewPageIdx] && (
              <div className="relative w-full h-full flex items-center justify-center bg-[#000000] p-2">
                <img
                  src={capturedPages[previewPageIdx].dataUrl}
                  alt={`Captured page ${previewPageIdx + 1}`}
                  className="max-h-full max-w-full object-contain transition-transform duration-200"
                  style={{
                    transform: `rotate(${capturedPages[previewPageIdx].rotation}deg)`
                  }}
                />
                <div className="absolute top-3 left-3 bg-[#000000]/70 text-white text-[11px] font-bold px-2.5 py-1 rounded">
                  Page {previewPageIdx + 1} of {capturedPages.length} (Review Mode)
                </div>
              </div>
            )}

            {/* Offscreen Canvas for Snapshot Generation */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Initializing Spinner */}
            {isInitializing && (
              <div className="absolute inset-0 bg-[#000000]/70 flex flex-col items-center justify-center text-white gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF634A]" />
                <span className="text-xs">Accessing camera sensor...</span>
              </div>
            )}
          </div>

          {/* Captured Pages Strip / Multi-Page Review */}
          {capturedPages.length > 0 && (
            <div className="bg-[#E7E7E7] p-3 rounded-xl border border-[#D2D2D4] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#000000]">
                  Document Pages ({capturedPages.length})
                </span>
                <div className="flex items-center gap-2">
                  {previewPageIdx !== null && (
                    <button
                      type="button"
                      onClick={() => handleRotatePage(previewPageIdx)}
                      className="px-2 py-1 rounded bg-[#F4F4F6] border border-[#D2D2D4] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#D2D2D4]"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-3 h-3 text-[#FF634A]" /> Rotate
                    </button>
                  )}
                  {previewPageIdx !== null && (
                    <button
                      type="button"
                      onClick={() => handleRemovePage(previewPageIdx)}
                      className="px-2 py-1 rounded bg-[#F4F4F6] border border-[#D2D2D4] text-[11px] font-semibold text-[#000000] hover:text-[#FF634A] flex items-center gap-1 hover:bg-[#D2D2D4]"
                      title="Remove this page"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Page
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewPageIdx(null)}
                    className="px-2 py-1 rounded bg-[#F4F4F6] border border-[#D2D2D4] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#D2D2D4]"
                  >
                    <Plus className="w-3 h-3 text-[#FF634A]" /> Add Another Page
                  </button>
                </div>
              </div>

              {/* Thumbnails Row */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {capturedPages.map((page, idx) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setPreviewPageIdx(idx)}
                    className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                      previewPageIdx === idx
                        ? 'border-[#FF634A] ring-2 ring-[#FF634A]/20'
                        : 'border-[#D2D2D4] hover:border-[#000000]/40'
                    }`}
                  >
                    <img
                      src={page.dataUrl}
                      alt={`Page ${idx + 1}`}
                      className="w-full h-full object-cover"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-[#000000]/70 text-white text-[9px] font-bold text-center py-0.5">
                      P.{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-3.5 bg-[#E7E7E7] border-t border-[#D2D2D4] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Switch Camera if live preview */}
            {previewPageIdx === null && (
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="px-3 py-1.5 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#D2D2D4] transition-colors"
                title="Switch front / rear camera"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-[#FF634A]" />
                <span>{facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}</span>
              </button>
            )}

            {/* Choose from Gallery fallback button */}
            <button
              type="button"
              onClick={() => fallbackFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#D2D2D4] transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#000000]/70" />
              <span>Choose from Gallery</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {previewPageIdx === null ? (
              // Live capture button
              <button
                type="button"
                onClick={handleCaptureFrame}
                disabled={!stream || isInitializing}
                className="px-5 py-2 rounded-lg bg-[#FF634A] text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Page {capturedPages.length + 1}</span>
              </button>
            ) : (
              // Confirm upload button
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={capturedPages.length === 0}
                className="px-5 py-2 rounded-lg bg-[#FF634A] text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Upload ({capturedPages.length} {capturedPages.length === 1 ? 'Page' : 'Pages'})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] text-xs font-semibold hover:bg-[#D2D2D4] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

