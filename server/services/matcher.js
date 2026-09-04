import { readMappings } from '../routes/mappings.js'
import { aiMatch } from './gemini.js'

// Levenshtein distance
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1])
    }
  }
  return matrix[a.length][b.length]
}

// Normalize Arabic text for comparison
function normalize(text) {
  return String(text || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Length-relative similarity (0..1). An absolute edit-distance threshold lets short
// Arabic names match almost anything — "أحواش" is within 5 edits of most 5-letter
// names — so compare as a ratio of the longer string instead.
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// Saved mappings should be near-identical; the product catalogue can be looser.
const MAPPING_MIN_SIMILARITY = 0.85
const PRODUCT_MIN_SIMILARITY = 0.72

// Run `worker` over `jobs` with at most `limit` in flight. Sequential AI calls are
// the single slowest thing in this pipeline — an invoice with 10 unmatched lines
// meant 10 round-trips back-to-back, which overruns a serverless request budget.
async function mapWithConcurrency(jobs, limit, worker) {
  const out = new Array(jobs.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= jobs.length) return
      out[i] = await worker(jobs[i], i)
    }
  })
  await Promise.all(runners)
  return out
}

const AI_CONCURRENCY = 4

export async function matchItems(invoiceItems, vendorName, qoyodProducts) {
  const mappings = await readMappings()
  const results = []
  // Lines that survive the deterministic passes go to the AI in one parallel batch.
  const needsAi = []

  for (const item of invoiceItems) {
    const desc = item.description
    const normalizedDesc = normalize(desc)

    // 1. Exact match in saved mappings
    const exactMapping = mappings.find((m) => normalize(m.vendor_item_name) === normalizedDesc)
    if (exactMapping) {
      results.push({
        ...item,
        match_type: 'exact',
        matched_product_id: exactMapping.qoyod_product_id,
        matched_product_name: exactMapping.qoyod_product_name,
        confidence: 1.0,
      })
      continue
    }

    // 2. Fuzzy match in saved mappings — keep the closest, not the first above the bar
    let bestMapping = null
    let bestMappingSim = 0
    for (const m of mappings) {
      const sim = similarity(normalize(m.vendor_item_name), normalizedDesc)
      if (sim > bestMappingSim) {
        bestMappingSim = sim
        bestMapping = m
      }
    }
    if (bestMapping && bestMappingSim >= MAPPING_MIN_SIMILARITY) {
      results.push({
        ...item,
        match_type: 'fuzzy_mapping',
        matched_product_id: bestMapping.qoyod_product_id,
        matched_product_name: bestMapping.qoyod_product_name,
        confidence: bestMappingSim,
      })
      continue
    }

    // 3. Fuzzy match in Qoyod products
    let bestProduct = null
    let bestProductSim = 0
    for (const p of qoyodProducts) {
      const sim = similarity(normalize(p.name), normalizedDesc)
      if (sim > bestProductSim) {
        bestProductSim = sim
        bestProduct = p
      }
    }
    if (bestProduct && bestProductSim >= PRODUCT_MIN_SIMILARITY) {
      results.push({
        ...item,
        match_type: 'fuzzy_product',
        matched_product_id: bestProduct.id,
        matched_product_name: bestProduct.name,
        confidence: bestProductSim,
      })
      continue
    }

    // 4. Nothing deterministic matched — hold a slot and let the AI pass fill it.
    results.push({
      ...item,
      match_type: 'unmatched',
      matched_product_id: null,
      matched_product_name: null,
      confidence: 0,
    })
    needsAi.push({ item, desc, slot: results.length - 1 })
  }

  // 5. AI pass — all remaining lines at once, only trusting ids that really exist
  // in the Qoyod catalogue (the model can invent both id and name).
  if (needsAi.length) {
    await mapWithConcurrency(needsAi, AI_CONCURRENCY, async ({ item, desc, slot }) => {
      try {
        const aiResult = await aiMatch(desc, vendorName, qoyodProducts)
        const suggested = aiResult?.product_id != null
          ? qoyodProducts.find((p) => String(p.id) === String(aiResult.product_id))
          : null
        if (suggested) {
          results[slot] = {
            ...item,
            match_type: 'ai',
            matched_product_id: suggested.id,
            matched_product_name: suggested.name,
            confidence: aiResult.confidence || 0.6,
          }
        }
      } catch {
        // AI match failed — the slot keeps its 'unmatched' placeholder
      }
    })
  }

  return results
}
