import { Router } from 'express'
import { authenticate } from '../services/auth.js'

const router = Router()

// POST /api/auth/login — username + password → user (with role + permissions)
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  try {
    const result = await authenticate(username, password)
    res.json({ success: true, user: result.user })
  } catch (e) {
    res.status(401).json({ success: false, error: e.message || 'فشل التحقق' })
  }
})

export default router
