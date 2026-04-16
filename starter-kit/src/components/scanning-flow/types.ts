export type CameraState = "loading" | "ready" | "denied" | "error";
export type QualityBucket = "poor" | "fair" | "good";

export type ScanView = {
  label: string;
  instruction: string;
};

export type QualityStyle = {
  dot: string;
  text: string;
  border: string;
  ring: string;
};
