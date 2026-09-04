import { Router } from 'express'
import { getProducts } from '../services/qoyod.js'
import { matchItems } from '../services/matcher.js'

const router = Router()

// POST /api/match — match extracted invoice items with Qoyod products
router.post('/', async (req, res) => {
  try {
    const { items, vendor_name } = req.body

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'البنود مطلوبة' })
    }

    // The Qoyod key lives in Supabase (user_settings), not the environment —
    // getProducts() raises its own Arabic error when it's missing.
    // Fetch products from Qoyod
    const products = await getProducts()

    // Run matching algorithm
    const matched = await matchItems(items, vendor_name || '', products)

    res.json({
      success: true,
      items: matched,
      products, // send products list so frontend can show dropdown for unmatched
    })
  } catch (e) {
    console.error('Match error:', e)
    res.status(500).json({ error: e.message || 'فشل في المطابقة' })
  }
})

export default router
