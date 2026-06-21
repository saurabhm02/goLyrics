const DEBUG_ENDPOINT = 'http://127.0.0.1:7879/ingest/7119862b-8118-43fc-ba24-bce2d471dc8d'
const DEBUG_SESSION = 'fa8fbc'

export function sessionLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
): void {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now()
    })
  }).catch(() => {})
  // #endregion
}
