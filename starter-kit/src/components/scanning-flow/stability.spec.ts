import { describe, expect, it } from "vitest";
import { getStabilityAssessment } from "@/components/scanning-flow/stability";

describe("getStabilityAssessment", () => {
  it("returns poor when inside detail is too low", () => {
    const result = getStabilityAssessment({
      insideDetail: 10,
      outsideDetail: 8,
      centerOffset: 0.02,
      motion: 3,
    });

    expect(result).toEqual({
      bucket: "poor",
      text: "Move closer so your teeth are clearer.",
    });
  });

  it("returns poor when framing is off center", () => {
    const result = getStabilityAssessment({
      insideDetail: 26,
      outsideDetail: 35,
      centerOffset: 0.15,
      motion: 4,
    });

    expect(result).toEqual({
      bucket: "poor",
      text: "Center your mouth inside the guide.",
    });
  });

  it("returns poor when motion is high", () => {
    const result = getStabilityAssessment({
      insideDetail: 30,
      outsideDetail: 15,
      centerOffset: 0.05,
      motion: 19,
    });

    expect(result).toEqual({
      bucket: "poor",
      text: "Hold your phone steady for a moment.",
    });
  });

  it("returns fair for borderline quality", () => {
    const result = getStabilityAssessment({
      insideDetail: 22,
      outsideDetail: 14,
      centerOffset: 0.08,
      motion: 8,
    });

    expect(result).toEqual({
      bucket: "fair",
      text: "Almost there. Keep steady and centered.",
    });
  });

  it("returns good for stable and clear framing", () => {
    const result = getStabilityAssessment({
      insideDetail: 30,
      outsideDetail: 10,
      centerOffset: 0.04,
      motion: 5,
    });

    expect(result).toEqual({
      bucket: "good",
      text: "Great stability. Capture when ready.",
    });
  });
});
