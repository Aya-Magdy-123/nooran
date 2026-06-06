// src/pages/admin/AdminSessions.jsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, Star, Filter } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmDialog, Badge, PageHeader, EmptyState } from '../../components/ui'
import { STATUS_LABELS } from '../../data/mockData'

const TYPE_OPTS = [
  { value: 'all',     label: 'الكل' },
  { value: 'regular', label: 'عادي' },
  { value: 'trial',   label: 'تجريبي' },
  { value: 'makeup',  label: 'تعويض' },
]

const STATUS_OPTS = [
  { value: 'all',       label: 'الكل' },
  { value: 'scheduled', label: 'مجدول' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'noshow',    label: 'غياب' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
]

const DAYS_SHORT = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت']

const EMPTY_FORM = {
  type: 'regular', status: 'scheduled', notes: '',
  halaqaId: '', date: '', time: '', name: '',
  studentId: '', teacherId: '',
  makeupDate: '', makeupTime: '',
  dates: [{ makeupDate: '', makeupTime: '' }],
}

export default function AdminSessions() {
  const { sessions, students, teachers, supervisors, halaqas, addSession, updateSession, deleteSession } = useApp()
  const [search, setSearch]           = useState('')
  const [typeF, setTypeF]             = useState('all')
  const [statusF, setStatusF]         = useState('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [modalOpen, setModal]         = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [lastAssigned, setLastAssigned] = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [counts, setCounts]           = useState([0])

  const filtered = sessions.filter(s => {
    const student      = students.find(st => st.id === s.studentId)
    const halaqa       = (halaqas || []).find(h => h.id === s.halaqaId)
    const matchSearch  = !search ||
      student?.name.includes(search) ||
      student?.halaqaNo.includes(search) ||
      halaqa?.name.includes(search)
    const matchType    = typeF    === 'all' || s.type   === typeF
    const matchStatus  = statusF  === 'all' || s.status === statusF
    const matchFlagged = !flaggedOnly || s.flagged
    return matchSearch && matchType && matchStatus && matchFlagged
  })

  const openAdd = () => {
    setEditItem(null)
    setLastAssigned(null)
    setForm(EMPTY_FORM)
    setCounts([0])
    setModal(true)
  }

  const openEdit = s => {
    setEditItem(s)
    setLastAssigned(null)
    setForm({
      type: s.type, status: s.status, notes: s.notes || '',
      halaqaId: String(s.halaqaId || ''), date: s.date, time: s.time, name: s.name || '',
      studentId: String(s.studentId || ''), teacherId: String(s.teacherId || ''),
      makeupDate: s.date, makeupTime: s.time,
      dates: [{ makeupDate: s.date, makeupTime: s.time }],
    })
    setCounts([0])
    setModal(true)
  }

  const save = () => {
    let payload
    if (form.type === 'makeup') {
      payload = {
        type: form.type, status: form.status, notes: form.notes,
        studentId: Number(form.studentId), teacherId: Number(form.teacherId),
        halaqaId: null,
        date: form.makeupDate, time: form.makeupTime,
      }
    } else {
      const h = (halaqas || []).find(h => h.id === Number(form.halaqaId))
      payload = {
        type: form.type, status: form.status, notes: form.notes,
        halaqaId: Number(form.halaqaId), teacherId: h?.teacherId || null,
        studentId: null,
        date: form.dates[0]?.makeupDate || form.date,
        time: form.dates[0]?.makeupTime || form.time,
        name: form.name,
      }
    }
    if (editItem) {
      updateSession({ ...editItem, ...payload })
    } else {
      const assigned = addSession(payload)
      setLastAssigned(assigned)
    }
    setModal(false)
  }

  const toggleFlag = s => updateSession({ ...s, flagged: !s.flagged })

  const selectedHalaqa = (halaqas || []).find(h => h.id === Number(form.halaqaId))

  return (
    <div dir="rtl" className="space-y-8 font-sans">
      <PageHeader
        title="إدارة الحصص"
        subtitle="عرض وإضافة وتعديل جميع حصص الأكاديمية"
      />

      {lastAssigned && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-xl">
          ✅ تم إضافة الحصة وتوزيعها تلقائياً على: <strong>{lastAssigned.name}</strong>
        </div>
      )}

      {/* Search + Add */}
      <div className="w-full flex items-center gap-6">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم الطالب أو رقم الحلقة..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700 text-base"
          />
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18} strokeWidth={2}/> إضافة حصة
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 flex items-center gap-1"><Filter size={14}/> النوع:</span>
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
            {TYPE_OPTS.map(opt => (
              <button key={opt.value} onClick={() => setTypeF(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${typeF === opt.value ? 'bg-white text-teal-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-teal-600'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">الحالة:</span>
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
            {STATUS_OPTS.map(opt => (
              <button key={opt.value} onClick={() => setStatusF(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusF === opt.value ? 'bg-white text-teal-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-teal-600'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setFlaggedOnly(p => !p)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium border transition-all ${flaggedOnly ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-500 border-transparent hover:text-amber-500'}`}>
          <Star size={14} className={flaggedOnly ? 'fill-amber-400 text-amber-400' : ''}/> المميزة فقط
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {['التاريخ والوقت', 'الطالب / الحلقة', 'المعلم', 'النوع', 'الحالة', 'المشرف', 'الإجراءات'].map(h => (
                  <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
              {filtered.map(s => {
                const student    = students.find(st => st.id === s.studentId)
                const teacher    = teachers.find(t  => t.id  === s.teacherId)
                const halaqa     = (halaqas || []).find(h => h.id === s.halaqaId)
                const supervisor = supervisors.find(sv => sv.id === s.supervisorId)
                return (
                  <tr key={s.id} className={`group transition-colors ${s.flagged ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-800">{s.time}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.date}</div>
                    </td>
                    <td className="px-5 py-4">
                      {halaqa ? (
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{halaqa.name}</div>
                          <div className="text-xs text-gray-400">{halaqa.days?.map(d => DAYS_SHORT[d]).join('، ')}</div>
                        </div>
                      ) : student ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                            {student.name?.[0] || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{student.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{student.halaqaNo}</div>
                          </div>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{teacher?.name?.replace('الشيخ ', '') || '—'}</td>
                    <td className="px-5 py-4"><Badge status={s.type} /></td>
                    <td className="px-5 py-4"><Badge status={s.status} /></td>
                    <td className="px-5 py-4">
                      {supervisor
                        ? <span className="text-sm font-medium text-teal-600">{supervisor.name}</span>
                        : <span className="text-sm text-gray-300">غير محدد</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleFlag(s)}
                          className={`p-2 rounded-xl transition-all ${s.flagged ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-400 hover:bg-amber-50'}`}>
                          <Star size={16} className={s.flagged ? 'fill-amber-400' : ''}/>
                        </button>
                        <button onClick={() => openEdit(s)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                        <button onClick={() => setConfirm({ id: s.id })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <Modal
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                {editItem ? <Pencil size={20}/> : <Plus size={20}/>}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {editItem ? 'تعديل الحصة' : 'إضافة حصة جديدة'}
              </span>
            </div>
          }
          onClose={() => setModal(false)}
          wide
        >
          <div className="flex flex-col gap-5 p-1">

            {/* نوع الحصة */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">نوع الحصة</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'regular', label: 'عادي',   desc: 'حلقة منتظمة',      color: 'bg-blue-400' },
                  { value: 'trial',   label: 'تجريبي', desc: 'حلقة تجريبية',     color: 'bg-amber-400' },
                  { value: 'makeup',  label: 'تعويض',  desc: 'حصة لطالب بعينه', color: 'bg-purple-400' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(p => ({ ...p, type: opt.value }))}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${form.type === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
                    <div className={`text-sm font-bold ${form.type === opt.value ? 'text-teal-700' : 'text-slate-600'}`}>{opt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── تجريبي ── */}
            {form.type === 'trial' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم الحلقة <span className="text-red-400">*</span></label>
                  <input type="text"
                    className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">تاريخ الحصة <span className="text-red-400">*</span></label>
                    <input type="date"
                      className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                      value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">وقت الحصة <span className="text-red-400">*</span></label>
                    <input type="time"
                      className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                      value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {/* ── عادي ── */}
            {form.type === 'regular' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم الحلقة <span className="text-red-400">*</span></label>
                  <input type="text"
                    className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-3">
                  {counts.map((c) => (
                    <div key={c} className="grid grid-cols-2 items-end gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">تاريخ <span className="text-red-400">*</span></label>
                        <input type="date"
                          className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                          value={form.dates[c]?.makeupDate}
                          onChange={e => setForm(p => {
                            const dates = [...(p.dates || [])]
                            dates[c] = { ...dates[c], makeupDate: e.target.value }
                            return { ...p, dates }
                          })} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">وقت <span className="text-red-400">*</span></label>
                        <input type="time"
                          className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                          value={form.dates[c]?.makeupTime}
                          onChange={e => setForm(p => {
                            const dates = [...(p.dates || [])]
                            dates[c] = { ...dates[c], makeupTime: e.target.value }
                            return { ...p, dates }
                          })} />
                      </div>
                    </div>
                  ))}
                  <button type="button"
                    className="flex items-center justify-center gap-2 border-[1.5px] border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                    onClick={() => setCounts(p => [...p, counts.length])}>
                    <Plus size={15}/> إضافة موعد آخر
                  </button>
                </div>
              </>
            )}

            {/* ── تعويض ── */}
            {form.type === 'makeup' && (
              <>
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-xs text-purple-700">
                  💡 حصة التعويض تُسند لطالب بعينه — اختر المعلم والطالب وحدد الموعد يدوياً
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">المعلم <span className="text-red-400">*</span></label>
                    <select
                      className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                      value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value, studentId: '' }))}>
                      <option value="">اختر معلماً...</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">الطالب <span className="text-red-400">*</span></label>
                    <select
                      className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                      value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))}>
                      <option value="">اختر طالباً...</option>
                      {(form.teacherId
                        ? students.filter(s => s.teacherId === Number(form.teacherId))
                        : students
                      ).map(s => <option key={s.id} value={s.id}>{s.name} ({s.halaqaNo})</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">تاريخ التعويض <span className="text-red-400">*</span></label>
                    <input type="date"
                      className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                      value={form.makeupDate} onChange={e => setForm(p => ({ ...p, makeupDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">وقت التعويض <span className="text-red-400">*</span></label>
                    <input type="time"
                      className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                      value={form.makeupTime} onChange={e => setForm(p => ({ ...p, makeupTime: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            {/* الحالة */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">الحالة</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 'scheduled', label: 'مجدول', color: 'bg-slate-400' },
                  { value: 'confirmed', label: 'مؤكد',  color: 'bg-blue-400' },
                  { value: 'completed', label: 'مكتمل', color: 'bg-emerald-500' },
                  { value: 'noshow',    label: 'غياب',  color: 'bg-orange-400' },
                  { value: 'cancelled', label: 'ملغي',  color: 'bg-red-400' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                    className={`border-[1.5px] rounded-xl py-2.5 text-center transition-all ${form.status === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
                    <span className={`text-xs font-semibold ${form.status === opt.value ? 'text-teal-700' : 'text-slate-500'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ملاحظات */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">ملاحظات</label>
              <textarea rows={2} placeholder="أي ملاحظات إضافية..."
                className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all resize-none"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm"
                onClick={() => setModal(false)}>إلغاء</button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-sm transition-all text-sm font-medium"
                onClick={save}>
                {editItem ? '✓ حفظ التعديل' : <><Plus size={16}/> إضافة</>}
              </button>
            </div>

          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message="هل تريد حذف هذه الحصة؟"
          danger
          onConfirm={() => { deleteSession(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}