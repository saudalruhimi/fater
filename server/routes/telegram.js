import { Router } from 'express'
import { sendMessage, sendTyping, getFile, isAllowed, setWebhook } from '../services/telegram.js'
import { processMessage, clearSession, executeConfirmedAction } from '../services/agent.js'

const router = Router()

// Pending confirmations: userId -> { action, data, timestamp }
const pendingConfirmations = new Map()

// POST /api/telegram/webhook — receives Telegram updates
router.post('/webhook', async (req, res) => {
  res.sendStatus(200) // respond immediately

  try {
    const update = req.body
    const message = update.message || update.callback_query?.message
    if (!message) return

    const chatId = message.chat.id
    const userId = message.from?.id || chatId
    const text = message.text || message.caption || ''
    const firstName = message.from?.first_name || ''

    // Check whitelist
    if (!isAllowed(userId)) {
      await sendMessage(chatId, `⛔ عذراً ${firstName}، ما عندك صلاحية تستخدم فاتِر.\n\nرقمك: <code>${userId}</code>\n\nأرسل هالرقم للمسؤول عشان يضيفك.`)
      return
    }

    // /start command
    if (text === '/start') {
      await sendMessage(chatId, `أهلاً ${firstName} 👋\n\nأنا <b>فاتِر</b> — مساعدك المحاسبي الذكي.\n\n🆔 رقمك: <code>${userId}</code>\n\nأقدر أساعدك بـ:\n• 📸 أرسل صورة فاتورة وأسجلها بقيود\n• 🔍 ابحث عن فواتير أو موردين\n• 📊 ملخصات وتقارير\n• 💳 سندات صرف\n\nكلمني بالعربي وأنا أتصرف 😊`)
      return
    }

    // /clear command — reset session
    if (text === '/clear') {
      clearSession(userId)
      await sendMessage(chatId, 'تم مسح المحادثة ✨ — كلمني من جديد')
      return
    }

    // /id command
    if (text === '/id') {
      await sendMessage(chatId, `🆔 رقمك: <code>${userId}</code>`)
      return
    }

    // Handle confirmation responses
    if (pendingConfirmations.has(userId)) {
      const pending = pendingConfirmations.get(userId)
      const isConfirm = /^(نعم|اي|ايه|اكيد|أكيد|yes|ok|تمام|سجل|سوي|نفذ)$/i.test(text.trim())
      const isDeny = /^(لا|لأ|الغ|الغي|cancel|no)$/i.test(text.trim())

      if (isConfirm) {
        pendingConfirmations.delete(userId)
        await sendTyping(chatId)
        try {
          const result = await executeConfirmedAction(pending.action, pending.data)
          if (result.success) {
            if (pending.action === 'create_bill') {
              await sendMessage(chatId, `✅ تم تسجيل الفاتورة بقيود\n\n📋 رقم الفاتورة: ${result.bill_id}\n🏢 المورد: ${result.vendor}\n💰 المبلغ: ${result.total} ر.س`)
            } else if (pending.action === 'create_payment') {
              await sendMessage(chatId, `✅ تم إنشاء سند الصرف\n\n🏢 المورد: ${result.vendor}\n💰 المبلغ: ${result.amount} ر.س\n🏦 من حساب: ${result.account}`)
            }
          } else {
            await sendMessage(chatId, `❌ فشلت العملية: ${result.error || 'خطأ غير معروف'}`)
          }
        } catch (e) {
          await sendMessage(chatId, `❌ خطأ: ${e.message}`)
        }
        return
      } else if (isDeny) {
        pendingConfirmations.delete(userId)
        await sendMessage(chatId, '⏹ تم الإلغاء.')
        return
      }
      // If neither confirm nor deny, process as new message
      pendingConfirmations.delete(userId)
    }

    // Show typing indicator
    await sendTyping(chatId)

    // Handle image messages
    let imageBuffer = null
    let mimeType = null
    const photo = message.photo
    const document = message.document

    if (photo?.length) {
      // Get highest resolution photo
      const fileId = photo[photo.length - 1].file_id
      const file = await getFile(fileId)
      imageBuffer = file.buffer
      mimeType = 'image/jpeg'
    } else if (document && document.mime_type?.startsWith('image/')) {
      const file = await getFile(document.file_id)
      imageBuffer = file.buffer
      mimeType = document.mime_type
    }

    // Process with Agent
    const response = await processMessage(userId, text, imageBuffer, mimeType)

    // Check if response contains a confirmation request
    if (response.includes('needs_confirmation') || response.includes('تأكيد')) {
      // The agent will format confirmation requests naturally
    }

    // Send response (split if too long)
    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/gs) || [response]
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk)
      }
    } else {
      await sendMessage(chatId, response)
    }
  } catch (e) {
    console.error('[Telegram] Error:', e.message)
    const chatId = req.body?.message?.chat?.id
    if (chatId) {
      await sendMessage(chatId, `❌ صار خطأ: ${e.message}`).catch(() => {})
    }
  }
})

// POST /api/telegram/set-webhook — set the webhook URL
router.post('/set-webhook', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL مطلوب' })
    const result = await setWebhook(`${url}/api/telegram/webhook`)
    res.json({ success: true, result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/telegram/status
router.get('/status', (req, res) => {
  res.json({
    configured: !!process.env.TELEGRAM_BOT_TOKEN,
    token_preview: process.env.TELEGRAM_BOT_TOKEN ? '•••' + process.env.TELEGRAM_BOT_TOKEN.slice(-6) : null,
  })
})

export default router
