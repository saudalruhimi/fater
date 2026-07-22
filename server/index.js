// Local dev server — wraps the shared app (server/app.js) with a listener.
import app from './app.js'
import { bootstrapAuth } from './services/auth.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`)
  await bootstrapAuth()
})
