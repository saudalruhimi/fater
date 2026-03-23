import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

export default function SearchableSelect({ options, value, onChange, placeholder = 'اختر...', error = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((o) => o.id === value)

  const filtered = query.trim()
    ? options.filter((o) => o.label.includes(query))
    : options

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery('') }}
        className={`w-full flex items-center justify-between border rounded-xl py-2 px-3 text-[13px] text-right focus:outline-none transition-colors ${
          error ? 'bg-red-50 border-red-200 text-red-600' :
          open ? 'bg-white border-primary/50 ring-1 ring-primary/10' : 'bg-white border-border-light text-text'
        }`}
      >
        <span className={selected ? 'text-text' : 'text-text-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selected && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false) }}
              className="p-0.5 rounded hover:bg-surface-lighter text-text-muted hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-light rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border-light">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث..."
                className="w-full bg-surface-light rounded-lg py-1.5 pr-8 pl-2.5 text-[12px] text-text placeholder-text-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); setQuery('') }}
                className={`w-full text-right px-3 py-2 text-[13px] hover:bg-primary-50/50 transition-colors ${
                  o.id === value ? 'bg-primary-50 text-primary-dark font-medium' : 'text-text'
                }`}
              >
                {o.label}
              </button>
            )) : (
              <p className="px-3 py-4 text-center text-[12px] text-text-muted">لا توجد نتائج</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
