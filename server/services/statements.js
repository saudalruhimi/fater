import { GoogleGenerativeAI } from '@google/generative-ai'

/* مطابقة كشوف الحسابات.
   ينقسم العمل قسمين لا يختلطان:
     القراءة  — ذكاء اصطناعي، لأن شكل كشف المورد مجهول.
     المطابقة — حساب بحت، لأنك ستوقّع على نتيجتها فيجب أن تُبرَّر برقم وأن تتكرر. */

const PROMPT = `أنت نظام قراءة كشوف حسابات. اقرأ هذا الكشف وأخرج JSON فقط بلا أي نص إضافي:

{
  "opening_balance": 0.00,
  "closing_balance": 0.00,
  "rows": [
    { "date": "YYYY-MM-DD", "reference": "رقم المستند كما هو", "description": "البيان", "debit": 0.00, "credit": 0.00 }
  ]
}

قواعد صارمة:
- انسخ كل سطر حركة في الكشف، بالترتيب، بلا حذف ولا دمج ولا تلخيص.
- reference = رقم الفاتورة أو السند كما هو مكتوب حرفياً. إن لم يوجد فاتركه "".
- debit و credit: ضع المبلغ في عموده كما هو مطبوع، والآخر صفر. لا تجمعهما ولا تحسب فرقاً.
- تجاهل أسطر "الرصيد الافتتاحي" و"الإجمالي" و"الرصيد الختامي" من rows — ضعها في opening_balance و closing_balance.
- إن لم يُطبع رصيد افتتاحي فاجعله 0.
- المبالغ أرقام لا نصوص، والتاريخ YYYY-MM-DD.`

export async function readStatement(buffer, mimeType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: buffer.toString('base64'), mimeType } },
  ])
  const text = result.response.text()
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('تعذّرت قراءة الكشف — الصورة غير واضحة أو التنسيق غير مدعوم')

  let data
  try {
    data = JSON.parse(m[1] || m[0])
  } catch {
    throw new Error('تعذّرت قراءة الكشف — تنسيق غير مفهوم')
  }

  const rows = (data.rows || []).map((r, i) => ({
    i,
    date: String(r.date || '').slice(0, 10),
    reference: String(r.reference ?? '').trim(),
    description: String(r.description ?? '').trim(),
    debit: Number(r.debit) || 0,
    credit: Number(r.credit) || 0,
  }))

  return {
    opening: Number(data.opening_balance) || 0,
    closing: Number(data.closing_balance) || 0,
    rows,
  }
}

/* التحقق من صحة القراءة.
   الكشف يطبع رصيده الختامي، فمجموع ما قرأناه يجب أن يصل إليه. اختلافهما يعني
   أن القراءة أسقطت سطراً أو أخطأت رقماً — وهذا خطأ صامت لولا هذا الفحص:
   ينتج "فرقاً" مع المورد لا وجود له، فتطارد مشكلة ليست عنده.

   وأعمدة المدين والدائن في السطور لا لبس فيها، أما الأرصدة فتُطبع أرقاماً
   موجبة مع كلمة "مدين" أو "دائن" لا بإشارة. فنجرّب الاحتمالات الأربعة ونعتمد
   ما يجعل المعادلة تتزن — فالكشف نفسه يكشف اتجاهه، ولا نسأل عنه أحداً. */
export function verifyRead(st, tolerance = 0.05) {
  const movement = round2(st.rows.reduce((s, r) => s + r.debit - r.credit, 0))

  let best = null
  for (const so of [1, -1]) {
    for (const sc of [1, -1]) {
      const opening = so * st.opening
      const closing = sc * st.closing
      const gap = Math.abs(opening + movement - closing)
      if (!best || gap < best.gap) best = { gap, openingSign: so, closingSign: sc, opening, closing }
    }
  }

  return {
    ok: best.gap <= tolerance,
    movement,
    computed: round2(best.opening + movement),
    printed: round2(best.closing),
    gap: round2(best.gap),
    // الاتجاه المكتشَف — يُمرَّر إلى normalizeSide فتُقرأ الأرصدة كما تعنيه فعلاً
    openingSign: best.openingSign,
    closingSign: best.closingSign,
  }
}

const round2 = (n) => Math.round(n * 100) / 100

// دفاترك هي المرجع. كشف المورد مرآة: ما هو مدين عنده دائن عندك.
// نقلبه مرة واحدة هنا، فتقرأ كل شاشة بعدها بمنطق دفاترك.
export function normalizeSide(st, { mirror = false, openingSign = 1, closingSign = 1 } = {}) {
  const flip = mirror ? -1 : 1
  return {
    ...st,
    opening: round2(flip * openingSign * st.opening),
    closing: round2(flip * closingSign * st.closing),
    rows: st.rows.map((r) => ({
      ...r,
      amount: round2(mirror ? r.credit - r.debit : r.debit - r.credit),
    })),
  }
}

