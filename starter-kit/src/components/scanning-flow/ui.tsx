import React from "react";
import Image from "next/image";
import { Camera, CheckCircle2, RefreshCw } from "lucide-react";
import logo from "@/assets/logo.webp";
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
    <header className="w-full border-b border-sky-100/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex w-full max-w-[1092px] items-center justify-between px-[10px] py-[10px]">
        <Image src={logo} alt="DentalScan" className="h-[44px] w-auto" priority />
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          {isComplete ? "Scan Complete" : `Step ${currentStep + 1}/${totalSteps}`}
        </span>
      </div>
    </header>
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30" />
        <div
          className={`absolute left-1/2 top-[58%] aspect-[1.7/1] w-[58%] max-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-[9999px] border-4 ${QUALITY_STYLES[qualityBucket].border} ring-8 ${QUALITY_STYLES[qualityBucket].ring} shadow-[0_0_28px_rgba(15,23,42,0.25)]`}
        >
          <div className="absolute inset-[14%] rounded-[9999px] border border-white/50" />
        </div>
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur">
        <span className={`h-2.5 w-2.5 rounded-full ${QUALITY_STYLES[qualityBucket].dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{getQualityLabel(qualityBucket)}</p>
      </div>

      <div className="absolute bottom-4 left-3 right-3 rounded-xl border border-sky-100 bg-white/90 p-3 text-center shadow-sm backdrop-blur">
        <p className="text-sm font-semibold text-slate-800">{instruction}</p>
        <p className={`mt-1 text-xs font-medium ${QUALITY_STYLES[qualityBucket].text}`}>{qualityText}</p>
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
    <div className="absolute inset-0 flex items-center justify-center bg-white/78 p-6 text-center backdrop-blur-sm">
      <div className="w-full max-w-xs space-y-3 rounded-2xl border border-sky-100 bg-white/95 p-5 shadow-lg shadow-sky-100/60">
        {cameraState === "loading" ? (
          <>
            <RefreshCw className="mx-auto animate-spin text-sky-600" />
            <p className="text-sm text-slate-700">{cameraMessage}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">{cameraMessage}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50"
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

export function ScanFinalizationState({
  totalSteps,
  status,
  message,
  progress,
  onRetry,
}: {
  totalSteps: number;
  status: "idle" | "submitting" | "redirecting" | "success" | "error";
  message: string;
  progress: number;
  onRetry: () => void;
}) {
  const isLoading = status === "submitting" || status === "redirecting";
  const isError = status === "error";
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const showProgress = !isError;

  return (
    <div className="p-10 text-center">
      <CheckCircle2 size={48} className="mx-auto mb-4 text-sky-500" />
      <h2 className="text-xl font-bold text-slate-900">Scan Complete</h2>
      <p className="mt-2 text-sm text-slate-500">All {totalSteps} angles captured successfully.</p>
      <p className={`mt-3 text-sm ${isError ? "text-red-600" : "text-slate-700"}`}>{message}</p>
      {showProgress && (
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4ebff7] to-[#35a3e8] transition-all duration-700 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{Math.round(clampedProgress)}%</p>
        </div>
      )}
      {(isLoading || isError) && (
        <div className="mt-4">
          {isLoading ? (
            <RefreshCw className="mx-auto animate-spin text-sky-600" />
          ) : (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50"
            >
              <RefreshCw size={14} />
              Retry Finalization
            </button>
          )}
        </div>
      )}
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
      className={`flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-lg transition-transform ${
        canCapture
          ? "border-sky-300 bg-white active:scale-90"
          : "cursor-not-allowed border-slate-300 bg-slate-100 opacity-70"
      }`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          canCapture ? "bg-gradient-to-r from-[#4ebff7] to-[#35a3e8]" : "bg-slate-300"
        }`}
      >
        <Camera className="text-white" />
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
    <div className="w-full overflow-x-auto">
      <div className="mx-auto flex w-max min-w-full justify-center gap-2 p-4" role="list" aria-label="Captured scan thumbnails">
        {views.map((view, index) => (
          <div
            key={view.label}
            role="listitem"
            aria-current={!isComplete && index === currentStep ? "step" : undefined}
            className={`h-20 w-16 shrink-0 rounded-lg border-2 bg-white shadow-sm ${
              !isComplete && index === currentStep ? "border-[#4ebff7]" : "border-sky-100"
            }`}
            title={view.label}
          >
            {capturedImages[index] ? (
              <img
                src={capturedImages[index]}
                alt={`${view.label} capture`}
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center text-[10px] text-slate-500">
                <span>{index + 1}</span>
                <span className="mt-0.5">Pending</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
