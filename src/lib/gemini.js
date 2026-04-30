// Retry wrapper for Gemini-backed API calls
// Detects 429 / 503 errors from server response, retries with exponential backoff,
// fires UI callbacks during retries, and logs failures to Supabase.

import { supabase } from './supabase'

const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s
const MAX_RETRIES = RETRY_DELAYS.length

function isRateLimited(err) {
  const msg = String(err?.message || '')
  return msg.includes('429') ||
    msg.includes('Too Many Requests') ||
    msg.includes('Resource exhausted') ||
    msg.includes('مشغول') ||
    msg.includes('تجاوز حد')
}

function isOverloaded(err) {
  const msg = String(err?.message || '')
  return msg.includes('503') ||
    msg.includes('overloaded') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('حمل عالي')
}

/**
 * Wrap an async Gemini-backed call with automatic retry on 429/503.
 * @param {() => Promise<any>} asyncFn - the call to retry
 * @param {object} opts
 * @param {(info: {attempt: number, totalAttempts: number, delay: number, reason: string}) => void} [opts.onRetry] - called before each retry
 * @param {object} [opts.errorContext] - { user_id, invoice_id } for error logging
 */
export async function callGeminiWithRetry(asyncFn, opts = {}) {
  const { onRetry, errorContext = {} } = opts
  let lastErr

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await asyncFn()
    } catch (e) {
      lastErr = e
      const retryable = isRateLimited(e) || isOverloaded(e)

      if (!retryable) {
        // Not a transient error — log and rethrow immediately
        await logError(e, attempt, errorContext)
        throw e
      }

      if (attempt >= MAX_RETRIES) {
        await logError(e, attempt, { ...errorContext, final: true })
        throw new Error('الخدمة مشغولة حالياً، حاول بعد دقيقة')
      }

      const delay = RETRY_DELAYS[attempt]
      const reason = isRateLimited(e) ? 'rate_limit' : 'overloaded'
      if (onRetry) {
        try { onRetry({ attempt: attempt + 1, totalAttempts: MAX_RETRIES + 1, delay, reason }) } catch { /* ignore */ }
      }
      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastErr
}

async function logError(err, retryCount, context) {
  try {
    await supabase.from('error_logs').insert({
      user_id: context.user_id || null,
      invoice_id: context.invoice_id || null,
      error_message: String(err?.message || err || 'unknown').slice(0, 1000),
      retry_count: retryCount,
    })
  } catch {
    // Fail silently if error_logs table doesn't exist or insert fails
  }
}
