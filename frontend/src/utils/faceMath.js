export const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
export const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];

export function calculateEAR(landmarks, eyeIndices) {
  try {
    const p1 = landmarks[eyeIndices[0]];
    const p2 = landmarks[eyeIndices[1]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[3]];
    const p5 = landmarks[eyeIndices[4]];
    const p6 = landmarks[eyeIndices[5]];

    const distHorizontal = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    const distVertical1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const distVertical2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);

    if (distHorizontal === 0) return 0.0;
    return (distVertical1 + distVertical2) / (2.0 * distHorizontal);
  } catch (e) {
    return 0.0;
  }
}
