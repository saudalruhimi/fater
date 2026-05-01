import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import scanRoutes from './routes/scan.js'
import matchRoutes from './routes/match.js'
import qoyodRoutes from './routes/qoyod.js'
import mappingsRoutes from './routes/mappings.js'
import vendorMappingsRoutes from './routes/vendorMappings.js'
import telegramRoutes from './routes/telegram.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '20mb' }))

// Routes
app.use('/api/scan', scanRoutes)
app.use('/api/match', matchRoutes)
app.use('/api/qoyod', qoyodRoutes)
app.use('/api/mappings', mappingsRoutes)
app.use('/api/vendor-mappings', vendorMappingsRoutes)
app.use('/api/telegram', telegramRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Mobile auth (server-side validation)
const MOBILE_USERS = [
  { username: 'saud', password: '114545745Sa&', role: 'ADMIN' },
  { username: 'users', password: 'Rakan123', role: 'UPLOADER' },
]
app.post('/api/mobile/auth', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'بيانات ناقصة' })
  }
  const u = String(username).trim().toLowerCase()
  const found = MOBILE_USERS.find((x) => x.username.toLowerCase() === u)
  if (!found) return res.status(401).json({ success: false, error: 'اسم المستخدم غير موجود' })
  if (found.password !== password) return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' })
  res.json({ success: true, user: { username: found.username, role: found.role } })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
