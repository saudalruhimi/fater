import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import scanRoutes from './routes/scan.js'
import matchRoutes from './routes/match.js'
import qoyodRoutes from './routes/qoyod.js'
import mappingsRoutes from './routes/mappings.js'

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
