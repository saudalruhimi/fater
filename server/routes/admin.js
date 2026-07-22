import { Router } from 'express'
import { listUsers, createUser, updateUser, deleteUser, listRoles, createRole, updateRole, deleteRole } from '../services/auth.js'

const router = Router()

// ─── Users ────────────────────────────────────────────────────────────
router.get('/users', async (_req, res) => {
  try { res.json({ success: true, users: await listUsers() }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/users', async (req, res) => {
  try { res.json({ success: true, user: await createUser(req.body || {}) }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/users/:id', async (req, res) => {
  try { res.json({ success: true, user: await updateUser(req.params.id, req.body || {}) }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/users/:id', async (req, res) => {
  try { await deleteUser(req.params.id); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

// ─── Roles + Permissions ──────────────────────────────────────────────
router.get('/roles', async (_req, res) => {
  try { res.json({ success: true, roles: await listRoles() }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/roles', async (req, res) => {
  try { res.json({ success: true, role: await createRole(req.body || {}) }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.put('/roles/:key', async (req, res) => {
  try { await updateRole(req.params.key, req.body || {}); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

router.delete('/roles/:key', async (req, res) => {
  try { await deleteRole(req.params.key); res.json({ success: true }) }
  catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
