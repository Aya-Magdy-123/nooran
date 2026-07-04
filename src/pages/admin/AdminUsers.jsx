// src/pages/admin/AdminUsers.jsx
import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, Trash2, UserX, UserCheck, BookOpen, Filter, Users, GraduationCap, UserCog } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmDialog, Badge, PageHeader, EmptyState } from '../../components/ui'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import StudentSessionForm from '../../components/ui/StudentSessionForm'

const inputClass = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

// ─── Supervisors Tab ──────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, '0') }

function lastDayOfMonth(yyyy, mm) {
  return new Date(yyyy, mm, 0).getDate() // new Date(year, month, 0) بيرجع آخر يوم في الشهر السابق لـ month
}

function nextDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function cairoTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

function SupervisorsTab() {
  const { supervisors, addSupervisor, updateSupervisor, deleteSupervisor, toggleAbsent, restoreSupervisor } = useApp()

  const [search,        setSearch]        = useState('')
  const [modalOpen,     setModal]         = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [confirm,       setConfirm]       = useState(null)
  const [attendConfirm, setAttendConfirm] = useState(null)
  const [filterShift,   setFilterShift]   = useState('all')
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [saveLoading,   setSaveLoading]   = useState(false)
  const [saveError,     setSaveError]     = useState('')
  const [restock,       setRestock]       = useState(null)
  const [isLoading,     setIsLoading]     = useState(false)
  const [absentFrom,    setAbsentFrom]    = useState('')   // ← بداية الإجازة
  const [absentUntil,   setAbsentUntil]   = useState('')   // ← نهاية الإجازة
  const [dateError,     setDateError]     = useState('')   // ← لما "إلى" قبل "من"

  const [form, setForm] = useState({
    name: '', email: '', phone: '', shift: 'morning', status: 'active'
  })

  const role    = localStorage.getItem("role")
  const isAdmin = role === 'admin'

  // ← المشرفين النشطين (غير المحذوفين) فقط بيدخلوا الفلترة والجدول الأساسي
  const activeSupervisors = supervisors.filter(s => !s.isDeleted)

  // ← المشرفين المحذوفين بيتفصلوا في قايمة منفصلة عشان يتعرضوا في قسمهم الخاص
  const deletedSupervisors = supervisors.filter(s => s.isDeleted)

  const filtered = activeSupervisors.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search?.toLowerCase()) || (s.phone || '').includes(search)
    const matchShift  = filterShift  === 'all' || s.shift  === filterShift
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchShift && matchStatus
  })

  const shiftLabel = (shift) => {
    if (shift === 'morning')   return '🌅 4ص - 12ظ'
    if (shift === 'afternoon') return '🌞 12ظ - 8م'
    if (shift === 'evening')   return '🌙 8م - 4ص'
    return shift
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', email: '', phone: '', shift: 'morning', status: 'active' })
    setSaveError('')
    setModal(true)
  }

  const openEdit = (s) => {
    setEditItem(s)
    setForm({ name: s.name, email: s.email || '', phone: s.phone, shift: s.shift, status: s.status })
    setSaveError('')
    setModal(true)
  }

  const save = async () => {
    setSaveError('')
    if (!form.name?.trim()) return setSaveError('الاسم مطلوب')
    if (!editItem) {
      if (!form.email?.trim())       return setSaveError('البريد الإلكتروني مطلوب')
      if (!form.email.includes('@')) return setSaveError('بريد إلكتروني غير صحيح')
    }
    try {
      setSaveLoading(true)
      if (editItem) await updateSupervisor({ ...editItem, ...form })
      else          await addSupervisor(form)
      setModal(false)
    } catch (err) {
      if      (err.code === 'auth/email-already-in-use') setSaveError('البريد مستخدم بالفعل')
      else if (err.code === 'auth/invalid-email')        setSaveError('بريد إلكتروني غير صحيح')
      else setSaveError('حدث خطأ: ' + err.message)
    } finally {
      setSaveLoading(false)
    }
  }

  // ── تاريخ اليوم بصيغة YYYY-MM-DD بتوقيت القاهرة (لا UTC) لحد أدنى لـ input date ──
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في المشرفين..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"/>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Filter size={13}/> الشيفت:</span>
          <select value={filterShift} onChange={e => setFilterShift(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm min-w-[140px]">
            <option value="all">كل الشيفتات</option>
            <option value="morning">🌅 4ص - 12ظ</option>
            <option value="afternoon">🌞 12ظ - 8م</option>
            <option value="evening">🌙 8م - 4ص</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">الحالة:</span>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm min-w-[120px]">
            <option value="all">الكل</option>
            <option value="active">حاضر</option>
            <option value="absent">غائب</option>
          </select>
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
            <Plus size={18}/> إضافة مشرف
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الاسم','الهاتف','الشيفت','الحالة', isAdmin ? 'إجراء' : ''].map(h => (
                <th key={h} className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-16 text-center"><EmptyState/></td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                      s.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-500'
                    }`}>{s.name.charAt(0)}</div>
                    <div>
                      <span className="font-medium text-gray-800">{s.name}</span>
                      {/* ← بيظهر فترة الإجازة (من - إلى) تحت الاسم لو موجودة */}
                      {(s.absentFrom || s.absentUntil) && (
                        <p className="text-xs text-red-400 mt-0.5">
                          {s.status === 'absent' ? 'غائب' : 'إجازة مُجدولة'}
                          {s.absentFrom ? ` من ${s.absentFrom}` : ''}
                          {s.absentUntil ? ` حتى ${s.absentUntil} (آخر يوم)` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.phone}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{shiftLabel(s.shift)}</td>
                <td className="px-5 py-4"><Badge status={s.status}/></td>
                <td className="px-5 py-4">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                      <button onClick={() => setConfirm({ id: s.id, shift: s.shift, name: s.name })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                      <button onClick={() => setAttendConfirm({ supervisor: s })}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                          s.status === 'absent'
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        }`}>
                        {s.status === 'absent' ? <><UserCheck size={13}/> حاضر</> : <><UserX size={13}/> غائب</>}
                      </button>
                    </div>
                  ) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ← قسم منفصل للمشرفين المحذوفين، بيظهر بس لو فيه مشرفين محذوفين */}
      {deletedSupervisors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <h3 className="text-sm font-bold text-gray-600">المشرفين المحذوفين</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {['الاسم','الهاتف','الشيفت', isAdmin ? 'إجراء' : ''].map(h => (
                  <th key={h} className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deletedSupervisors.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-500">
                        {s.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-500">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400 font-mono">{s.phone}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{shiftLabel(s.shift)}</td>
                  <td className="px-5 py-4">
                    {isAdmin && (
                      <button onClick={() => setRestock({ id: s.id, name: s.name, shift: s.shift })}
                        className="flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-all">
                        استعادة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div>
              <span className="text-xl font-bold text-gray-800">{editItem ? 'تعديل المشرف' : 'إضافة مشرف جديد'}</span>
            </div>
          }
          onClose={() => setModal(false)} wide>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم الكامل <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="أدخل الاسم..."
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  البريد الإلكتروني {!editItem && <span className="text-red-400">*</span>}
                </label>
                <input className={inputClass} placeholder="example@email.com" type="email"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  disabled={!!editItem} style={editItem ? { opacity: 0.6, cursor: 'not-allowed' } : {}}/>
                {editItem && <p className="text-xs text-slate-400 mt-1">لا يمكن تغيير البريد الإلكتروني</p>}
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف</label>
                <PhoneInput country={'eg'} value={form.phone}
                  onChange={phone => setForm(p => ({ ...p, phone }))}
                  inputClass="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الشيفت</label>
                <select className={inputClass} value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}>
                  <option value="morning">🌅 4ص الي 12ظهرا</option>
                  <option value="afternoon">🌞 12 ظهرا الي 8 مساء</option>
                  <option value="evening">🌙 8 مساء الي 4 ص</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">الحالة</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'active', label: 'حاضر', color: 'bg-emerald-500' },
                  { value: 'absent', label: 'غائب', color: 'bg-red-400' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                    className={`border-[1.5px] rounded-xl py-3 text-center transition-all ${
                      form.status === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
                    <span className={`text-xs font-semibold ${form.status === opt.value ? 'text-teal-700' : 'text-slate-500'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">⚠️ {saveError}</p>
            )}
            <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-slate-100">
              <button onClick={() => setModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm">إلغاء</button>
              <button onClick={save} disabled={saveLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {saveLoading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري الحفظ...</>
                  : editItem ? '✓ حفظ التعديل' : <><Plus size={15}/> إضافة</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {attendConfirm && (
        <ConfirmDialog
          message={
            attendConfirm.supervisor.status === 'absent'
              ? `هل تريد تسجيل "${attendConfirm.supervisor.name}" حاضراً؟`
              : `هل تريد تسجيل إجازة لـ "${attendConfirm.supervisor.name}"؟`
          }
          confirmText={attendConfirm.supervisor.status === 'absent' ? 'تسجيل حاضر' : 'تسجيل الإجازة'}
          danger={attendConfirm.supervisor.status !== 'absent'}
          // ← اتنين date inputs (من - إلى) بيظهروا بس لما بيتسجل غياب جديد
          extraContent={attendConfirm.supervisor.status !== 'absent' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">من تاريخ</label>
                  <input
                    type="date"
                    value={absentFrom}
                    min={todayStr}
                    onChange={e => { setAbsentFrom(e.target.value); setDateError('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  إلى تاريخ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={absentUntil}
                    min={absentFrom || todayStr}
                    onChange={e => { setAbsentUntil(e.target.value); setDateError('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"
                  />
                </div>
              </div>
              {dateError && (
                <p className="text-xs text-red-500">⚠️ {dateError}</p>
              )}
              {absentFrom && absentUntil && !dateError && (
                <p className="text-xs text-teal-600">
                  {absentFrom <= todayStr
                    ? `✓ سيُسجَّل غائباً فوراً حتى يوم ${absentUntil} (آخر يوم إجازة)، ويعود حاضراً يوم ${nextDayStr(absentUntil)}`
                    : `✓ ستبدأ إجازته يوم ${absentFrom} وحتى ${absentUntil} (آخر يوم إجازة)، ويعود حاضراً يوم ${nextDayStr(absentUntil)}`}
                </p>
              )}
            </div>
          ) : null}
        onConfirm={async () => {
  if (attendConfirm.supervisor.status !== 'absent') {
    // ← "إلى تاريخ" بقى إلزامي: من غيره مش هينعرف نوزّع حصصه على باقي
    //   المشرفين في أيام غيابه، وهيفضل غائب من غير حد يتابع الطلاب بدالًا عنه
    if (!absentUntil) {
      setDateError('لازم تحدد "إلى تاريخ" عشان نقدر نوزّع حصصه على باقي المشرفين')
      return
    }
    if (absentFrom && absentUntil < absentFrom) {
      setDateError('تاريخ النهاية لازم يكون بعد تاريخ البداية')
      return
    }
  }
  await toggleAbsent(attendConfirm.supervisor.id, absentFrom || null, absentUntil || null)
  setAbsentFrom('')
  setAbsentUntil('')
  setDateError('')
  setAttendConfirm(null)
}}
          onCancel={() => {
            setAbsentFrom('')
            setAbsentUntil('')
            setDateError('')
            setAttendConfirm(null)
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={`هل تريد حذف المشرف "${confirm.name}"؟`}
          danger isLoading={isLoading} setIsLoading={setIsLoading}
          onConfirm={async () => { setIsLoading(true); await deleteSupervisor(confirm.id, confirm.shift); setIsLoading(false); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {restock && (
        <ConfirmDialog
          message={`هل تريد استعادة المشرف "${restock.name}"؟`}
          isLoading={isLoading} setIsLoading={setIsLoading}
          onConfirm={async () => { setIsLoading(true); await restoreSupervisor(restock.id, restock.shift); setIsLoading(false); setRestock(null) }}
          onCancel={() => setRestock(null)}
        />
      )}
    </div>
  )
}

// ─── Teachers Tab ─────────────────────────────────────────────────────────────
function TeachersTab() {
  const { teachers, teachersLoading, teachersError, programs, addTeacher, updateTeacher, deleteTeacher } = useApp()
  const [search,    setSearch]    = useState('')
  const [modalOpen, setModal]     = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [confirm,   setConfirm]   = useState(null)
  const [form,      setForm]      = useState({ name: '', phone: '', shift: '' })

  if (teachersLoading) return <div className="flex items-center justify-center py-20 text-gray-400"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>جاري التحميل...</div>
  if (teachersError)   return <div className="text-center py-20 text-red-400">⚠️ {teachersError}</div>

  const filtered = teachers.filter(t => !t.isDeleted && t.name?.toLowerCase().includes(search?.toLowerCase()))
  const openAdd  = () => { setEditItem(null); setForm({ name: '', phone: '', shift: '' }); setModal(true) }
  const openEdit = t  => { setEditItem(t); setForm({ name: t.name, phone: t.phone, shift: t.shift || '' }); setModal(true) }
  const save     = async () => { if (editItem) await updateTeacher({ ...editItem, ...form }); else await addTeacher(form); setModal(false) }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المعلمين..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"/>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة معلم
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الاسم','الهاتف','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && <tr><td colSpan={4} className="px-5 py-16 text-center"><EmptyState/></td></tr>}
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">{t.name.charAt(0)}</div>
                    <span className="font-medium text-gray-800">{t.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 font-mono">{t.phone}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(t)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                    <button onClick={() => setConfirm({ id: t.id, name: t.name })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <Modal
          title={<div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div><span className="text-xl font-bold text-gray-800">{editItem ? 'تعديل المعلم' : 'إضافة معلم جديد'}</span></div>}
          onClose={() => setModal(false)} wide>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="الشيخ ..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}/>
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف <span className="text-red-400">*</span></label>
                <PhoneInput country={'eg'} value={form.phone} onChange={phone => setForm(p => ({ ...p, phone }))}
                  inputClass="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2 pt-2">
              <button className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm" onClick={() => setModal(false)}>إلغاء</button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium" onClick={save}>
                {editItem ? '✓ حفظ التعديل' : <><Plus size={15}/> إضافة</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          message={`هل تريد حذف المعلم "${confirm.name}"؟`} danger
          onConfirm={async () => { await deleteTeacher(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────
function ProgramsTab() {
  const { programs, programsLoading, programsError, addProgram, updateProgram, deleteProgram } = useApp()
  const [search,        setSearch]        = useState('')
  const [modalOpen,     setModal]         = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [confirm,       setConfirm]       = useState(null)
  const [form,          setForm]          = useState({ name: '', description: '', image: '' })
  const [imagePreview,  setImagePreview]  = useState(null)

  if (programsLoading) return <div className="flex items-center justify-center py-20 text-gray-400"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>جاري التحميل...</div>
  if (programsError)   return <div className="text-center py-20 text-red-400">⚠️ {programsError}</div>

  const filtered = programs?.filter(p => !p.isDeleted && p.name?.toLowerCase().includes(search?.toLowerCase()))
  const openAdd  = () => { setEditItem(null); setForm({ name: '', description: '', image: '' }); setImagePreview(null); setModal(true) }
  const openEdit = t  => { setEditItem(t); setForm({ name: t.name, description: t.description || '', image: t.image || '' }); setImagePreview(t.image || null); setModal(true) }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => { setImagePreview(reader.result); setForm(p => ({ ...p, image: reader.result })) }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    if (editItem) await updateProgram({ ...editItem, ...form })
    else          await addProgram(form)
    setModal(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في البرامج..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"/>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة برنامج
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['البرنامج','الوصف','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered?.length === 0 && <tr><td colSpan={3} className="px-5 py-16 text-center"><EmptyState/></td></tr>}
            {filtered?.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {t.image
                      ? <img src={t.image} alt={t.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-100"/>
                      : <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">{t.name.charAt(0)}</div>
                    }
                    <span className="font-medium text-gray-800">{t.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 max-w-[300px]"><p className="line-clamp-2">{t.description || '—'}</p></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(t)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                    <button onClick={() => setConfirm({ id: t.id, name: t.name })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <Modal
          title={<div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div><span className="text-xl font-bold text-gray-800">{editItem ? 'تعديل البرنامج' : 'إضافة برنامج جديد'}</span></div>}
          onClose={() => setModal(false)} wide>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">صورة البرنامج</label>
              <div className="flex items-center gap-4">
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-2xl object-cover border border-gray-200 shadow-sm flex-shrink-0"/>
                  : <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0"><BookOpen size={28} className="text-gray-300"/></div>
                }
                <div className="flex-1">
                  <label className="flex items-center justify-center gap-2 cursor-pointer border-[1.5px] border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                    <Plus size={15}/> {imagePreview ? 'تغيير الصورة' : 'رفع صورة'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange}/>
                  </label>
                  {imagePreview && (
                    <button onClick={() => { setImagePreview(null); setForm(p => ({ ...p, image: '' })) }}
                      className="mt-2 text-xs text-red-400 hover:text-red-600 transition-all">✕ حذف الصورة</button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">اسم البرنامج <span className="text-red-400">*</span></label>
              <input className={inputClass} placeholder="مثال: برنامج الحفظ..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">وصف البرنامج</label>
              <textarea rows={3} placeholder="اكتب وصفاً مختصراً للبرنامج..."
                className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all resize-none"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}/>
            </div>
            <div className="flex justify-end gap-3 mt-2 pt-2">
              <button className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm" onClick={() => setModal(false)}>إلغاء</button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium" onClick={save}>
                {editItem ? '✓ حفظ التعديل' : <><Plus size={15}/> إضافة</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          message={`هل تريد حذف البرنامج "${confirm.name}"؟`} danger
          onConfirm={async () => { await deleteProgram({ id: confirm.id }); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Students Tab ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

const STATUS_STYLE = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial:     'bg-amber-50   text-amber-700   border-amber-200',
  paused:    'bg-orange-50  text-orange-700  border-orange-200',
  cancelled: 'bg-red-50     text-red-600     border-red-200',
}
const STATUS_LABELS = {
  active: 'نشط', trial: 'تجريبي', paused: 'متوقف', cancelled: 'ملغي',
}

function StudentBadge({ status }) {
  return (
    <span className={`text-xs border px-2.5 py-1 rounded-lg font-semibold ${STATUS_STYLE[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const EMPTY_FORM = {
  name: '', phone: '', country: '', teacherId: '',
  program: '', status: 'trial', contactMethod: '',
  sessionNumber: '', trialTeacherTime: '', cancelledDate: '',
  notes: '', trialDate: '', trialTime: '', startDate: '',
  regularDates: [{ day: '', time: '', teacherTime: '', timezone: 'Africa/Cairo' }],
  pauseType: '', pauseUntil: '', _hasBeenActive: false,
}

// ← آخر يوم في شهر معيّن، شكل الإدخال "YYYY-MM"
function monthEndStr(monthStr) {
  if (!monthStr) return null
  const [y, m] = monthStr.split('-').map(Number)
  if (!y || !m) return null
  const end = new Date(y, m, 0)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getStatusAtMonth(session, monthYearStr) {
  if (!monthYearStr) return session.status

  const [yyyy, mm] = monthYearStr.split('-').map(Number)
  if (!mm || !yyyy) return session.status

  const monthStartStr = `${yyyy}-${pad2(mm)}-01`
  const monthEndStr   = `${yyyy}-${pad2(mm)}-${pad2(lastDayOfMonth(yyyy, mm))}`

  const history = (session.history || [])
    .filter((h) => h?.date && h?.status)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  if (!history.length) return session.status

  // ← الحلقة لسه ماكانتش موجودة في الشهر ده
  if (monthEndStr < history[0].date) return null

  const todayStr = cairoTodayStr()
  const isFutureMonth = monthStartStr > todayStr

  // ═══ الشهر ماضي أو الشهر الحالي: إعادة بناء عادية من الـ history ═══
  if (!isFutureMonth) {
    let statusAtEnd = null
    for (const h of history) {
      if (h.date <= monthEndStr) statusAtEnd = h.status
      else break
    }
    return statusAtEnd
  }

  // ═══ الشهر مستقبلي بالكامل: قواعد خاصة حسب الحالة الحالية ═══
  const current = session.status

  if (current === 'cancelled') return 'cancelled'

  if (current === 'trial') {
    if (session.trialDate && session.trialDate >= monthStartStr && session.trialDate <= monthEndStr) {
      return 'trial'
    }
    return null
  }

  if (current === 'paused') {
    if (session.pauseType === 'dated' && session.pauseUntil) {
      const returnDate = nextDayStr(session.pauseUntil)
      if (returnDate <= monthEndStr) return 'active'
    }
    return 'paused'
  }

  return current
}

// ← كل "الفترات" (segments) اللي حالة الحلقة مرّت بيها، متقاطعة مع مدى معيّن
// كل عنصر: { status, from, to } — to === null يعني الفترة لسه مستمرة (الحالة الحالية)
function getStatusSegments(session, rangeStart, rangeEnd) {
  const hist = (session.history || [])
    .filter(h => h.date && h.status)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  if (!hist.length) {
    // ← مفيش history: افترض إن الحالة الحالية سارية طول المدى المطلوب
    return [{ status: session.status, from: rangeStart || null, to: rangeEnd || null }]
  }

  const raw = hist.map((cur, i) => {
    const next = hist[i + 1]
    return { status: cur.status, from: cur.date, to: next ? prevDayStr(next.date) : null }
  })

  return raw
    .filter(seg => (!rangeEnd || seg.from <= rangeEnd) && (!rangeStart || seg.to === null || seg.to >= rangeStart))
    .map(seg => ({
      status: seg.status,
      from: rangeStart && seg.from < rangeStart ? rangeStart : seg.from,
      to:   seg.to === null ? (rangeEnd || null) : (rangeEnd && seg.to > rangeEnd ? rangeEnd : seg.to),
    }))
}

// ── فلتر متعدد الاختيار (checkboxes في dropdown) ──
function MultiFilterSelect({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false)
  const isAll = value.includes('all') || value.length === 0
  const toggle = (val) => {
    if (val === 'all') { onChange(['all']); return }
    let next = value.filter(v => v !== 'all')
    next = next.includes(val) ? next.filter(v => v !== val) : [...next, val]
    onChange(next.length === 0 ? ['all'] : next)
  }
  const selectedLabels = isAll ? options[0]?.label : options.filter(o => value.includes(o.value)).map(o => o.label).join('، ')

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm min-w-[130px] flex items-center justify-between gap-1.5">
        <span className="truncate">{selectedLabels || label}</span>
        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
          <div className="absolute z-20 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-[160px] max-h-64 overflow-y-auto">
            {options.map(o => {
              const checked = o.value === 'all' ? isAll : value.includes(o.value)
              return (
                <label key={o.value} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-600">
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} className="w-3.5 h-3.5 rounded accent-teal-500"/>
                  {o.label}
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function StudentsTab() {
  const {
    allSessions, allSessionsLoading, allSessionsError,
    teachers, programs,
    addSessionLocal, updateSessionLocal, deleteSessionLocal,
  } = useApp()

  const liveSessions = useMemo(() => allSessions.filter(s => !s.isDeleted), [allSessions])

  const [search,           setSearch]           = useState('')
  const [filterStatus,     setFilterStatus]     = useState(['all'])   // ← بقت array
  const [filterProgram,    setFilterProgram]    = useState(['all'])
  const [filterTeacher,    setFilterTeacher]    = useState(['all'])
  const [filterStudentId,  setFilterStudentId]  = useState('')        // ← جديد
  const [filterSessionNumber, setFilterSessionNumber] = useState('')  // ← جديد
  const [page,             setPage]             = useState(1)
  const [modalOpen,        setModalOpen]        = useState(false)
  const [editItem,         setEditItem]         = useState(null)
  const [form,             setForm]             = useState(EMPTY_FORM)
  const [saving,           setSaving]           = useState(false)
  const [confirm,          setConfirm]          = useState(null)

  // ← نوع فلتر التاريخ: none (الحالة الحيّة) / month (شهر واحد) / range (فترة)
  const [dateFilterMode, setDateFilterMode] = useState('none')
  const [filterMonth,    setFilterMonth]    = useState('')  // "YYYY-MM"
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  const filtered = useMemo(() => {
    const rangeStart = dateFilterMode === 'range' ? (filterDateFrom || null) : null
    const rangeEnd   = dateFilterMode === 'range' ? (filterDateTo   || null) : null

    return liveSessions.reduce((acc, s) => {
      const matchSearch  = !search || s.studentName?.toLowerCase().includes(search?.toLowerCase()) || String(s.sessionNumber?.toLowerCase() || '').includes(search?.toLowerCase()) || (s.studentPhone || '').includes(search)
      const matchProgram = filterProgram.includes('all') || filterProgram.includes(s.program)
      const matchTeacher = filterTeacher.includes('all') || filterTeacher.includes(s.teacherId)
      const matchStudent = !filterStudentId || s.id === filterStudentId
      const matchSessionNumber = !filterSessionNumber || String(s.sessionNumber || '').toLowerCase().includes(filterSessionNumber.trim().toLowerCase())

      let statusAtMonth = null
      let segments = null
      let matchStatus = true

      if (dateFilterMode === 'month') {
        statusAtMonth = getStatusAtMonth(s, filterMonth)
        if (statusAtMonth === null) return acc // الحلقة اتسجلت بعد الشهر ده
        matchStatus = filterStatus.includes('all') || filterStatus.includes(statusAtMonth)
      } else if (dateFilterMode === 'range' && (rangeStart || rangeEnd)) {
        segments = getStatusSegments(s, rangeStart, rangeEnd)
        if (!segments.length) return acc
        matchStatus = filterStatus.includes('all') || segments.some(seg => filterStatus.includes(seg.status))
      } else {
        matchStatus = filterStatus.includes('all') || filterStatus.includes(s.status)
      }

      if (matchSearch && matchStatus && matchProgram && matchTeacher && matchStudent && matchSessionNumber) {
        acc.push({ ...s, _statusAtMonth: statusAtMonth, _segments: segments })
      }
      return acc
    }, [])
  }, [liveSessions, search, filterStatus, filterProgram, filterTeacher, filterStudentId, filterSessionNumber, dateFilterMode, filterMonth, filterDateFrom, filterDateTo])

  useEffect(() => { setPage(1) }, [search, filterStatus, filterProgram, filterTeacher, filterStudentId, filterSessionNumber, dateFilterMode, filterMonth, filterDateFrom, filterDateTo])

  const totalFiltered = filtered.length
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const safePage      = Math.min(page, totalPages)
  const paginated     = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setModalOpen(true) }

  const openEdit = (s) => {
    setEditItem(s)
    setForm({
      name:           s.studentName   || '',
      sessionNumber:  s.sessionNumber || '',
      phone:          s.studentPhone  || '',
      country:        s.country       || '',
      teacherId:      s.teacherId     || '',
      program:        s.program       || '',
      status:         s.status        || 'trial',
      contactMethod:  s.contactMethod || '',
      notes:          s.notes         || '',
      trialDate:      s.trialDate     || '',
      trialTime:      s.trialTime     || '',
      trialTeacherTime: s.trialTeacherTime || '',
      startDate:      s.startDate     || '',
      regularDates:   s.regularDates  || [{ day: '', time: '', teacherTime: '', timezone: 'Africa/Cairo' }],
      pauseType:      s.pauseType     || '',
      pauseUntil:     s.pauseUntil    || '',
      _hasBeenActive: s._hasBeenActive || ['active', 'paused', 'cancelled'].includes(s.status),
      cancelledDate:  s.cancelledDate || '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (saving) return
    try {
      setSaving(true)
      const teacher = teachers.find(t => t.id === form.teacherId)
      if (editItem) await updateSessionLocal(editItem.id, { ...form, makeup: editItem.makeup }, teacher?.name || '')
      else          await addSessionLocal(form, teacher?.name || '')
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => { await deleteSessionLocal(id); setConfirm(null) }

  const formValid = !!(form.name?.trim() && form.teacherId && (
    form.status === 'trial'  ? form.trialDate && form.trialTime :
    form.status === 'active' ? form.regularDates?.some(d => d.day && d.time) :
    form.status === 'paused' ? (form.pauseType !== 'dated' || form.pauseUntil) : true
  ))

const hasActiveFilters = !filterStatus.includes('all') || !filterProgram.includes('all') || !filterTeacher.includes('all') ||
  !!filterStudentId || !!filterSessionNumber || dateFilterMode !== 'none'

  const clearFilters = () => {
    setFilterStatus(['all']); setFilterProgram(['all']); setFilterTeacher(['all'])
    setFilterStudentId(''); setFilterSessionNumber('')
    setDateFilterMode('none'); setFilterMonth(''); setFilterDateFrom(''); setFilterDateTo('')
  }

  if (allSessionsLoading && allSessions.length === 0) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>
      جاري التحميل...
    </div>
  )
  if (allSessionsError) return <div className="text-center py-20 text-red-400">⚠️ {allSessionsError}</div>

  const statusOpts = [
    { value: 'all',       label: 'كل الحالات' },
    { value: 'active',    label: 'نشط'     },
    { value: 'trial',     label: 'تجريبي'  },
    { value: 'paused',    label: 'متوقف'   },
    { value: 'cancelled', label: 'ملغي'    },
  ]

  return (
    <div className="space-y-5">

      {/* بحث + إضافة */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم أو هاتف أو رقم حلقة..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"/>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة طالب
        </button>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-gray-400"/>

        <MultiFilterSelect value={filterStatus} onChange={setFilterStatus} label="كل الحالات" options={statusOpts}/>

        <MultiFilterSelect
          value={filterProgram}
          onChange={setFilterProgram}
          label="كل البرامج"
          options={[
            { value: 'all', label: 'كل البرامج' },
            ...programs.filter(p => !p.isDeleted).map(p => ({ value: p.name, label: p.name })),
          ]}
        />

        <MultiFilterSelect
          value={filterTeacher}
          onChange={setFilterTeacher}
          label="كل المعلمين"
          options={[
            { value: 'all', label: 'كل المعلمين' },
            ...teachers.filter(t => !t.isDeleted).map(t => ({ value: t.id, label: t.name.replace('الشيخ ', '') })),
          ]}
        />

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">الطالب:</span>
          <select value={filterStudentId} onChange={e => setFilterStudentId(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm min-w-[150px]">
            <option value="">بدون فلتر طالب</option>
            {liveSessions.map(s => <option key={s.id} value={s.id}>{s.studentName} — #{s.sessionNumber}</option>)}
          </select>
        </div>

        <input
          type="text"
          value={filterSessionNumber}
          onChange={e => setFilterSessionNumber(e.target.value)}
          placeholder="رقم الحلقة"
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm w-28"
        />

        <div className="w-px h-6 bg-slate-200"/>

        {/* نوع فلتر التاريخ */}
        <select value={dateFilterMode} onChange={e => setDateFilterMode(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm">
          <option value="none">الحالة الحيّة</option>
          <option value="month">شهر محدد</option>
          <option value="range">فترة (من - إلى)</option>
        </select>

        {dateFilterMode === 'month' && (
          <>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm"/>
          </>
        )}

        {dateFilterMode === 'range' && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              max={filterDateTo || undefined}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm"/>
            <span className="text-xs text-slate-400">إلى</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              min={filterDateFrom || undefined}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm"/>
          </div>
        )}

        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-all font-medium">
            ✕ مسح الفلاتر
          </button>
        )}
        <span className="mr-auto text-xs text-slate-400 font-medium">{totalFiltered} حلقة</span>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['رقم الحلقة','الاسم','الهاتف','البلد','المعلم','البرنامج','الحالة','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-sm font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">🔍</div>
                  <span className="text-sm">لا توجد حلقات مطابقة</span>
                </div>
              </td></tr>
            )}
            {paginated.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">#{s.sessionNumber}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">
                      {s.studentName?.charAt(0) || '؟'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">{s.studentName || '—'}</span>
                      {s.status === 'paused' && s.pauseType === 'dated' && s.pauseUntil && (
                        <p className="text-xs text-orange-400 mt-0.5">
                          متوقف حتى {s.pauseUntil} — يرجع نشط تلقائيًا {nextDayStr(s.pauseUntil)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.studentPhone || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{s.country || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{s.teacherName?.replace('الشيخ ', '') || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{s.program || '—'}</td>
                <td className="px-5 py-4">
                  {/* ← وضع الفترة: اعرض كل الفترات (segments) اللي الحلقة مرّت بيها */}
                  {dateFilterMode === 'range' && s._segments ? (
                    <div className="flex flex-col gap-1">
                      {s._segments.map((seg, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <StudentBadge status={seg.status}/>
                          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {seg.from}{seg.to ? ` → ${seg.to}` : ' → مستمرة'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <StudentBadge status={s._statusAtMonth ?? s.status}/>
                      {dateFilterMode === 'month' && s._statusAtMonth !== s.status && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">حاليًا: {STATUS_LABELS[s.status] || s.status}</span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(s)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                    <button onClick={() => setConfirm({ id: s.id, name: s.studentName })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFiltered > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-400">
            يعرض <span className="font-semibold text-slate-600">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalFiltered)}</span>
            {' '}من <span className="font-semibold text-slate-600">{totalFiltered}</span> حلقة
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={safePage <= 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              السابق
            </button>
            <span className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold bg-teal-500 text-white shadow-sm">{safePage}</span>
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={safePage >= totalPages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
              التالي
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal إضافة/تعديل */}
      {modalOpen && (
        <Modal wide
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div>
              <div>
                <p className="text-base font-bold text-slate-800">{editItem ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</p>
                {editItem && <p className="text-xs text-slate-500">{editItem.studentName} — #{editItem.sessionNumber}</p>}
              </div>
            </div>
          }
          onClose={() => setModalOpen(false)}>
          <StudentSessionForm
            form={form} setForm={setForm}
            teachers={teachers.filter(t => !t.isDeleted)}
            programs={programs.filter(p => !p.isDeleted)}
            editItem={editItem}
          />
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm">إلغاء</button>
            <button onClick={save} disabled={!formValid || saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all ${
                formValid && !saving ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-md' : 'bg-slate-300 cursor-not-allowed'
              }`}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري الحفظ...</>
                : editItem ? <><Pencil size={14}/> حفظ التعديل</> : <><Plus size={15}/> إضافة</>
              }
            </button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal
          title={<span className="font-bold text-slate-800">تأكيد الحذف</span>}
          onClose={() => setConfirm(null)}>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto text-2xl">🗑️</div>
            <p className="text-slate-700 text-center font-medium">هل تريد حذف الطالب "{confirm.name}"؟</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirm(null)}
                className="px-5 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm">إلغاء</button>
              <button onClick={() => handleDelete(confirm.id)}
                className="px-5 py-2 rounded-xl text-white text-sm font-medium bg-red-500 hover:bg-red-600">تأكيد الحذف</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const TABS = [
    { id: 'supervisors', label: 'المشرفون', icon: UserCog },
    { id: 'teachers',   label: 'المعلمون', icon: GraduationCap },
    { id: 'programs',   label: 'البرامج',   icon: BookOpen },
    { id: 'students',   label: 'الطلاب',   icon: Users },
  ]

  const [tab, setTab] = useState('supervisors')

  return (
    <div dir="rtl" className="space-y-8 font-sans">
      <PageHeader title="إدارة المستخدمين" subtitle="إضافة وتعديل وحذف المشرفين والمعلمين والطلاب"/>
      <div className="bg-gray-100/80 p-1 rounded-2xl inline-flex gap-1 shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id ? 'bg-white text-teal-700 shadow-md' : 'text-gray-600 hover:text-teal-600 hover:bg-white/50'
            }`}>
            <t.icon size={18} strokeWidth={1.8}/>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'supervisors' && <SupervisorsTab/>}
      {tab === 'teachers'    && <TeachersTab/>}
      {tab === 'programs'    && <ProgramsTab/>}
      {tab === 'students'    && <StudentsTab/>}
    </div>
  )
}