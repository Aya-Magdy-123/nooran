// src/components/ui/index.jsx
import { X, AlertTriangle } from 'lucide-react'

// ← أضف ده فوق، قبل أي export function
const STATUS_BADGE = {
  active:    'badge bg-emerald-50 text-emerald-700 border border-emerald-200',
  trial:     'badge bg-amber-50 text-amber-700 border border-amber-200',
  paused:    'badge bg-orange-50 text-orange-700 border border-orange-200',
  cancelled: 'badge bg-red-50 text-red-600 border border-red-200',
  pending:   'badge bg-blue-50 text-blue-700 border border-blue-200',
  resolved:  'badge bg-green-50 text-green-700 border border-green-200',
  confirmed: 'badge bg-green-50 text-green-700 border border-green-200',
  no_show:   'badge bg-red-50 text-red-600 border border-red-200',
  postponed: 'badge bg-amber-50 text-amber-700 border border-amber-200',
}

const STATUS_LABELS = {
  active:    'نشط',
  trial:     'تجريبي',
  paused:    'متوقف',
  cancelled: 'ملغي',
  pending:   'قيد الانتظار',
  resolved:  'تم الحل',
  confirmed: 'مؤكد',
  no_show:   'غياب',
  postponed: 'طلب تأجيل',
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" >
      <div className={`modal-box ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="modal-header">
          <h3 className="text-base font-semibold text-brand-dark">{title}</h3>
          <button onClick={onClose} className="btn-ghost"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel, danger }) {
  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-2 rounded-xl ${danger ? 'bg-red-50' : 'bg-green-50'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-green-600'} />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mt-0.5">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">إلغاء</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-success'}>تأكيد</button>
        </div>
      </div>
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ status }) {
  return (
    <span className={STATUS_BADGE[status] || 'badge bg-gray-100 text-gray-600'}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ message = 'لا توجد بيانات' }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm">{message}</div>
  )
}

// ── Search + Filter bar ─────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'بحث...' }) {
  return (
    <div className="relative">
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pr-9 "
      />
    </div>
  )
}

// ── Chips filter ────────────────────────────────────────────────────────────
export function FilterChips({ options, active, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={active === o.value ? 'chip-active' : 'chip-inactive'}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ message }) {
  if (!message) return null
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-sm
                    px-5 py-2.5 rounded-full shadow-lg z-50 animate-bounce">
      {message}
    </div>
  )
}

// ── Page Header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-brand-dark">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  )
}

// ── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'text-brand-primary', sub }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        {Icon && <Icon size={16} className="text-gray-300" />}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}
