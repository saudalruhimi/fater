import {
  Scale, Upload, FileText, X, Loader2, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { PageHeader, EmptyState, ledger, field, btn } from '../components/ui'
import { useToast, parseError } from '../contexts/ToastContext.jsx'
import { reconcileStatements, getVendors } from '../lib/api'
import { saveReconciliation } from '../lib/reconciliations'
import { useAuth } from '../contexts/AuthContext'
import SearchableSelect from '../components/SearchableSelect'
import { fmtSAR } from '../lib/amounts'
import DatePicker from '../components/DatePicker'

/* المطابقة — ترفع كشفين والسؤال واحد: فيه فرق؟ ووين؟
   لا تكتب في قيود ولا تطبع مستنداً توقّع عليه. تكشف فقط. */

function Drop({ label, hint, file, onPick, onClear }) {
  const ref = useRef(null)
  const [over, setOver] = useState(false)

  return (
    <div>
      <p className={field.label}>{label}</p>
      <input
        ref={ref} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onPick(e.target.files[0]); e.target.value = '' }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-50 px-4 py-3">
          <FileText className="w-4 h-4 text-primary-dark flex-shrink-0" strokeWidth={1.8} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-text truncate">{file.name}</p>
            <p className="text-[11px] text-text-muted">{(file.size / 1024).toFixed(0)} كيلو</p>
          </div>
          <button onClick={onClear} className="p-1 rounded-full text-text-muted hover:text-red-500 hover:bg-surface transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.[0]) onPick(e.dataTransfer.files[0]) }}
          className={`w-full rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
            over ? 'border-primary bg-primary-50' : 'border-border bg-surface hover:border-primary/40'
          }`}
        >
          <Upload className="w-5 h-5 text-text-muted mx-auto mb-2" strokeWidth={1.7} />
          <p className="text-[13px] font-semibold text-text">اسحب الملف أو اضغط</p>
          <p className="text-[11px] text-text-muted mt-0.5">{hint}</p>
        </button>
      )}
    </div>
  )
}

const Row = ({ r }) => (
  <tr className={ledger.row}>
    <td className={`${ledger.td} text-text-secondary whitespace-nowrap`}>{r.date || '—'}</td>
    <td className={`${ledger.td} font-mono text-[12px] text-text`}>{r.reference || '—'}</td>
    <td className={`${ledger.td} text-text-secondary`}>{r.description || '—'}</td>
    <td className={`${ledger.td} text-left font-semibold whitespace-nowrap ${r.amount < 0 ? 'text-text' : 'text-text'}`}>
      {fmtSAR(Math.abs(r.amount))}
      <span className="text-[10px] font-normal text-text-muted mr-1">{r.amount < 0 ? 'دائن' : 'مدين'}</span>
    </td>
  </tr>
)

