# Discovery Scan Audit (DentalScan.us)

I went through a full discovery scan flow (Front, Left, Right, Upper, Lower) and reviewed the results experience as a real user.

## What could be smoother

1. **Retake per angle is missing**  
   On the scan screen, once a photo is captured, there is no direct way to remove and retake that specific angle. This is the biggest UX gap. If one shot is blurry, users are forced to continue or restart mentally.

2. **Add “Retry Scan” on results page before “Talk to a Dentist”**  
   The results page moves users directly toward next steps. It should also offer a clear “Retake Scan” path in case users notice poor image quality after review.

3. **Capture gating can be stricter**  
   The scan screen can show warnings like “We can’t see your face,” but capture is still prominent. Consider stronger guardrails (temporary capture disable, clearer “why,” and a “hold steady for 1 sec” check).

4. **Confidence messaging could be less absolute**  
   Phrases like “100% confidence” may feel too definitive for demo output. Slightly softer wording may build trust and reduce misinterpretation.

## Mobile camera stability risks

- Hand shake + close-range autofocus can produce soft images, especially for upper/lower angles.
- Low-light environments and front camera exposure shifts can reduce detail quality.
- No per-angle retake increases risk of low-quality submissions.
- If upload/finalization fails after 5 captures, users may lose progress without a resilient retry/resume path.

Overall, the flow is clear and fast, but adding per-angle retake + results-page retry would significantly improve quality and user confidence.
