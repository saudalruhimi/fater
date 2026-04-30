import { Router } from 'express'
import { supabase } from '../services/supabase.js'

const router = Router()

// GET /api/vendor-mappings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_mappings')
      .select('*')
      .order('times_used', { ascending: false })
    if (error) throw new Error(error.message)
    res.json({ success: true, mappings: data || [] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/vendor-mappings
router.post('/', async (req, res) => {
  try {
    const { invoice_vendor_name, qoyod_vendor_id, qoyod_vendor_name } = req.body

    if (!invoice_vendor_name || !qoyod_vendor_id || !qoyod_vendor_name) {
      return res.status(400).json({ error: 'بيانات المطابقة ناقصة' })
    }

    // Check if mapping exists — bump usage count
    const { data: existing } = await supabase
      .from('vendor_mappings')
      .select('*')
      .eq('invoice_vendor_name', invoice_vendor_name)
      .eq('qoyod_vendor_id', qoyod_vendor_id)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('vendor_mappings')
        .update({ times_used: (existing.times_used || 1) + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return res.json({ success: true, mapping: data, updated: true })
    }

    const { data, error } = await supabase
      .from('vendor_mappings')
      .insert({
        invoice_vendor_name,
        qoyod_vendor_id,
        qoyod_vendor_name,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    res.json({ success: true, mapping: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/vendor-mappings/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    const { invoice_vendor_name, qoyod_vendor_id, qoyod_vendor_name } = req.body
    if (invoice_vendor_name) updates.invoice_vendor_name = invoice_vendor_name
    if (qoyod_vendor_id) updates.qoyod_vendor_id = qoyod_vendor_id
    if (qoyod_vendor_name) updates.qoyod_vendor_name = qoyod_vendor_name
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('vendor_mappings')
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

// DELETE /api/vendor-mappings/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_mappings')
      .delete()
      .eq('id', req.params.id)

    if (error) throw new Error(error.message)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
