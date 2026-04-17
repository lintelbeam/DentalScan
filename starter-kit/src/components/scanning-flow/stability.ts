import type { QualityBucket } from "./types";

export type StabilityMetrics = {
  insideDetail: number;
  outsideDetail: number;
  centerOffset: number;
  motion: number;
};

export type StabilityAssessment = {
  bucket: QualityBucket;
  text: string;
};

export function getStabilityAssessment(metrics: StabilityMetrics): StabilityAssessment {
  const { insideDetail, outsideDetail, centerOffset, motion } = metrics;

  if (insideDetail < 14) {
    return {
      bucket: "poor",
      text: "Move closer so your teeth are clearer.",
    };
  }

  if (centerOffset > 0.14 || outsideDetail > insideDetail * 1.2) {
    return {
      bucket: "poor",
      text: "Center your mouth inside the guide.",
    };
  }

  if (motion > 18) {
    return {
      bucket: "poor",
      text: "Hold your phone steady for a moment.",
    };
  }

  if (centerOffset > 0.09 || motion > 10 || insideDetail < 24) {
    return {
      bucket: "fair",
      text: "Almost there. Keep steady and centered.",
    };
  }

  return {
    bucket: "good",
    text: "Great stability. Capture when ready.",
  };
}
