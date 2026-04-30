import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
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

    // Compress image if too large (max 4MB for Gemini)
    let buffer = req.file.buffer
    let mimeType = req.file.mimetype

    if (mimeType !== 'application/pdf' && buffer.length > 4 * 1024 * 1024) {
      buffer = await sharp(buffer).resize(2000, 2000, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()
      mimeType = 'image/jpeg'
    }

    const data = await scanInvoice(buffer, mimeType)

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
        status: 'scanned',
      })
      .select()
      .single()

    res.json({ success: true, data, invoice_id: record?.id })
  } catch (e) {
    console.error('Scan error:', e)
    const msg = String(e?.message || '')
    const status = msg.includes('429') || msg.includes('Resource exhausted') || msg.includes('مشغول') ? 429 :
                   msg.includes('503') || msg.includes('overloaded') || msg.includes('حمل عالي') ? 503 : 500
    res.status(status).json({ error: msg || 'فشل في قراءة الفاتورة' })
  }
})

export default router
