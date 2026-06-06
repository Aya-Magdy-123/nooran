// src/pages/supervisor/SupervisorStudents.jsx
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Badge, PageHeader, EmptyState } from '../../components/ui'
import { BookOpen, Clock, Filter } from 'lucide-react'

const DAYS_SHORT = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']

const STATUS_FILTER_OPTS = [
  { value: 'all',       label: 'الكل' },
  { value: 'active',    label: 'نشط' },
  { value: 'trial',     label: 'تجريبي' },
  { value: 'onhold',    label: 'موقوف' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function SupervisorStudents() {
  const { students, teachers, halaqas } = useApp()
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')

  const filtered = students.filter(s => {
    const matchSearch = s.name.includes(search) || s.halaqaNo.includes(search) || s.phone.includes(search)
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div dir="rtl" className="space-y-8 font-sans">
      <PageHeader
        title="طلابي"
        subtitle={`${students.length} طالب ضمن حلقاتك`}
      />

      {/* Search + Filters */}
      <div className="w-full flex flex-col gap-4">
        <div className="relative w-full">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم أو رقم حلقة..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700 text-base"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
            <Filter size={14}/> الحالة:
          </span>
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
            {STATUS_FILTER_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === opt.value
                    ? 'bg-white text-teal-700 shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-teal-600'
                }`}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الطالب', 'رقم الحلقة', 'الحلقة', 'المعلم', 'الهاتف', 'الحالة'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-16 text-center"><EmptyState message="لا يوجد طلاب مطابقون" /></td></tr>
            )}
            {filtered.map(s => {
              const teacher = teachers.find(t => t.id === s.teacherId)
              const halaqa  = halaqas.find(h => h.id === s.halaqaId)
              return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                        {s.name[0]}
                      </div>
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{s.halaqaNo}</td>
                  <td className="px-5 py-4">
                    {halaqa ? (
                      <div>
                        <div className="text-sm font-medium text-gray-800 flex items-center gap-1">
                          <BookOpen size={11} className="text-teal-500"/> {halaqa.name}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10}/> {halaqa.days.map(d => DAYS_SHORT[d]).join('، ')} — {halaqa.time}
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{teacher?.name?.replace('الشيخ ', '') || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.phone}</td>
                  <td className="px-5 py-4"><Badge status={s.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}