import { Router } from 'express'
import multer from 'multer'
import { scanInvoice } from '../services/gemini.js'
import { supabase } from '../services/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// POST /api/scan — upload image and extract invoice data with Gemini
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع صورة' })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Gemini API غير مُعد' })
    }

    // Send the original image to Gemini without resizing (resizing degrades small numbers).
    const buffer = req.file.buffer
    const mimeType = req.file.mimetype

    const data = await scanInvoice(buffer, mimeType)

    // Upload original file to Supabase storage (best-effort — don't fail the scan if storage isn't ready)
    let imageUrl = null
    try {
      const ext = mimeType === 'application/pdf' ? 'pdf' : 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('invoices')
        .upload(filename, buffer, { contentType: mimeType, upsert: false })
      if (!upErr) {
        const { data: pub } = supabase.storage.from('invoices').getPublicUrl(filename)
        imageUrl = pub?.publicUrl || null
      } else {
        console.warn('storage upload failed:', upErr.message)
      }
    } catch (e) {
      console.warn('storage upload exception:', e?.message)
    }

    // Save scanned invoice to Supabase
    const { data: record } = await supabase
      .from('processed_invoices')
      .insert({
        vendor_name: data.vendor_name,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        total_amount: data.total_amount,
        vat_amount: data.vat_amount,
        extracted_data: data,
        image_url: imageUrl,
        status: 'scanned',
      })
      .select()
      .single()

    res.json({ success: true, data, invoice_id: record?.id, image_url: imageUrl })
  } catch (e) {
    console.error('Scan error:', e)
    const msg = String(e?.message || '')
    const status = msg.includes('429') || msg.includes('Resource exhausted') || msg.includes('مشغول') ? 429 :
                   msg.includes('503') || msg.includes('overloaded') || msg.includes('حمل عالي') ? 503 : 500
    res.status(status).json({ error: msg || 'فشل في قراءة الفاتورة' })
  }
})

export default router
