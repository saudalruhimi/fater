// Netlify function — wraps the shared Express app (server/app.js).
// Keeping this a thin wrapper means production and local dev always expose the
// exact same routes; adding a route in server/routes/ ships to both.
import serverless from 'serverless-http'
import app from '../../server/app.js'

export const handler = serverless(app)
