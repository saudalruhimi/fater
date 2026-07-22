// Shared Express app — the single source of truth for the API.
// Used by server/index.js (local dev, adds listen) and netlify/functions/api.mjs
// (production, wrapped by serverless-http). Never call listen() here.
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import scanRoutes from './routes/scan.js'
import matchRoutes from './routes/match.js'
import qoyodRoutes from './routes/qoyod.js'
import mappingsRoutes from './routes/mappings.js'
import vendorMappingsRoutes from './routes/vendorMappings.js'
import telegramRoutes from './routes/telegram.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import { authenticate } from './services/auth.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))

// Routes
app.use('/api/scan', scanRoutes)
app.use('/api/match', matchRoutes)
app.use('/api/qoyod', qoyodRoutes)
app.use('/api/mappings', mappingsRoutes)
app.use('/api/vendor-mappings', vendorMappingsRoutes)
app.use('/api/telegram', telegramRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Mobile auth — same DB-backed flow as web
app.post('/api/mobile/auth', async (req, res) => {
  const { username, password } = req.body || {}
  try {
    const result = await authenticate(username, password)
    res.json({ success: true, user: { username: result.user.username, role: result.user.role } })
  } catch (e) {
    res.status(401).json({ success: false, error: e.message })
  }
})

export default app
