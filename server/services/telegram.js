const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

// Allowed user IDs (whitelist)
const ALLOWED_USERS = (process.env.TELEGRAM_ALLOWED_USERS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export function isAllowed(userId) {
  // If no whitelist configured, allow all (for initial setup)
  if (!ALLOWED_USERS.length) return true
  return ALLOWED_USERS.includes(String(userId))
}

export async function sendMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  }
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function sendTyping(chatId) {
  await fetch(`${API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  })
}

export async function getFile(fileId) {
  const res = await fetch(`${API}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error('Failed to get file')
  const filePath = data.result.file_path
  const fileRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`)
  const buffer = Buffer.from(await fileRes.arrayBuffer())
  return { buffer, path: filePath }
}

export async function setWebhook(url) {
  const res = await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, allowed_updates: ['message', 'callback_query'] }),
  })
  return res.json()
}

export async function deleteWebhook() {
  const res = await fetch(`${API}/deleteWebhook`, { method: 'POST' })
  return res.json()
}
