import type { QualityBucket, QualityStyle, ScanView } from "./types";

export const SCAN_VIEWS: ScanView[] = [
  { label: "Front View", instruction: "Smile and look straight at the camera." },
  { label: "Left View", instruction: "Turn your head to the left." },
  { label: "Right View", instruction: "Turn your head to the right." },
  { label: "Upper Teeth", instruction: "Tilt your head back and open wide." },
  { label: "Lower Teeth", instruction: "Tilt your head down and open wide." },
];

export const SAMPLE_WIDTH = 64;
export const SAMPLE_HEIGHT = 48;
export const SAMPLE_INTERVAL_MS = 180;
export const GUIDE_CENTER_X = 0.5;
export const GUIDE_CENTER_Y = 0.58;
export const GUIDE_RADIUS_X = 0.26;
export const GUIDE_RADIUS_Y = 0.19;

export const QUALITY_STYLES: Record<QualityBucket, QualityStyle> = {
  poor: {
    dot: "bg-red-400",
    text: "text-red-300",
    border: "border-red-400/90",
    ring: "ring-red-500/20",
  },
  fair: {
    dot: "bg-amber-400",
    text: "text-amber-200",
    border: "border-amber-400/90",
    ring: "ring-amber-500/20",
  },
  good: {
    dot: "bg-emerald-400",
    text: "text-emerald-200",
    border: "border-emerald-400/90",
    ring: "ring-emerald-500/20",
  },
};

export function getQualityLabel(bucket: QualityBucket): string {
  if (bucket === "good") {
    return "Quality Good";
  }
  if (bucket === "fair") {
    return "Quality Fair";
  }
  return "Quality Low";
}
