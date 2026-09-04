import { Search, Package, Loader2 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { getProducts } from '../lib/api'
import { PageHeader, EmptyState, ledger } from '../components/ui'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.products || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.trim().toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) || p.sku?.includes(q) || p.barcode?.includes(q)
    )
  }, [products, search])

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="البيانات"
        title="البنود"
        description={`${products.length} بند مسجّل في قيود — تُستخدم في مطابقة الفواتير.`}
      >
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرمز..."
            className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <>
          {/* Desktop — ledger table */}
          <div className={`hidden sm:block ${ledger.wrap}`}>
            <table className={ledger.table}>
              <thead>
                <tr className={ledger.headRow}>
                  <th className={`${ledger.th} w-8`}>#</th>
                  <th className={ledger.th}>الاسم</th>
                  <th className={ledger.th}>الرمز</th>
                  <th className={`${ledger.th} text-left`}>سعر الشراء</th>
                  <th className={ledger.th}>الوحدة</th>
                  <th className={ledger.th}>النوع</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={ledger.row}>
                    <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                    <td className={`${ledger.td} font-semibold text-text`}>{p.name}</td>
                    <td className={`${ledger.td} text-text-muted font-mono text-[12px]`}>{p.sku || '—'}</td>
                    <td className={`${ledger.td} text-left text-text whitespace-nowrap`}>
                      {p.buying_price} <span className="text-[10px] text-text-muted">ر.س</span>
                    </td>
                    <td className={`${ledger.td} text-text-secondary`}>{p.unit || '—'}</td>
                    <td className={ledger.td}>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-surface-lighter text-text-secondary">
                        {p.type === 'Product' ? 'منتج' : 'خدمة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden border-t-2 border-text">
            {filtered.map((p) => (
              <div key={p.id} className="py-3.5 border-b border-border-light">
                <p className="text-[13px] font-semibold text-text">{p.name}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                  {p.sku && <span className="font-mono">{p.sku}</span>}
                  <span>{p.buying_price} ر.س</span>
                  {p.unit && <span>{p.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={Package} title="لا توجد نتائج" hint={search ? 'جرّب كلمة بحث أخرى' : undefined} />
      )}
    </div>
  )
}
