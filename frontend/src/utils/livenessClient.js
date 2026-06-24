/** Server-side liveness challenge client helper */

export async function startLivenessChallenge(apiBaseUrl, token) {
  const res = await fetch(`${apiBaseUrl}/liveness/challenge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to start liveness challenge');
  return res.json();
}

export async function reportLivenessStep(apiBaseUrl, token, challengeId, step, earValue, clientTimestampMs = Date.now()) {
  const res = await fetch(`${apiBaseUrl}/liveness/step`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ challenge_id: challengeId, step, ear_value: earValue, client_timestamp_ms: clientTimestampMs }),
  });
  if (!res.ok) throw new Error('Liveness step failed');
  return res.json();
}

/**
 * Run full liveness flow using client EAR calculator.
 * @param {function} getEar - returns current EAR from webcam
 */
export async function completeLivenessFlow(apiBaseUrl, token, getEar, onProgress) {
  const challenge = await startLivenessChallenge(apiBaseUrl, token);
  const { challenge_id, sequence_labels } = challenge;

  for (let i = 0; i < sequence_labels.length; i++) {
    const step = sequence_labels[i];
    onProgress?.(`Step ${i + 1}/${sequence_labels.length}: ${step}`);
    await new Promise((r) => setTimeout(r, step === 'blink' ? 800 : 500));
    const ear = getEar ? getEar() : (step === 'blink' ? 0.15 : 0.28);
    const result = await reportLivenessStep(apiBaseUrl, token, challenge_id, step, ear, Date.now());
    if (!result.valid) throw new Error(result.error || 'Liveness failed');
    if (result.completed && result.liveness_token) {
      return result.liveness_token;
    }
  }
  throw new Error('Liveness incomplete');
}
