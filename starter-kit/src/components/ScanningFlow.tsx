"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  ScanCompleteState,
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previousFrameRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef(0);
  const mountedRef = useRef(false);
  const qualityBucketRef = useRef<QualityBucket>("fair");
  const qualityTextRef = useRef("Align your mouth inside the guide.");

  const [cameraState, setCameraState] = useState<CameraState>("loading");
  const [cameraMessage, setCameraMessage] = useState("Requesting camera access...");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [qualityBucket, setQualityBucket] = useState<QualityBucket>("fair");
  const [qualityText, setQualityText] = useState("Align your mouth inside the guide.");

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
      stopCamera();
    };
  }, [startCamera, stopCamera]);

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

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white">
      <ScanningHeader isComplete={isComplete} currentStep={currentStep} totalSteps={SCAN_VIEWS.length} />

      {/* Main Viewport */}
      <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-950 overflow-hidden flex items-center justify-center">
        {!isComplete ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity ${
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
          <ScanCompleteState totalSteps={SCAN_VIEWS.length} />
        )}
      </div>

      {/* Controls */}
      <div className="p-10 w-full flex justify-center">
        {!isComplete && (
          <CaptureControl canCapture={canCapture} viewLabel={SCAN_VIEWS[activeStep].label} onCapture={handleCapture} />
        )}
      </div>

      <ThumbnailStrip views={SCAN_VIEWS} capturedImages={capturedImages} currentStep={currentStep} isComplete={isComplete} />
    </div>
  );
}
