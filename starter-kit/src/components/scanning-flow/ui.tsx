import React from "react";
import { Camera, CheckCircle2, RefreshCw } from "lucide-react";
import { QUALITY_STYLES, getQualityLabel } from "./constants";
import type { CameraState, QualityBucket, ScanView } from "./types";

export function ScanningHeader({
  isComplete,
  currentStep,
  totalSteps,
}: {
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="p-4 w-full bg-zinc-900 border-b border-zinc-800 flex justify-between">
      <h1 className="font-bold text-blue-400">DentalScan AI</h1>
      <span className="text-xs text-zinc-500">
        {isComplete ? "Scan Complete" : `Step ${currentStep + 1}/${totalSteps}`}
      </span>
    </div>
  );
}

export function ReadyCameraOverlay({
  qualityBucket,
  qualityText,
  instruction,
}: {
  qualityBucket: QualityBucket;
  qualityText: string;
  instruction: string;
}) {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
        <div
          className={`absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[58%] max-w-[280px] aspect-[1.7/1] rounded-[9999px] border-4 ${QUALITY_STYLES[qualityBucket].border} ring-8 ${QUALITY_STYLES[qualityBucket].ring} shadow-[0_0_24px_rgba(0,0,0,0.35)]`}
        >
          <div className="absolute inset-[14%] rounded-[9999px] border border-white/35" />
        </div>
      </div>

      <div className="absolute top-4 left-4 rounded-full bg-black/65 border border-white/20 px-3 py-1.5 flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${QUALITY_STYLES[qualityBucket].dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wide">{getQualityLabel(qualityBucket)}</p>
      </div>

      <div className="absolute bottom-4 left-3 right-3 rounded-xl bg-black/60 border border-white/10 p-3 text-center">
        <p className="text-sm font-medium">{instruction}</p>
        <p className={`text-xs mt-1 ${QUALITY_STYLES[qualityBucket].text}`}>{qualityText}</p>
      </div>
    </>
  );
}

export function CameraStateOverlay({
  cameraState,
  cameraMessage,
  onRetry,
}: {
  cameraState: CameraState;
  cameraMessage: string;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black/75">
      <div className="max-w-xs space-y-3">
        {cameraState === "loading" ? (
          <>
            <RefreshCw className="mx-auto animate-spin text-zinc-300" />
            <p className="text-sm text-zinc-200">{cameraMessage}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-200">{cameraMessage}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-500 px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw size={14} />
              Retry Camera
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ScanCompleteState({ totalSteps }: { totalSteps: number }) {
  return (
    <div className="text-center p-10">
      <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold">Scan Complete</h2>
      <p className="text-zinc-400 mt-2">All {totalSteps} angles captured successfully.</p>
    </div>
  );
}

export function CaptureControl({
  canCapture,
  viewLabel,
  onCapture,
}: {
  canCapture: boolean;
  viewLabel: string;
  onCapture: () => void;
}) {
  return (
    <button
      onClick={onCapture}
      disabled={!canCapture}
      aria-label={`Capture ${viewLabel}`}
      className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-transform ${
        canCapture ? "border-white active:scale-90" : "border-zinc-500 cursor-not-allowed opacity-60"
      }`}
    >
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center ${
          canCapture ? "bg-white" : "bg-zinc-500"
        }`}
      >
        <Camera className={canCapture ? "text-black" : "text-zinc-300"} />
      </div>
    </button>
  );
}

export function ThumbnailStrip({
  views,
  capturedImages,
  currentStep,
  isComplete,
}: {
  views: ScanView[];
  capturedImages: string[];
  currentStep: number;
  isComplete: boolean;
}) {
  return (
    <div className="flex gap-2 p-4 overflow-x-auto w-full" role="list" aria-label="Captured scan thumbnails">
      {views.map((view, index) => (
        <div
          key={view.label}
          role="listitem"
          aria-current={!isComplete && index === currentStep ? "step" : undefined}
          className={`w-16 h-20 rounded border-2 shrink-0 ${
            !isComplete && index === currentStep ? "border-blue-500 bg-blue-500/10" : "border-zinc-800"
          }`}
          title={view.label}
        >
          {capturedImages[index] ? (
            <img src={capturedImages[index]} alt={`${view.label} capture`} className="w-full h-full object-cover rounded" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-zinc-600 px-1 text-center">
              <span>{index + 1}</span>
              <span className="mt-0.5">Pending</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
