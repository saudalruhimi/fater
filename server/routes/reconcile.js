import { Router } from 'express'
import multer from 'multer'
import { readStatement, verifyRead, normalizeSide, reconcile } from '../services/statements.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// POST /api/reconcile — كشفان لنفس المورد والفترة، والجواب: فيه فرق؟ وأين؟
router.post('/', upload.fields([{ name: 'ours', maxCount: 1 }, { name: 'theirs', maxCount: 1 }]), async (req, res) => {
  try {
    const ourFile = req.files?.ours?.[0]
    const theirFile = req.files?.theirs?.[0]
    if (!ourFile || !theirFile) {
      return res.status(400).json({ error: 'ارفع الكشفين — كشف قيود وكشف المورد' })
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'مفتاح Gemini API غير مُعد' })
    }

    // القراءتان بالتوازي — كل واحدة نداء مستقل، فلا داعي لانتظار الأولى
    const [ours, theirs] = await Promise.all([
      readStatement(ourFile.buffer, ourFile.mimetype),
      readStatement(theirFile.buffer, theirFile.mimetype),
    ])

    const vOurs = verifyRead(ours)
    const vTheirs = verifyRead(theirs)

    // القراءة الخاطئة تصنع فروقاً وهمية — نوقف قبل أن نضلّل
    if (!vOurs.ok || !vTheirs.ok) {
      return res.json({
        success: false,
        stage: 'read',
        verify: { ours: vOurs, theirs: vTheirs },
        rows: { ours: ours.rows, theirs: theirs.rows },
        error: 'مجموع السطور المقروءة لا يطابق الرصيد المطبوع في الكشف — راجع القراءة قبل المطابقة',
      })
    }

    const A = normalizeSide(ours, { openingSign: vOurs.openingSign, closingSign: vOurs.closingSign })
    const B = normalizeSide(theirs, { mirror: true, openingSign: vTheirs.openingSign, closingSign: vTheirs.closingSign })

    const result = reconcile(A, B, {
      tolerance: Number(req.body.tolerance) || 0.05,
      dateWindow: Number(req.body.dateWindow) || 3,
    })

    res.json({
      success: true,
      verify: { ours: vOurs, theirs: vTheirs },
      // الافتتاحي المختلف يعني أن الخلل من فترة سابقة — المطابقة تحته تضلّل
      openingGate: Math.abs(result.openingGap) > (Number(req.body.tolerance) || 0.05),
      result,
    })
  } catch (e) {
    console.error('Reconcile error:', e)
    res.status(500).json({ error: e.message || 'فشلت المطابقة' })
  }
})

export default router
