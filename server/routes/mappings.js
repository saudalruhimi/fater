import { Router } from 'express'
import { supabase } from '../services/supabase.js'

const router = Router()

export async function readMappings() {
  const { data, error } = await supabase
    .from('item_mappings')
    .select('*')
    .order('times_used', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// GET /api/mappings
router.get('/', async (req, res) => {
  try {
    const mappings = await readMappings()
    res.json({ success: true, mappings })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/mappings
router.post('/', async (req, res) => {
  try {
    const { vendor_item_name, qoyod_product_id, qoyod_product_name, vendor_name } = req.body

    if (!vendor_item_name || !qoyod_product_id || !qoyod_product_name) {
      return res.status(400).json({ error: 'بيانات المطابقة ناقصة' })
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('item_mappings')
      .select('*')
      .eq('vendor_item_name', vendor_item_name)
      .eq('qoyod_product_id', qoyod_product_id)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('item_mappings')
        .update({ times_used: (existing.times_used || 1) + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return res.json({ success: true, mapping: data, updated: true })
    }

    const { data, error } = await supabase
      .from('item_mappings')
      .insert({
        vendor_item_name,
        qoyod_product_id,
        qoyod_product_name,
        vendor_name: vendor_name || '',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    res.json({ success: true, mapping: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/mappings/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    const { vendor_item_name, qoyod_product_id, qoyod_product_name, vendor_name } = req.body
    if (vendor_item_name) updates.vendor_item_name = vendor_item_name
    if (qoyod_product_id) updates.qoyod_product_id = qoyod_product_id
    if (qoyod_product_name) updates.qoyod_product_name = qoyod_product_name
    if (vendor_name !== undefined) updates.vendor_name = vendor_name
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('item_mappings')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) return res.status(404).json({ error: 'غير موجود' })
    res.json({ success: true, mapping: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/mappings/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('item_mappings')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new Error(error.message)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