const normRef = (s) =>
  String(s || '').replace(/[\s\-_/\\.#]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).toLowerCase()

const daysApart = (a, b) => {
  const t1 = Date.parse(a), t2 = Date.parse(b)
  if (isNaN(t1) || isNaN(t2)) return 9999
  return Math.abs(t1 - t2) / 86400000
}

/**
 * يطابق كشفين مطبَّعين. لا ذكاء اصطناعي هنا — كل ارتباط يُبرَّر بقاعدة مسمّاة.
 * opts.tolerance  هامش الهللات (فروق تقريب الضريبة لا تصنع اختلافاً)
 * opts.dateWindow أيام السماح لمطابقة المبلغ حين يغيب رقم المستند
 */
export function reconcile(ours, theirs, opts = {}) {
  const tolerance = opts.tolerance ?? 0.05
  const dateWindow = opts.dateWindow ?? 3

  const A = ours.rows.map((r) => ({ ...r, side: 'ours', taken: false }))
  const B = theirs.rows.map((r) => ({ ...r, side: 'theirs', taken: false }))
  const pairs = []

  const clean = (r) => ({ date: r.date, reference: r.reference, description: r.description, amount: r.amount })

  const link = (a, b, rule) => {
    a.taken = true; b.taken = true
    pairs.push({ ours: clean(a), theirs: clean(b), rule, diff: round2(a.amount - b.amount) })
  }

  // ① رقم المستند — رقم الفاتورة موحّد بين الطرفين فيغطي الأغلبية
  const byRef = new Map()
  for (const b of B) {
    const k = normRef(b.reference)
    if (!k) continue
    if (!byRef.has(k)) byRef.set(k, [])
    byRef.get(k).push(b)
  }
  for (const a of A) {
    const k = normRef(a.reference)
    if (!k) continue
    const candidate = (byRef.get(k) || []).find((b) => !b.taken)
    if (candidate) link(a, candidate, 'reference')
  }

  // ② المبلغ والتاريخ — للحوالات وما لا يحمل رقماً مشتركاً
  for (const a of A) {
    if (a.taken) continue
    const candidate = B.find(
      (b) => !b.taken &&
        Math.abs(b.amount - a.amount) <= tolerance &&
        daysApart(a.date, b.date) <= dateWindow
    )
    if (candidate) link(a, candidate, 'amount+date')
  }

  // ③ دفعة واحدة مقابل عدة فواتير.
  // نقصر المرشحين على نفس الاتجاه ونافذة زمنية قبل التركيب، وإلا انفجر العدد:
  // ٨٠ سطراً بتركيبات حتى ستة تتجاوز ٣٠٠ مليون احتمال.
  const openA = () => A.filter((r) => !r.taken)
  const openB = () => B.filter((r) => !r.taken)
  for (const a of openA()) {
    if (a.taken) continue
    const pool = openB().filter(
      (b) => Math.sign(b.amount) === Math.sign(a.amount) &&
        Math.abs(b.amount) <= Math.abs(a.amount) + tolerance &&
        daysApart(a.date, b.date) <= 60
    ).slice(0, 12)
    const combo = findSubset(pool, a.amount, tolerance, 6)
    if (combo) {
      a.taken = true
      combo.forEach((b) => { b.taken = true })
      pairs.push({
        ours: clean(a),
        theirs: combo.map(clean),
        rule: 'combination',
        diff: round2(a.amount - combo.reduce((s, x) => s + x.amount, 0)),
      })
    }
  }

  const matched = pairs.filter((p) => Math.abs(p.diff) <= tolerance)
  const amountDiff = pairs.filter((p) => Math.abs(p.diff) > tolerance)
  const onlyTheirs = B.filter((r) => !r.taken).map(clean)
  const onlyOurs = A.filter((r) => !r.taken).map(clean)

  const sum = (rows) => round2(rows.reduce((s, r) => s + r.amount, 0))

  return {
    openingGap: round2(ours.opening - theirs.opening),
    closingGap: round2(ours.closing - theirs.closing),
    ourClosing: round2(ours.closing),
    theirClosing: round2(theirs.closing),
    counts: {
      ours: A.length, theirs: B.length,
      matched: matched.length, amountDiff: amountDiff.length,
      onlyOurs: onlyOurs.length, onlyTheirs: onlyTheirs.length,
    },
    matched, amountDiff,
    onlyOurs: { rows: onlyOurs, total: sum(onlyOurs) },
    onlyTheirs: { rows: onlyTheirs, total: sum(onlyTheirs) },
    clean: amountDiff.length === 0 && onlyOurs.length === 0 && onlyTheirs.length === 0,
  }
}

// أصغر مجموعة من pool مجموعها يساوي target ضمن الهامش
function findSubset(pool, target, tolerance, maxSize) {
  const n = pool.length
  if (!n) return null
  for (let size = 2; size <= Math.min(maxSize, n); size++) {
    const idx = Array.from({ length: size }, (_, i) => i)
    while (true) {
      const total = idx.reduce((s, i) => s + pool[i].amount, 0)
      if (Math.abs(total - target) <= tolerance) return idx.map((i) => pool[i])
      let k = size - 1
      while (k >= 0 && idx[k] === n - size + k) k--
      if (k < 0) break
      idx[k]++
      for (let j = k + 1; j < size; j++) idx[j] = idx[j - 1] + 1
    }
  }
  return null
}
