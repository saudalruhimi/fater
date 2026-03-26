import { Search, Package, Loader2 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { getProducts } from '../lib/api'

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
    <div className="max-w-5xl animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">البنود</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">{products.length} بند مسجّل في قيود</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الرمز..."
          className="w-full bg-white border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light text-[12px] text-text-muted">
                  <th className="text-right font-medium px-5 py-3">الاسم</th>
                  <th className="text-right font-medium px-5 py-3">الرمز</th>
                  <th className="text-right font-medium px-5 py-3">سعر الشراء</th>
                  <th className="text-right font-medium px-5 py-3">الوحدة</th>
                  <th className="text-right font-medium px-5 py-3">النوع</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-primary-50/20 transition-colors ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                    <td className="px-5 py-3 text-[13px] font-medium text-text">{p.name}</td>
                    <td className="px-5 py-3 text-[13px] text-text-muted font-mono">{p.sku || '—'}</td>
                    <td className="px-5 py-3 text-[13px] text-text">{p.buying_price} ر.س</td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{p.unit || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-surface-lighter text-text-secondary">
                        {p.type === 'Product' ? 'منتج' : 'خدمة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border-light/60">
            {filtered.map((p) => (
              <div key={p.id} className="p-4">
                <p className="text-[13px] font-semibold text-text">{p.name}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                  {p.sku && <span className="font-mono">{p.sku}</span>}
                  <span>{p.buying_price} ر.س</span>
                  {p.unit && <span>{p.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center">
          <Package className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">لا توجد نتائج</p>
        </div>
      )}
    </div>
  )
}
