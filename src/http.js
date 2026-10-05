export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  response.end(JSON.stringify(body))
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 15_000) {
  const signal = AbortSignal.timeout(timeoutMs)
  try {
    return await fetch(url, { ...options, signal })
  } catch (error) {
    if (['AbortError', 'TimeoutError'].includes(error?.name)) throw new HttpError(504, 'Upstream request timed out')
    throw new HttpError(502, 'Upstream request failed', error?.message)
  }
}

export function positiveInteger(value, fallback, maximum) {
  const parsed = /^\d+$/.test(String(value ?? '')) ? Number(value) : NaN
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.min(parsed, maximum)
}