function Bucket({ title, tone, rows, total, note }) {
  if (!rows.length) return null
  const tones = {
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${tones[tone]}`}>{title}</span>
        <span className="text-[12px] text-text-muted">{rows.length} حركة · {fmtSAR(Math.abs(total))} ر.س</span>
        <div className="flex-1 border-b border-border" />
      </div>
      {note && <p className="text-[12px] text-text-muted mb-2">{note}</p>}
      <div className={ledger.wrap}>
        <table className={ledger.table}>
          <thead>
            <tr className={ledger.headRow}>
              <th className={ledger.th}>التاريخ</th>
              <th className={ledger.th}>المرجع</th>
              <th className={ledger.th}>البيان</th>
              <th className={`${ledger.th} text-left`}>المبلغ</th>
            </tr>
          </thead>
          <tbody>{rows.map((r, i) => <Row key={i} r={r} />)}</tbody>
        </table>
      </div>
    </section>
  )
}

export default function Reconcile() {
  const [ours, setOurs] = useState(null)
  const [theirs, setTheirs] = useState(null)
  const [running, setRunning] = useState(false)
  const [res, setRes] = useState(null)
  const [vendors, setVendors] = useState([])
  const [vendorId, setVendorId] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [archived, setArchived] = useState(null)
  const toast = useToast()
  const { user } = useAuth()

  useEffect(() => {
    getVendors()
      .then(r => setVendors((r.vendors || []).filter(v => (v.status || 'Active') === 'Active')))
      .catch(() => {})
  }, [])

  const vendorName = vendors.find(v => v.id === vendorId)?.name || ''

  const run = async () => {
    setRunning(true); setRes(null); setArchived(null)
    try {
      const data = await reconcileStatements(ours, theirs)
      setRes(data)
      if (!data.success) return

      if (data.result.clean) toast.success('الكشفان متطابقان', { title: 'لا فروقات' })

      // الحفظ محاولة جانبية — لا يُسقط نتيجة ظهرت فعلاً
      try {
        const saved = await saveReconciliation({
          vendorName: vendorName || 'بدون مورد',
          from, to, ours, theirs,
          result: data.result,
          checkedBy: user?.username,
        })
        setArchived(saved.saved ? 'saved' : 'missing')
      } catch {
        setArchived('failed')
      }
    } catch (e) {
      const p = parseError(e)
      toast.error(p.message, { title: p.title || 'فشلت المطابقة' })
    } finally {
      setRunning(false)
    }
  }

  const reset = () => { setOurs(null); setTheirs(null); setRes(null); setArchived(null) }

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="المحاسبة"
        title="المطابقة"
        description="ارفع كشفك من قيود وكشف المورد لنفس الفترة — والجواب سطر واحد: فيه فرق، ووين."
        actions={res && <button onClick={reset} className={btn.ghost}><RotateCcw className="w-4 h-4" /> مطابقة جديدة</button>}
      />

      {!res && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div>
              <p className={field.label}>المورد</p>
              <SearchableSelect
                options={vendors.map(v => ({ id: v.id, label: v.name }))}
                value={vendorId}
                onChange={setVendorId}
                placeholder="-- اختر المورد --"
              />
            </div>
            <div>
              <p className={field.label}>من تاريخ</p>
              <DatePicker value={from} onChange={setFrom} placeholder="بداية الفترة" />
            </div>
            <div>
              <p className={field.label}>إلى تاريخ</p>
              <DatePicker value={to} onChange={setTo} placeholder="نهاية الفترة" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <Drop label="كشف الحساب من قيود" hint="تصدّره من قيود · PDF أو صورة"
              file={ours} onPick={setOurs} onClear={() => setOurs(null)} />
            <Drop label="كشف الحساب من المورد" hint="كما وصلك · PDF أو صورة"
              file={theirs} onPick={setTheirs} onClear={() => setTheirs(null)} />
          </div>
          <button onClick={run} disabled={!ours || !theirs || running} className={btn.primary}>
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> جارِ القراءة والمطابقة...</> : <><Scale className="w-4 h-4" strokeWidth={2} /> طابِق</>}
          </button>
          {running && (
            <p className="text-[12px] text-text-muted mt-3">
              تُقرأ الكشوف بالذكاء الاصطناعي ثم يُتحقّق من صحة القراءة بالرصيد المطبوع — قد تستغرق بضع ثوانٍ.
            </p>
          )}
          {!ours && !theirs && (
            <p className="text-[12px] text-text-muted mt-6 leading-relaxed max-w-xl">
              المطابقة <b className="text-text">تكشف ولا تقيّد</b> — لا تعدّل شيئاً في قيود، ولا تطبع مستنداً توقّع عليه.
              دورها أن تقول لك أين تنظر قبل أن تختم على كشف المورد.
            </p>
          )}
        </>
      )}

      {/* القراءة لم تتزن — نوقف قبل أن نضلّل */}
      {res && !res.success && res.stage === 'read' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <h3 className="text-[14px] font-bold text-amber-800 mb-1">القراءة لم تتزن — أوقفت المطابقة</h3>
              <p className="text-[13px] text-text-secondary mb-3">{res.error}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {['ours', 'theirs'].map((k) => {
                  const v = res.verify[k]
                  return (
                    <div key={k} className="rounded-xl bg-surface border border-border px-3.5 py-3">
                      <p className="text-[12px] font-bold text-text mb-1.5">{k === 'ours' ? 'كشف قيود' : 'كشف المورد'}</p>
                      <div className="text-[12px] text-text-secondary space-y-0.5">
                        <div>مجموع السطور: {fmtSAR(v.computed)}</div>
                        <div>الرصيد المطبوع: {fmtSAR(v.printed)}</div>
                        <div className={v.ok ? 'text-primary-dark font-semibold' : 'text-red-600 font-semibold'}>
                          {v.ok ? '✓ متزن' : `فرق ${fmtSAR(v.gap)}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[12px] text-text-muted mt-3">
                غالباً سطر لم يُقرأ أو رقم أُخطئ فيه. جرّب ملفاً أوضح — فالمطابقة على قراءة ناقصة تُنتج فروقاً لا وجود لها.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* النتيجة */}
      {res?.success && (() => {
        const r = res.result
        return (
          <>
            {archived === 'missing' && (
              <p className="text-[12px] text-text-muted mb-4">
                النتيجة لم تُحفظ في الأرشيف — الجدول لم يُنشأ بعد. شغّل
                <code className="mx-1 px-1.5 py-0.5 rounded bg-surface-light border border-border-light text-[11.5px]" dir="ltr">supabase/006_reconciliations.sql</code>
                لتفعيله.
              </p>
            )}
            {archived === 'saved' && (
              <p className="text-[12px] text-primary-dark mb-4">✓ حُفظت في الأرشيف بملفيها الأصليين</p>
            )}

            {r.clean ? (
              <div className="rounded-2xl border border-primary/25 bg-primary-50 px-5 py-6 mb-7">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-primary-dark flex-shrink-0" strokeWidth={1.8} />
                  <div>
                    <p className="text-[17px] font-bold text-primary-dark">مطابق — لا فروقات</p>
                    <p className="text-[13px] text-text-secondary mt-0.5">
                      {r.counts.matched} حركة مطابقة · رصيدك {fmtSAR(Math.abs(r.ourClosing))} · رصيده {fmtSAR(Math.abs(r.theirClosing))}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 mb-7">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 text-amber-700 flex-shrink-0" strokeWidth={1.8} />
                  <div>
                    <p className="text-[17px] font-bold text-amber-800">فرق {fmtSAR(Math.abs(r.closingGap))} ر.س</p>
                    <p className="text-[13px] text-text-secondary mt-0.5">
                      {r.counts.matched} مطابقة · {r.counts.onlyTheirs + r.counts.onlyOurs + r.counts.amountDiff} حركة تحتاج نظرك
                    </p>
                  </div>
                </div>
              </div>
            )}

            {res.openingGate && (
              <div className="rounded-xl bg-red-50 border-r-[3px] border-red-400 px-4 py-3 mb-6">
                <p className="text-[13px] font-bold text-red-700 mb-0.5">الرصيد الافتتاحي مختلف — {fmtSAR(Math.abs(r.openingGap))} ر.س</p>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  الخلل من فترة سابقة، لا من هذه. لا تبحث هنا — راجع الفترة التي قبلها أولاً، وإلا ضلّلتك كل مطابقة تحتها.
                </p>
              </div>
            )}

            <Bucket
              title="🔴 عنده وما هو عندك" tone="red"
              rows={r.onlyTheirs.rows} total={r.onlyTheirs.total}
              note="غالباً فواتير لم تصلك أو لم تُسجَّل — أهم سلة."
            />
            <Bucket
              title="🟡 عندك وما هو عنده" tone="amber"
              rows={r.onlyOurs.rows} total={r.onlyOurs.total}
              note="غالباً دفعة لم تصله، أو قيد مكرر عندك."
            />

            {r.amountDiff.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700">⚠️ نفس المرجع ومبلغ مختلف</span>
                  <span className="text-[12px] text-text-muted">{r.amountDiff.length} حركة</span>
                  <div className="flex-1 border-b border-border" />
                </div>
                <div className={ledger.wrap}>
                  <table className={ledger.table}>
                    <thead>
                      <tr className={ledger.headRow}>
                        <th className={ledger.th}>المرجع</th>
                        <th className={`${ledger.th} text-left`}>عندك</th>
                        <th className={`${ledger.th} text-left`}>عنده</th>
                        <th className={`${ledger.th} text-left`}>الفرق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.amountDiff.map((p, i) => (
                        <tr key={i} className={ledger.row}>
                          <td className={`${ledger.td} font-mono text-[12px] font-semibold text-text`}>{p.ours.reference || p.ours.description}</td>
                          <td className={`${ledger.td} text-left`}>{fmtSAR(Math.abs(p.ours.amount))}</td>
                          <td className={`${ledger.td} text-left`}>{fmtSAR(Math.abs(Array.isArray(p.theirs) ? p.theirs.reduce((s, x) => s + x.amount, 0) : p.theirs.amount))}</td>
                          <td className={`${ledger.td} text-left font-bold text-amber-700`}>{fmtSAR(Math.abs(p.diff))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-primary-50 text-primary-dark">✅ مطابق</span>
                <span className="text-[12px] text-text-muted">{r.counts.matched} حركة</span>
                <div className="flex-1 border-b border-border" />
              </div>
              <div className={ledger.wrap}>
                <table className={ledger.table}>
                  <thead>
                    <tr className={ledger.headRow}>
                      <th className={ledger.th}>التاريخ</th>
                      <th className={ledger.th}>المرجع</th>
                      <th className={`${ledger.th} text-left`}>المبلغ</th>
                      <th className={ledger.th}>طابَق بـ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.matched.map((p, i) => (
                      <tr key={i} className={ledger.row}>
                        <td className={`${ledger.td} text-text-secondary whitespace-nowrap`}>{p.ours.date}</td>
                        <td className={`${ledger.td} font-mono text-[12px] text-text`}>{p.ours.reference || '—'}</td>
                        <td className={`${ledger.td} text-left font-semibold text-text`}>{fmtSAR(Math.abs(p.ours.amount))}</td>
                        <td className={`${ledger.td} text-[11px] text-text-muted`}>
                          {{ reference: 'رقم المستند', 'amount+date': 'المبلغ والتاريخ', combination: 'تركيبة مجاميع' }[p.rule]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )
      })()}
    </div>
  )
}
