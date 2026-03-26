const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : '—'

const statusLabels = { pushed: 'معتمدة', scanned: 'مقروءة', matched: 'مطابقة', paid: 'مدفوعة', error: 'خطأ' }

function openPrintWindow(html, filename) {
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    win.document.title = filename
    win.print()
  }
}

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 15mm; }
  body {
    font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl;
    color: #1F2937;
    font-size: 12px;
    line-height: 1.6;
  }
  .header {
    background: #10B981;
    color: white;
    padding: 20px 25px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .header .logo { font-size: 18px; font-weight: 700; }
  .header .subtitle { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  .header .info { text-align: left; font-size: 10px; }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1F2937;
    margin: 18px 0 10px;
    padding-bottom: 6px;
    border-bottom: 2px solid #10B981;
    display: inline-block;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }
  th {
    background: #F3F4F6;
    font-weight: 600;
    font-size: 11px;
    color: #6B7280;
    padding: 10px 12px;
    text-align: right;
    border-bottom: 2px solid #E5E7EB;
  }
  td {
    padding: 9px 12px;
    font-size: 11px;
    border-bottom: 1px solid #F3F4F6;
  }
  tr:hover { background: #F9FAFB; }
  .num { text-align: left; font-variant-numeric: tabular-nums; direction: ltr; }
  .mono { font-family: monospace; font-size: 10px; color: #6B7280; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 600;
  }
  .badge-green { background: #ECFDF5; color: #059669; }
  .badge-blue { background: #EFF6FF; color: #2563EB; }
  .badge-amber { background: #FFFBEB; color: #D97706; }
  .badge-red { background: #FEF2F2; color: #DC2626; }
  .summary-box {
    background: #F8FAF9;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 15px 20px;
    margin-top: 15px;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 12px;
  }
  .summary-row .label { color: #6B7280; }
  .summary-row .value { font-weight: 600; }
  .total-row {
    background: #10B981;
    color: white;
    padding: 10px 20px;
    border-radius: 6px;
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 700;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: #F8FAF9;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 15px 20px;
  }
  .info-item .label { font-size: 10px; color: #6B7280; }
  .info-item .value { font-size: 12px; font-weight: 600; margin-top: 2px; }
  .footer {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #E5E7EB;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #9CA3AF;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

function statusBadge(status) {
  const colors = { pushed: 'green', scanned: 'blue', matched: 'amber', paid: 'green', error: 'red' }
  return `<span class="badge badge-${colors[status] || 'blue'}">${statusLabels[status] || status || '—'}</span>`
}

// Export: History log
export function exportHistoryPDF(invoices) {
  const totalAmount = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const totalVat = invoices.reduce((s, i) => s + Number(i.vat_amount || 0), 0)

  const rows = invoices.map((inv, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${inv.vendor_name || '—'}</td>
      <td class="mono">${inv.invoice_number || '—'}</td>
      <td class="num">${fmtDate(inv.invoice_date)}</td>
      <td class="num">${fmt(inv.total_amount)}</td>
      <td class="num">${fmt(inv.vat_amount)}</td>
      <td>${statusBadge(inv.status)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>${baseStyles} body { font-size: 11px; }</style>
  </head><body>
    <div class="header">
      <div>
        <div class="logo">رصد | RASAD</div>
        <div class="subtitle">قارئ الفواتير الذكي</div>
      </div>
      <div class="info">
        <div>تقرير سجل الفواتير</div>
        <div>${new Date().toLocaleDateString('en-CA')}</div>
        <div>${invoices.length} فاتورة</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="text-align:center;width:35px">#</th>
        <th>المورد</th>
        <th>رقم الفاتورة</th>
        <th class="num">التاريخ</th>
        <th class="num">المبلغ (ر.س)</th>
        <th class="num">الضريبة (ر.س)</th>
        <th>الحالة</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="summary-box">
      <div class="summary-row"><span class="label">المجموع قبل الضريبة</span><span class="value num">${fmt(totalAmount - totalVat)} ر.س</span></div>
      <div class="summary-row"><span class="label">ضريبة القيمة المضافة</span><span class="value num">${fmt(totalVat)} ر.س</span></div>
    </div>
    <div class="total-row"><span>الإجمالي شامل الضريبة</span><span class="num">${fmt(totalAmount)} ر.س</span></div>

    <div class="footer">
      <span>رصد | RASAD - قارئ الفواتير الذكي</span>
      <span>${new Date().toLocaleString('en-CA')}</span>
    </div>
  </body></html>`

  openPrintWindow(html, `سجل-الفواتير-${new Date().toISOString().split('T')[0]}`)
}

// Export: Single invoice detail
export function exportInvoiceDetailPDF(invoice) {
  const items = invoice.extracted_data?.items || invoice.matched_data?.items || []
  const totalAmount = Number(invoice.total_amount || 0)
  const vatAmount = Number(invoice.vat_amount || 0)

  const itemRows = items.map((item, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${item.description || '—'}</td>
      <td class="num">${item.quantity || 0}</td>
      <td class="num">${fmt(item.unit_price)}</td>
      <td class="num">${fmt(item.total || (item.quantity * item.unit_price))}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>${baseStyles}</style>
  </head><body>
    <div class="header">
      <div>
        <div class="logo">رصد | RASAD</div>
        <div class="subtitle">قارئ الفواتير الذكي</div>
      </div>
      <div class="info">
        <div>تفاصيل فاتورة</div>
        <div>${invoice.invoice_number || '—'}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item"><div class="label">المورد</div><div class="value">${invoice.vendor_name || '—'}</div></div>
      <div class="info-item"><div class="label">رقم الفاتورة</div><div class="value">${invoice.invoice_number || '—'}</div></div>
      <div class="info-item"><div class="label">التاريخ</div><div class="value num">${fmtDate(invoice.invoice_date)}</div></div>
      <div class="info-item"><div class="label">الحالة</div><div class="value">${statusBadge(invoice.status)}</div></div>
      ${invoice.qoyod_bill_id ? `<div class="info-item"><div class="label">رقم فاتورة قيود</div><div class="value num">${invoice.qoyod_bill_id}</div></div>` : ''}
    </div>

    ${items.length > 0 ? `
      <div class="section-title">البنود</div>
      <table>
        <thead><tr>
          <th style="text-align:center;width:35px">#</th>
          <th>الوصف</th>
          <th class="num">الكمية</th>
          <th class="num">سعر الوحدة</th>
          <th class="num">الإجمالي</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    ` : ''}

    <div class="summary-box">
      <div class="summary-row"><span class="label">المجموع قبل الضريبة</span><span class="value num">${fmt(totalAmount - vatAmount)} ر.س</span></div>
      <div class="summary-row"><span class="label">ضريبة القيمة المضافة (15%)</span><span class="value num">${fmt(vatAmount)} ر.س</span></div>
    </div>
    <div class="total-row"><span>الإجمالي شامل الضريبة</span><span class="num">${fmt(totalAmount)} ر.س</span></div>

    <div class="footer">
      <span>رصد | RASAD - قارئ الفواتير الذكي</span>
      <span>${new Date().toLocaleString('en-CA')}</span>
    </div>
  </body></html>`

  openPrintWindow(html, `فاتورة-${invoice.invoice_number || invoice.id || 'detail'}`)
}
