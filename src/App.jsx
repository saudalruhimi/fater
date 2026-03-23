import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UploadInvoice from './pages/UploadInvoice'
import Dictionary from './pages/Dictionary'
import Vendors from './pages/Vendors'
import Products from './pages/Products'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import HistoryLog from './pages/HistoryLog'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadInvoice />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/products" element={<Products />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/history" element={<HistoryLog />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
