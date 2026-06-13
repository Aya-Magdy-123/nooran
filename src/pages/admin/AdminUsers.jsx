// src/pages/admin/AdminUsers.jsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, UserX, UserCheck, BookOpen, Filter, Users, GraduationCap, UserCog } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmDialog, Badge, PageHeader, EmptyState } from '../../components/ui'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { MonthPicker } from '../../components/ui/MonthPicker'
import StudentSessionForm from '../../components/ui/StudentSessionForm'


const TABS = [
  { id: 'supervisors', label: 'المشرفون', icon: UserCog },
  { id: 'teachers',   label: 'المعلمون', icon: GraduationCap },
  { id: 'programs',   label: 'البرامج',   icon: BookOpen },
  { id: 'students',   label: 'الطلاب',   icon: Users },
]

const inputClass = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

// ─── Supervisors Tab ──────────────────────────────────────────────────────────
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

  const [form, setForm] = useState({
    name: '', email: '', phone: '', shift: 'morning', status: 'active'
  })

  const role    = localStorage.getItem("role")
  const isAdmin = role === 'admin'

  const filtered = supervisors.filter(s => {
    const matchSearch = s.name.includes(search) || (s.phone || '').includes(search)
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

    if (!form.name?.trim())  return setSaveError('الاسم مطلوب')
    if (!editItem) {
      if (!form.email?.trim())         return setSaveError('البريد الإلكتروني مطلوب')
      if (!form.email.includes('@'))   return setSaveError('بريد إلكتروني غير صحيح')
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

  return (
    <div className="space-y-5">

      {/* Search + Filters + Add */}
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
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Filter size={13}/> الشيفت:
          </span>
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الاسم', 'الهاتف', 'الشيفت', 'الحالة', isAdmin ? 'إجراء' : ''].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-16 text-center"><EmptyState/></td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">

                {/* الاسم */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                      s.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-500'
                    }`}>
                      {s.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-800">{s.name}</span>
                  </div>
                </td>

                {/* الهاتف */}
                <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.phone}</td>

                {/* الشيفت */}
                <td className="px-5 py-4 text-sm text-gray-600">{shiftLabel(s.shift)}</td>

                {/* الحالة */}
                <td className="px-5 py-4"><Badge status={s.status}/></td>

                {/* الإجراء */}
                <td className="px-5 py-4">
                  {s.isDeleted ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400 font-medium px-2 py-1 bg-red-50 rounded-lg">محذوف</span>
                      {isAdmin && (
                        <button onClick={() => restoreSupervisor(s.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-all">
                          استعادة
                        </button>
                      )}
                    </div>
                  ) : isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)}
                        className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all">
                        <Pencil size={16}/>
                      </button>
                      <button onClick={() => setConfirm({ id: s.id, name: s.name })}
                        className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all">
                        <Trash2 size={16}/>
                      </button>
                      <button
                        onClick={() => setAttendConfirm({ supervisor: s })}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                          s.status === 'absent'
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        }`}>
                        {s.status === 'absent'
                          ? <><UserCheck size={13}/> حاضر</>
                          : <><UserX size={13}/> غائب</>
                        }
                      </button>
                    </div>
                  ) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal إضافة/تعديل */}
      {modalOpen && (
        <Modal
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                {editItem ? <Pencil size={20}/> : <Plus size={20}/>}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {editItem ? 'تعديل المشرف' : 'إضافة مشرف جديد'}
              </span>
            </div>
          }
          onClose={() => setModal(false)} wide>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">

              {/* الاسم */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  الاسم الكامل <span className="text-red-400">*</span>
                </label>
                <input className={inputClass} placeholder="أدخل الاسم..."
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}/>
              </div>

              {/* البريد — بس في الإضافة */}
            {/* البريد */}
<div>
  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
    البريد الإلكتروني {!editItem && <span className="text-red-400">*</span>}
  </label>
  <input className={inputClass} placeholder="example@email.com" type="email"
    value={form.email}
    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
    disabled={!!editItem} 
    style={editItem ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
  />
  {editItem && (
    <p className="text-xs text-slate-400 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
  )}
</div>

              {/* الهاتف */}
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف</label>
                <PhoneInput country={'eg'} value={form.phone}
                  onChange={phone => setForm(p => ({ ...p, phone }))}
                  inputClass="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"/>
              </div>

              {/* الشيفت */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الشيفت</label>
                <select className={inputClass} value={form.shift}
                  onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}>
                  <option value="morning">🌅 4ص الي 12ظهرا</option>
                  <option value="afternoon">🌞 12 ظهرا الي 8 مساء</option>
                  <option value="evening">🌙 8 مساء الي 4 ص</option>
                </select>
              </div>
            </div>

            {/* الحالة */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">الحالة</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'active', label: 'حاضر', color: 'bg-emerald-500' },
                  { value: 'absent', label: 'غائب', color: 'bg-red-400' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                    className={`border-[1.5px] rounded-xl py-3 text-center transition-all ${
                      form.status === opt.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
                    <span className={`text-xs font-semibold ${
                      form.status === opt.value ? 'text-teal-700' : 'text-slate-500'
                    }`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* رسالة الخطأ */}
            {saveError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                ⚠️ {saveError}
              </p>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-slate-100">
              <button onClick={() => setModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm">
                إلغاء
              </button>
              <button onClick={save} disabled={saveLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {saveLoading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري الحفظ...</>
                  : editItem ? '✓ حفظ التعديل' : <><Plus size={15}/> إضافة</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* مودال تأكيد الحضور/الغياب */}
      {attendConfirm && (
        <ConfirmDialog
          message={
            attendConfirm.supervisor.status === 'absent'
              ? `هل تريد تسجيل "${attendConfirm.supervisor.name}" حاضراً؟`
              : `هل تريد تسجيل "${attendConfirm.supervisor.name}" غائباً؟`
          }
          confirmText={attendConfirm.supervisor.status === 'absent' ? 'تسجيل حاضر' : 'تسجيل غائب'}
          danger={attendConfirm.supervisor.status !== 'absent'}
          onConfirm={async () => {
            await toggleAbsent(attendConfirm.supervisor.id)
            setAttendConfirm(null)
          }}
          onCancel={() => setAttendConfirm(null)}
        />
      )}

      {/* مودال تأكيد الحذف */}
      {confirm && (
        <ConfirmDialog
          message={`هل تريد حذف المشرف "${confirm.name}"؟`}
          danger
          onConfirm={async () => {
            await deleteSupervisor(confirm.id)
            setConfirm(null)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Teachers Tab ─────────────────────────────────────────────────────────────
function TeachersTab() {
  const { teachers, teachersLoading, teachersError, programs, addTeacher, updateTeacher, deleteTeacher } = useApp()
  const [search, setSearch]     = useState('')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirm, setConfirm]   = useState(null)
  const [form, setForm]         = useState({ name: '', phone: '', program: '', shift: '' })

  if (teachersLoading) return <div className="flex items-center justify-center py-20 text-gray-400"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>جاري التحميل...</div>
  if (teachersError)   return <div className="text-center py-20 text-red-400">⚠️ {teachersError}</div>

  const filtered = teachers.filter(t => !t.isDeleted && t.name.includes(search))

  const openAdd  = () => { setEditItem(null); setForm({ name: '', phone: '', program: '', shift: '' }); setModal(true) }
  const openEdit = t  => { setEditItem(t); setForm({ name: t.name, phone: t.phone, program: t.program || '', shift: t.shift || '' }); setModal(true) }
  
  const save = async () => {
    if (editItem) await updateTeacher({ ...editItem, ...form })
    else          await addTeacher(form)
    setModal(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المعلمين..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة معلم
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الاسم','البرنامج','الهاتف','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && <tr><td colSpan={4} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">{t.name.charAt(0)}</div>
                    <span className="font-medium text-gray-800">{t.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500">{t.program || '—'}</td>
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
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div>
              <span className="text-xl font-bold text-gray-800">{editItem ? 'تعديل المعلم' : 'إضافة معلم جديد'}</span>
            </div>
          }
          onClose={() => setModal(false)} wide>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="الشيخ ..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف <span className="text-red-400">*</span></label>
                <PhoneInput
                  country={'eg'}
                  value={form.phone}
                  onChange={phone => setForm(p => ({ ...p, phone }))} 
                  inputClass="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">البرنامج</label>
                <select className={inputClass} value={form.program} onChange={e => setForm(p => ({ ...p, program: e.target.value }))}>
                  <option value="">اختر البرنامج</option>
                  {programs?.filter(p => !p.isDeleted).map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
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
          message={`هل تريد حذف المعلم "${confirm.name}"؟`}
          danger
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
  const [search, setSearch]           = useState('')
  const [modalOpen, setModal]         = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [confirm, setConfirm]         = useState(null)
  const [form, setForm]               = useState({ name: '', description: '', image: '' })
  const [imagePreview, setImagePreview] = useState(null)

  if (programsLoading) return <div className="flex items-center justify-center py-20 text-gray-400"><div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>جاري التحميل...</div>
  if (programsError)   return <div className="text-center py-20 text-red-400">⚠️ {programsError}</div>

  const filtered = programs?.filter(p => !p.isDeleted && p.name.includes(search))

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في البرامج..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700" />
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
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered?.length === 0 && <tr><td colSpan={3} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
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
                <td className="px-5 py-4 text-sm text-gray-500 max-w-[300px]">
                  <p className="line-clamp-2">{t.description || '—'}</p>
                </td>
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
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div>
              <span className="text-xl font-bold text-gray-800">{editItem ? 'تعديل البرنامج' : 'إضافة برنامج جديد'}</span>
            </div>
          }
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
                      className="mt-2 text-xs text-red-400 hover:text-red-600 transition-all">
                      ✕ حذف الصورة
                    </button>
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
          message={`هل تريد حذف البرنامج "${confirm.name}"؟`}
          danger
          onConfirm={async () => { await deleteProgram({ id: confirm.id }); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

const DAYS_SHORT = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']

const PROGRAMS = ['حفظ القرآن', 'تجويد', 'حفظ وتجويد', 'القراءات']

const emptyForm = {
  name: '', phone: '', teacherId: '', program: '', status: 'trial',
}

const emptySession = { type: 'trial', dates: [{ date: '', time: '' }] }

function StudentsTab() {
  const { 
    sessions, sessionsLoading, sessionsError,
    teachers, programs,
    addSession, updateSession, deleteSession,
  } = useApp()

  const [showPostpone, setShowPostpone]     = useState(false)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterProgram, setFilterProgram]   = useState('all')
  const [filterTeacher, setFilterTeacher]   = useState('all')
  const [filterMonth, setFilterMonth]       = useState(null)
  const [modalOpen, setModal]               = useState(false)
  const [editItem, setEditItem]             = useState(null)
  const [confirm, setConfirm]               = useState(null)
  const [form, setForm]                     = useState({})
  const [saving, setSaving]                 = useState(false)

  if (sessionsLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>
      جاري التحميل...
    </div>
  )
  if (sessionsError) return <div className="text-center py-20 text-red-400">⚠️ {sessionsError}</div>

  const statusOpts = [
    { value: 'all',       label: 'الكل' },
    { value: 'active',    label: 'نشط' },
    { value: 'trial',     label: 'تجريبي' },
    { value: 'paused',    label: 'متوقف' },
    { value: 'cancelled', label: 'ملغي' },
  ]

  const filtered = sessions.filter(s => {
    if (s.isDeleted) return false
    const matchSearch  = s.studentName?.includes(search) || (s.studentPhone || '').includes(search)
    const matchStatus  = filterStatus  === 'all' || s.status   === filterStatus
    const matchProgram = filterProgram === 'all' || s.program  === filterProgram
    const matchTeacher = filterTeacher === 'all' || s.teacherId === filterTeacher
    const matchMonth   = !filterMonth || (() => {
      const date = s.trialDate || s.regularDates?.[0]?.date
      if (!date) return false
      const d = new Date(date)
      return d.getMonth() === filterMonth.month && d.getFullYear() === filterMonth.year
    })()
    return matchSearch && matchStatus && matchProgram && matchTeacher && matchMonth
  })

  const openAdd = () => {
    setEditItem(null)
    setForm({
      name: '', phone: '', country: '', teacherId: '',
      program: '', status: 'trial', contactMethod: '',
      notes: '', trialDate: '', trialTime: '',
      regularDates: [{ day: '', time: '', teacherTime: '', timezone: 'Africa/Cairo' }],
      pauseType: '', pauseUntil: '', _hasBeenActive: false,
    })
    setModal(true)
  }

  const openEdit = s => {
    setEditItem(s)
    setForm({
      name:           s.studentName    || '',
      phone:          s.studentPhone   || '',
      country:        s.country        || '',
      teacherId:      s.teacherId      || '',
      program:        s.program        || '',
      status:         s.status,
      contactMethod:  s.contactMethod  || '',
      notes:          s.notes          || '',
      trialDate:      s.trialDate      || '',
      trialTime:      s.trialTime      || '',
      regularDates:   s.regularDates   || [{ day: '', time: '', teacherTime: '', timezone: 'Africa/Cairo' }],
      pauseType:      s.pauseType      || '',
      pauseUntil:     s.pauseUntil     || '',
      _hasBeenActive: ['active','paused','cancelled'].includes(s.status),
    })
    setModal(true)
  }

  const save = async () => {
    if (saving) return
    try {
      setSaving(true)
      const teacher = teachers.find(t => t.id === form.teacherId)
      if (editItem) {
        await updateSession(editItem.id, { ...form, makeup: editItem.makeup }, teacher?.name || '')
      } else {
        await addSession(form, teacher?.name || '', null, '')
      }
      setModal(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Search + Buttons */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم أو هاتف..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700"/>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة طالب
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-gray-400"/>
        {[
          { label: 'الحالة',   value: filterStatus,  onChange: setFilterStatus,  options: statusOpts },
          { label: 'البرنامج', value: filterProgram, onChange: setFilterProgram,
            options: [{ value: 'all', label: 'كل البرامج' }, ...programs.filter(p => !p.isDeleted).map(p => ({ value: p.name, label: p.name }))] },
          { label: 'المعلم',   value: filterTeacher, onChange: setFilterTeacher,
            options: [{ value: 'all', label: 'كل المعلمين' }, ...teachers.filter(t => !t.isDeleted).map(t => ({ value: t.id, label: t.name.replace('الشيخ ', '') }))] },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">{f.label}:</span>
            <select value={f.value} onChange={e => f.onChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm min-w-[130px]">
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <MonthPicker value={filterMonth} onChange={setFilterMonth}/>
        {(filterStatus !== 'all' || filterProgram !== 'all' || filterTeacher !== 'all' || filterMonth) && (
          <button onClick={() => { setFilterStatus('all'); setFilterProgram('all'); setFilterTeacher('all'); setFilterMonth(null) }}
            className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-all font-medium">
            ✕ مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['رقم الحلقة','الاسم','الهاتف','البلد','وسيلة التواصل','المعلم','البرنامج','الحالة','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-16 text-center"><EmptyState/></td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                    #{s.sessionNumber}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">
                      {s.studentName?.charAt(0) || '؟'}
                    </div>
                    <span className="font-medium text-gray-800">{s.studentName || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.studentPhone || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{s.country || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{s.contactMethod || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{s.teacherName?.replace('الشيخ ', '') || '—'}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{s.program || '—'}</td>
                <td className="px-5 py-4"><Badge status={s.status}/></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(s)}
                      className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all">
                      <Pencil size={16}/>
                    </button>
                    <button onClick={() => setConfirm({ id: s.id, name: s.studentName })}
                      className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal إضافة/تعديل */}
      {modalOpen && (
        <Modal
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                {editItem ? <Pencil size={20}/> : <Plus size={20}/>}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {editItem ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
              </span>
            </div>
          }
          onClose={() => setModal(false)} wide>

          <StudentSessionForm
            form={form} setForm={setForm}
            teachers={teachers.filter(t => !t.isDeleted)}
            programs={programs.filter(p => !p.isDeleted)}
            editItem={editItem}
          />

          <div className="flex justify-end gap-3 mt-6 pt-2">
            <button onClick={() => setModal(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all ${
                !saving ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-md' : 'bg-slate-300 cursor-not-allowed'
              }`}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري الحفظ...</>
                : editItem ? '✓ حفظ التعديل' : <><Plus size={15}/> إضافة</>
              }
            </button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          message={`هل تريد حذف الطالب "${confirm.name}"؟`}
          danger
          onConfirm={async () => { await deleteSession(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const role = localStorage.getItem("role")
  
  const TABS = [
    ...[{ id: 'supervisors', label: 'المشرفون', icon: UserCog }],
    { id: 'teachers', label: 'المعلمون', icon: GraduationCap },
    { id: 'programs', label: 'البرامج',  icon: BookOpen },
    { id: 'students', label: 'الطلاب',  icon: Users },
  ]

  const [tab, setTab] = useState('supervisors')

  return (
    <div dir="rtl" className="space-y-8 font-sans">
      <PageHeader title="إدارة المستخدمين" subtitle="إضافة وتعديل وحذف المشرفين والمعلمين والطلاب" />
      <div className="bg-gray-100/80 p-1 rounded-2xl inline-flex gap-1 shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id
                ? 'bg-white text-teal-700 shadow-md'
                : 'text-gray-600 hover:text-teal-600 hover:bg-white/50'
            }`}>
            <t.icon size={18} strokeWidth={1.8}/>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'supervisors' && <SupervisorsTab />}
      {tab === 'teachers'    && <TeachersTab />}
      {tab === 'programs'    && <ProgramsTab />}
      {tab === 'students'    && <StudentsTab />}
    </div>
  )
}