"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GUIDE_CENTER_X,
  GUIDE_CENTER_Y,
  GUIDE_RADIUS_X,
  GUIDE_RADIUS_Y,
  SAMPLE_HEIGHT,
  SAMPLE_INTERVAL_MS,
  SAMPLE_WIDTH,
  SCAN_VIEWS,
} from "@/components/scanning-flow/constants";
import {
  CameraStateOverlay,
  CaptureControl,
  ReadyCameraOverlay,
  ScanFinalizationState,
  ScanningHeader,
  ThumbnailStrip,
} from "@/components/scanning-flow/ui";
import type { CameraState, QualityBucket } from "@/components/scanning-flow/types";

/**
 * CHALLENGE: SCAN ENHANCEMENT
 * 
 * Your goal is to improve the User Experience of the Scanning Flow.
 * 1. Implement a Visual Guidance Overlay (e.g., a circle or mouth outline) on the video feed.
 * 2. Add real-time feedback to the user (e.g., "Face not centered", "Move closer").
 * 3. Ensure the UI feels premium and responsive.
 */

export default function ScanningFlow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previousFrameRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef(0);
  const mountedRef = useRef(false);
  const finalizationStartedRef = useRef(false);
  const redirectTimeoutRef = useRef<number | null>(null);
  const qualityBucketRef = useRef<QualityBucket>("fair");
  const qualityTextRef = useRef("Align your mouth inside the guide.");

  const [cameraState, setCameraState] = useState<CameraState>("loading");
  const [cameraMessage, setCameraMessage] = useState("Requesting camera access...");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [qualityBucket, setQualityBucket] = useState<QualityBucket>("fair");
  const [qualityText, setQualityText] = useState("Align your mouth inside the guide.");
  const [finalizationStatus, setFinalizationStatus] = useState<"idle" | "submitting" | "redirecting" | "success" | "error">("idle");
  const [finalizationMessage, setFinalizationMessage] = useState("Preparing scan finalization...");
  const [finalizationProgress, setFinalizationProgress] = useState(0);

  const isComplete = currentStep >= SCAN_VIEWS.length;
  const activeStep = Math.min(currentStep, SCAN_VIEWS.length - 1);
  const canCapture = cameraState === "ready" && qualityBucket !== "poor" && !isComplete;

  const syncQualityUi = useCallback((nextBucket: QualityBucket, nextText: string) => {
    if (qualityBucketRef.current !== nextBucket) {
      qualityBucketRef.current = nextBucket;
      setQualityBucket(nextBucket);
    }

    if (qualityTextRef.current !== nextText) {
      qualityTextRef.current = nextText;
      setQualityText(nextText);
    }
  }, []);

  const clearPendingRedirect = useCallback(() => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    lastSampleTimeRef.current = 0;
    previousFrameRef.current = null;

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const analyzeFrame = useCallback(
    (video: HTMLVideoElement) => {
      let canvas = analysisCanvasRef.current;
      let ctx = analysisCtxRef.current;

      if (!canvas || !ctx) {
        canvas = document.createElement("canvas");
        canvas.width = SAMPLE_WIDTH;
        canvas.height = SAMPLE_HEIGHT;
        ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          return;
        }
        ctx.imageSmoothingEnabled = false;
        analysisCanvasRef.current = canvas;
        analysisCtxRef.current = ctx;
      }

      try {
        ctx.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      } catch {
        return;
      }

      const frame = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const gray = new Uint8Array(SAMPLE_WIDTH * SAMPLE_HEIGHT);

      for (let i = 0; i < gray.length; i += 1) {
        const p = i * 4;
        const r = frame.data[p];
        const g = frame.data[p + 1];
        const b = frame.data[p + 2];
        gray[i] = (r * 77 + g * 150 + b * 29) >> 8;
      }

      let motion = 0;
      const prev = previousFrameRef.current;
      if (prev) {
        let motionSum = 0;
        for (let i = 0; i < gray.length; i += 1) {
          motionSum += Math.abs(gray[i] - prev[i]);
        }
        motion = motionSum / gray.length;
      }
      previousFrameRef.current = gray;

      let inDetailSum = 0;
      let inDetailCount = 0;
      let outDetailSum = 0;
      let outDetailCount = 0;
      let weightedX = 0;
      let weightedY = 0;
      let weightSum = 0;

      for (let y = 1; y < SAMPLE_HEIGHT - 1; y += 1) {
        for (let x = 1; x < SAMPLE_WIDTH - 1; x += 1) {
          const idx = y * SAMPLE_WIDTH + x;
          const gradX = Math.abs(gray[idx + 1] - gray[idx - 1]);
          const gradY = Math.abs(gray[idx + SAMPLE_WIDTH] - gray[idx - SAMPLE_WIDTH]);
          const detail = gradX + gradY;

          const nx = (x + 0.5) / SAMPLE_WIDTH;
          const ny = (y + 0.5) / SAMPLE_HEIGHT;
          const dx = (nx - GUIDE_CENTER_X) / GUIDE_RADIUS_X;
          const dy = (ny - GUIDE_CENTER_Y) / GUIDE_RADIUS_Y;
          const isInsideGuide = dx * dx + dy * dy <= 1;

          if (isInsideGuide) {
            inDetailSum += detail;
            inDetailCount += 1;
            const weight = detail + 1;
            weightedX += nx * weight;
            weightedY += ny * weight;
            weightSum += weight;
          } else {
            outDetailSum += detail;
            outDetailCount += 1;
          }
        }
      }

      const insideDetail = inDetailCount > 0 ? inDetailSum / inDetailCount : 0;
      const outsideDetail = outDetailCount > 0 ? outDetailSum / outDetailCount : 0;
      const centerX = weightSum > 0 ? weightedX / weightSum : GUIDE_CENTER_X;
      const centerY = weightSum > 0 ? weightedY / weightSum : GUIDE_CENTER_Y;
      const centerOffset = Math.hypot(centerX - GUIDE_CENTER_X, centerY - GUIDE_CENTER_Y);

      let nextBucket: QualityBucket = "good";
      let nextText = "Great stability. Capture when ready.";

      if (insideDetail < 14) {
        nextBucket = "poor";
        nextText = "Move closer so your teeth are clearer.";
      } else if (centerOffset > 0.14 || outsideDetail > insideDetail * 1.2) {
        nextBucket = "poor";
        nextText = "Center your mouth inside the guide.";
      } else if (motion > 18) {
        nextBucket = "poor";
        nextText = "Hold your phone steady for a moment.";
      } else if (centerOffset > 0.09 || motion > 10 || insideDetail < 24) {
        nextBucket = "fair";
        nextText = "Almost there. Keep steady and centered.";
      }

      syncQualityUi(nextBucket, nextText);
    },
    [syncQualityUi]
  );

  const startStabilityLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastSampleTimeRef.current = 0;

    const tick = (timestamp: number) => {
      if (!mountedRef.current || isComplete) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (timestamp - lastSampleTimeRef.current >= SAMPLE_INTERVAL_MS) {
        lastSampleTimeRef.current = timestamp;
        analyzeFrame(video);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [analyzeFrame, isComplete]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("loading");
    setCameraMessage("Requesting camera access...");
    syncQualityUi("fair", "Align your mouth inside the guide.");

    if (!window.isSecureContext) {
      setCameraState("denied");
      setCameraMessage("Camera requires HTTPS (or localhost) in this browser.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraMessage("This browser does not support camera access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setCameraState("error");
        setCameraMessage("Video element is unavailable.");
        return;
      }

      video.srcObject = stream;
      await video.play().catch(() => undefined);

      if (!mountedRef.current) {
        return;
      }

      setCameraState("ready");
      setCameraMessage("");
      startStabilityLoop();
    } catch (error) {
      console.error("Camera startup failed", error);
      const isPermissionError =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError" || error.name === "SecurityError");

      if (isPermissionError) {
        setCameraState("denied");
        setCameraMessage("Camera blocked. Allow permission in browser settings and retry.");
      } else {
        setCameraState("error");
        setCameraMessage("Unable to access camera. Check device availability and retry.");
      }
    }
  }, [startStabilityLoop, stopCamera, syncQualityUi]);

  useEffect(() => {
    mountedRef.current = true;
    void startCamera();

    return () => {
      mountedRef.current = false;
      clearPendingRedirect();
      stopCamera();
    };
  }, [clearPendingRedirect, startCamera, stopCamera]);

  useEffect(() => {
    if (isComplete) {
      stopCamera();
    }
  }, [isComplete, stopCamera]);

  const handleCapture = useCallback(() => {
    if (!canCapture) {
      return;
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImages((prev) => [...prev, dataUrl]);
    setCurrentStep((prev) => Math.min(prev + 1, SCAN_VIEWS.length));
  }, [canCapture]);

  const finalizeScan = useCallback(async () => {
    if (finalizationStatus === "submitting" || finalizationStatus === "redirecting") {
      return;
    }

    if (capturedImages.length < SCAN_VIEWS.length) {
      return;
    }

    clearPendingRedirect();
    finalizationStartedRef.current = true;
    setFinalizationStatus("submitting");
    setFinalizationMessage("Finalizing scan...");
    setFinalizationProgress(22);

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
          images: capturedImages,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; scan?: { id?: string } };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to finalize scan");
      }

      setFinalizationStatus("success");
      if (payload.scan?.id) {
        setFinalizationStatus("redirecting");
        setFinalizationMessage(`Scan finalized (${payload.scan.id}). Opening results...`);
        setFinalizationProgress(100);
        redirectTimeoutRef.current = window.setTimeout(() => {
          router.push(`/results/${encodeURIComponent(payload.scan.id)}`);
        }, 850);
      } else {
        setFinalizationMessage("Scan finalized. Clinic notified.");
        setFinalizationProgress(100);
      }
    } catch (error) {
      console.error("Scan finalization failed", error);
      clearPendingRedirect();
      finalizationStartedRef.current = false;
      setFinalizationStatus("error");
      setFinalizationMessage(error instanceof Error ? error.message : "Failed to finalize scan");
      setFinalizationProgress(0);
    }
  }, [capturedImages, clearPendingRedirect, finalizationStatus, router]);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    if (capturedImages.length < SCAN_VIEWS.length) {
      return;
    }

    if (finalizationStartedRef.current || finalizationStatus !== "idle") {
      return;
    }

    void finalizeScan();
  }, [capturedImages.length, finalizeScan, finalizationStatus, isComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef8ff] via-white to-[#f8fbff] text-slate-900">
      <ScanningHeader isComplete={isComplete} currentStep={currentStep} totalSteps={SCAN_VIEWS.length} />

      <div className="mx-auto flex w-full max-w-[433px] flex-col items-center px-3">
        {/* Main Viewport */}
        <div className="relative mt-5 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl shadow-sky-100/60">
          {!isComplete ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover transition-opacity ${
                  cameraState === "ready" ? "opacity-100" : "opacity-0"
                }`}
              />

              {cameraState === "ready" && (
                <ReadyCameraOverlay
                  qualityBucket={qualityBucket}
                  qualityText={qualityText}
                  instruction={SCAN_VIEWS[activeStep].instruction}
                />
              )}

              {cameraState !== "ready" && (
                <CameraStateOverlay
                  cameraState={cameraState}
                  cameraMessage={cameraMessage}
                  onRetry={() => {
                    void startCamera();
                  }}
                />
              )}
            </>
          ) : (
            <ScanFinalizationState
              totalSteps={SCAN_VIEWS.length}
              status={finalizationStatus}
              message={finalizationMessage}
              progress={finalizationProgress}
              onRetry={() => {
                void finalizeScan();
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex w-full justify-center py-7">
          {!isComplete && (
            <CaptureControl canCapture={canCapture} viewLabel={SCAN_VIEWS[activeStep].label} onCapture={handleCapture} />
          )}
        </div>

        <ThumbnailStrip views={SCAN_VIEWS} capturedImages={capturedImages} currentStep={currentStep} isComplete={isComplete} />
      </div>
    </div>
  );
}
