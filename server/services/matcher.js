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
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export async function matchItems(invoiceItems, vendorName, qoyodProducts) {
  const mappings = await readMappings()
  const results = []

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

    // 2. Fuzzy match in saved mappings (Levenshtein < 5)
    const fuzzyMapping = mappings.find(
      (m) => levenshtein(normalize(m.vendor_item_name), normalizedDesc) < 5
    )
    if (fuzzyMapping) {
      results.push({
        ...item,
        match_type: 'fuzzy_mapping',
        matched_product_id: fuzzyMapping.qoyod_product_id,
        matched_product_name: fuzzyMapping.qoyod_product_name,
        confidence: 0.85,
      })
      continue
    }

    // 3. Fuzzy match in Qoyod products
    let bestProduct = null
    let bestDist = Infinity
    for (const p of qoyodProducts) {
      const dist = levenshtein(normalize(p.name), normalizedDesc)
      if (dist < bestDist) {
        bestDist = dist
        bestProduct = p
      }
    }
    if (bestProduct && bestDist < 8) {
      results.push({
        ...item,
        match_type: 'fuzzy_product',
        matched_product_id: bestProduct.id,
        matched_product_name: bestProduct.name,
        confidence: Math.max(0.5, 1 - bestDist / 20),
      })
      continue
    }

    // 4. AI matching
    try {
      const aiResult = await aiMatch(desc, vendorName, qoyodProducts)
      if (aiResult.product_id) {
        results.push({
          ...item,
          match_type: 'ai',
          matched_product_id: aiResult.product_id,
          matched_product_name: aiResult.product_name,
          confidence: aiResult.confidence || 0.6,
        })
        continue
      }
    } catch (e) {
      // AI match failed, fall through to unmatched
    }

    // 5. Unmatched
    results.push({
      ...item,
      match_type: 'unmatched',
      matched_product_id: null,
      matched_product_name: null,
      confidence: 0,
    })
  }

  return results
}
