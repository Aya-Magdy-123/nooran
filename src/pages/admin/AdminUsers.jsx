// src/pages/admin/AdminUsers.jsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, UserX, UserCheck, BookOpen, Filter, Users, GraduationCap, UserCog } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Modal, ConfirmDialog, Badge, PageHeader, EmptyState } from '../../components/ui'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { MonthPicker } from '../../components/ui/MonthPicker'


const TABS = [
  { id: 'supervisors', label: 'المشرفون', icon: UserCog },
  { id: 'teachers',   label: 'المعلمون', icon: GraduationCap },
  { id: 'programs',   label: 'البرامج',   icon: BookOpen },
  { id: 'students',   label: 'الطلاب',   icon: Users },
]

const inputClass = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

// ─── Supervisors Tab ──────────────────────────────────────────────────────────
function SupervisorsTab() {
  const { supervisors, addSupervisor, updateSupervisor, deleteSupervisor, toggleAbsent } = useApp()
  const [search, setSearch]     = useState('')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirm, setConfirm]   = useState(null)
  const [form, setForm]         = useState({ name: '', phone: '', shift: 'مسائي', status: 'active' })
  const [filterShift, setFilterShift] = useState('all')

  const filtered = supervisors.filter(s => {
    const matchSearch = s.name.includes(search) || s.phone.includes(search)
    const matchShift  = filterShift === 'all' || s.shift === filterShift
    return matchSearch && matchShift
  })
  const openAdd  = () => { setEditItem(null); setForm({ name: '', phone: '', shift: 'مسائي', status: 'active' }); setModal(true) }
  const openEdit = s  => { setEditItem(s); setForm({ name: s.name, phone: s.phone, shift: s.shift, status: s.status }); setModal(true) }
  const save = () => {
    if (editItem) updateSupervisor({ ...editItem, ...form })
    else          addSupervisor(form)
    setModal(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المشرفين..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
            <Filter size={14}/> الشيفت:
          </span>
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
            {[
              { value: 'all',       label: 'الكل' },
              { value: 'morning',   label: '🌅 4ص - 12ظ' },
              { value: 'afternoon', label: '🌞 12ظ - 8م' },
              { value: 'evening',   label: '🌙 8م - 4ص' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setFilterShift(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterShift === opt.value
                    ? 'bg-white text-teal-700 shadow-sm border border-gray-100'
                    : 'text-gray-500 hover:text-teal-600'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة مشرف
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الاسم','الهاتف','الشيفت','الحالة','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                      s.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-500'
                    }`}>{s.name.charAt(0)}</div>
                    <span className="font-medium text-gray-800">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.phone}</td>
                <td className="px-5 py-4 text-sm text-gray-600">
  {s.shift === 'morning' ? '🌅 4ص - 12ظ' :
   s.shift === 'afternoon' ? '🌞 12ظ - 8م' :
   s.shift === 'evening' ? '🌙 8م - 4ص' : s.shift}
</td>
                <td className="px-5 py-4"><Badge status={s.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(s)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                    <button onClick={() => setConfirm({ id: s.id, name: s.name })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                    <button onClick={() => toggleAbsent(s.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                        s.status === 'absent'
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                      }`}>
                      {s.status === 'absent' ? <><UserCheck size={13}/> حاضر</> : <><UserX size={13}/> غائب</>}
                    </button>
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
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                {editItem ? <Pencil size={20}/> : <Plus size={20}/>}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {editItem ? 'تعديل المشرف' : 'إضافة مشرف جديد'}
              </span>
            </div>
          }
          onClose={() => setModal(false)}
          wide
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم الكامل <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="أدخل الاسم..." value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">البريد الإلكتروني <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="أدخل البريد الالكتروني..." value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} />
              </div>

              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف <span className="text-red-400">*</span></label>
              <PhoneInput
                country={'eg'}
                value={form.phone}
                onChange={phone => setForm(p=>({...p,phone}))}
                inputClass={`w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all ${form.phone ? 'text-gray-700' : 'text-gray-400'}`}
              />
              </div>
               <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">الشيفت</label>
              <select className={inputClass} value={form.shift} onChange={e => setForm(p=>({...p,shift:e.target.value}))}>
                <option value="morning"> 4ص الي 12ظهرا  </option>
                <option value="afternoon">12 ظهرا الي 8 مساء</option>
                <option value="evening"> 8 مساء الي 4 ص </option>
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
                  <button key={opt.value} type="button" onClick={() => setForm(p=>({...p,status:opt.value}))}
                    className={`border-[1.5px] rounded-xl py-3 text-center transition-all ${
                      form.status === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
                    <span className={`text-xs font-semibold ${form.status === opt.value ? 'text-teal-700' : 'text-slate-500'}`}>{opt.label}</span>
                  </button>
                ))}
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
          message={`هل تريد حذف المشرف "${confirm.name}"؟`}
          danger
          onConfirm={() => { deleteSupervisor(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ─── Teachers Tab ─────────────────────────────────────────────────────────────
function TeachersTab() {
  const { teachers, programs, students, addTeacher, updateTeacher, deleteTeacher } = useApp()
  const [search, setSearch]          = useState('')
  const [modalOpen, setModal]        = useState(false)
  const [editItem, setEditItem]      = useState(null)
  const [confirm, setConfirm]        = useState(null)
  const [halaqaModal, setHalaqaModal] = useState(null)
  const [form, setForm]              = useState({ name: '', phone: '', program: '', shift: 'مسائي' })

  const filtered = teachers.filter(t => t.name.includes(search))
  const openAdd  = () => { setEditItem(null); setForm({ name: '', phone: '', program: '', shift: 'مسائي' }); setModal(true) }
  const openEdit = t  => { setEditItem(t); setForm({ name: t.name, phone: t.phone, program: t.program, shift: t.shift }); setModal(true) }
  const save = () => {
    if (editItem) updateTeacher({ ...editItem, ...form })
    else          addTeacher(form)
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
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">{t.name.charAt(0)}</div>
                    <span className="font-medium text-gray-800">{t.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500">{t.program}</td>
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
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                {editItem ? <Pencil size={20}/> : <Plus size={20}/>}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {editItem ? 'تعديل المعلم' : 'إضافة معلم جديد'}
              </span>
            </div>
          }
          onClose={() => setModal(false)}
          wide
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="الشيخ ..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف <span className="text-red-400">*</span></label>
              <PhoneInput
                country={'eg'}
                value={form.phone}
                onChange={phone => setForm(p=>({...p,phone}))}
                inputClass={`w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all ${form.phone ? 'text-gray-700' : 'text-gray-400'}`}
              />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">البرنامج</label>
                <select className={inputClass} value={form.program} onChange={e=>setForm(p=>({...p,program:e.target.value}))}>
                  <option value="">اختر البرنامج</option>
                  {programs?.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
            </div>
            <div className="flex justify-end gap-3 mt-2 pt-2">
              <button className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm" onClick={()=>setModal(false)}>إلغاء</button>
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
          onConfirm={() => { deleteTeacher(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
// ─── Programs Tab ─────────────────────────────────────────────────────────────
function ProgramsTab() {
  const { programs, students, addProgram, updateProgram, deleteProgram } = useApp()
  const [search, setSearch]          = useState('')
  const [modalOpen, setModal]        = useState(false)
  const [editItem, setEditItem]      = useState(null)
  const [confirm, setConfirm]        = useState(null)
  const [form, setForm]              = useState({ name: '' })

  const filtered = programs?.filter(t => t.name.includes(search))
  const openAdd  = () => { setEditItem(null); setForm({ name: '' }); setModal(true) }
  const openEdit = t  => { setEditItem(t); setForm({ name: t.name }); setModal(true) }
  const save = () => {
    if (editItem) updateProgram({ ...editItem, ...form })
    else          addProgram(form)
    setModal(false)
  }

  console.log(programs);
  

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
              {['الاسم','إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered?.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
            {filtered?.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">{t.name.charAt(0)}</div>
                    <span className="font-medium text-gray-800">{t.name}</span>
                  </div>
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
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                {editItem ? <Pencil size={20}/> : <Plus size={20}/>}
              </div>
              <span className="text-xl font-bold text-gray-800">
                {editItem ? 'تعديل البرنامج' : 'إضافة برنامج جديد'}
              </span>
            </div>
          }
          onClose={() => setModal(false)}
          wide
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5"> اسم البرنامج <span className="text-red-400">*</span></label>
                <input className={inputClass} placeholder="البرنامج ..." value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
              </div>
                          
            <div className="flex justify-end gap-3 mt-2 pt-2">
              <button className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm" onClick={()=>setModal(false)}>إلغاء</button>
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
          onConfirm={() => { deleteProgram(confirm.id); setConfirm(null) }}
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
const { students, teachers, halaqas, programs, addStudent, updateStudent, deleteStudent } = useApp()
  const [showPostpone, setShowPostpone] = useState(false)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [filterProgram, setFilterProgram] = useState('all')
  const [filterTeacher, setFilterTeacher] = useState('all')
  const [modalOpen, setModal]       = useState(false)
  const [activeTab, setActiveTab]   = useState('info')
  const [editItem, setEditItem]     = useState(null)
  const [confirm, setConfirm]       = useState(null)
  const [scheduleModal, setScheduleModal] = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [sessions, setSessions]     = useState([])
const [filterMonth, setFilterMonth] = useState(null)

  const statusOpts = [
    { value: 'all', label: 'الكل' }, { value: 'active', label: 'نشط' },
    { value: 'trial', label: 'تجريبي' }, { value: 'onhold', label: 'موقوف' },
    { value: 'cancelled', label: 'ملغي' },
  ]

  const postponeCount = students.filter(s => s.postponeStatus === 'pending').length

const filtered = (showPostpone
  ? students.filter(s => s.postponeStatus === 'pending')
  : students.filter(s => {
      const matchSearch  = s.name.includes(search) || (s.phone || '').includes(search)
      const matchStatus  = filterStatus  === 'all' || s.status  === filterStatus
      const matchProgram = filterProgram === 'all' || s.program === filterProgram
      const matchTeacher = filterTeacher === 'all' || String(s.teacherId) === filterTeacher
      const matchMonth   = !filterMonth || s.sessions?.some(sess =>
        sess.dates?.some(d => d.date &&
          new Date(d.date).getMonth()    === filterMonth.month &&
          new Date(d.date).getFullYear() === filterMonth.year)
      )
      return matchSearch && matchStatus && matchProgram && matchTeacher && matchMonth
    })
)

  const openAdd  = () => { setEditItem(null); setForm(emptyForm); setSessions([]); setActiveTab('info'); setModal(true) }
  const openEdit = s  => { setEditItem(s); setForm({ name: s.name, phone: s.phone || '', teacherId: s.teacherId, program: s.program || '', status: s.status }); setSessions(s.sessions || []); setActiveTab('info'); setModal(true) }
  const addSessionRow = () => setSessions(p => [...p, { ...emptySession, id: Date.now() }])
  const removeSession = (idx) => setSessions(p => p.filter((_, i) => i !== idx))
  const updateSessionField = (idx, field, value) => setSessions(p => p.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  const updateSessionDate = (idx, dateIdx, field, value) => {
    setSessions(p => p.map((s, i) => {
      if (i !== idx) return s
      const dates = [...(s.dates || [])]
      dates[dateIdx] = { ...dates[dateIdx], [field]: value }
      return { ...s, dates }
    }))
  }
  const addDateRow = (idx) => setSessions(p => p.map((s, i) => i === idx ? { ...s, dates: [...(s.dates || []), { date: '', time: '' }] } : s))
  const save = () => {
    const payload = { ...form, teacherId: Number(form.teacherId), sessions, id: editItem?.id || Date.now(), attendance: editItem?.attendance ?? null }
    if (editItem) updateStudent({ ...editItem, ...payload })
    else addStudent(payload)
    setModal(false)
  }

  const typeLabel = { trial: 'تجريبي', makeup: 'تعويض', regular: 'عادي' }
  const typeColor = { trial: 'bg-amber-50 text-amber-700 border-amber-200', makeup: 'bg-purple-50 text-purple-700 border-purple-200', regular: 'bg-blue-50 text-blue-700 border-blue-200' }

  return (
    <div className="space-y-5">

      {/* Search + Add + Postpone Button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم أو هاتف..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-gray-700" />
        </div>



        {/* زرار طلبات التأجيل */}
        <button
          onClick={() => setShowPostpone(p => !p)}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all ${
            showPostpone
              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:border-amber-200 hover:text-amber-600'
          }`}>
          طلبات التأجيل
          {postponeCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {postponeCount}
            </span>
          )}
        </button>

        <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium whitespace-nowrap">
          <Plus size={18}/> إضافة طالب
        </button>
      </div>

      {/* Filters — تختفي لما يكون فلتر التأجيل شغال */}
      {!showPostpone && (
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={14} className="text-gray-400"/>
          {[
            { label: 'الحالة',   value: filterStatus,  onChange: setFilterStatus,  options: statusOpts },
            { label: 'البرنامج', value: filterProgram, onChange: setFilterProgram, options: [{ value: 'all', label: 'كل البرامج' },  ...PROGRAMS.map(p => ({ value: p.name, label: p.name }))] },
            { label: 'المعلم',   value: filterTeacher, onChange: setFilterTeacher, options: [{ value: 'all', label: 'كل المعلمين' }, ...teachers.map(t => ({ value: String(t.id), label: t.name.replace('الشيخ ', '') }))] },
            
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">{f.label}:</span>
              <select value={f.value} onChange={e => f.onChange(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none shadow-sm min-w-[130px]">
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        <MonthPicker value={filterMonth} onChange={setFilterMonth} />

          {(filterStatus !== 'all' || filterProgram !== 'all' || filterTeacher !== 'all') && (
            <button onClick={() => { setFilterStatus('all'); setFilterProgram('all'); setFilterTeacher('all'); setFilterMonth(null) }}
              className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-all font-medium">
              ✕ مسح الفلاتر
            </button>
          )}
        </div>
      )}

      {/* إشعار لما يكون فلتر التأجيل شغال */}
      {showPostpone && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-700 font-medium w-fit">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
          يعرض {postponeCount} طالب لديهم طلب تأجيل معلق
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['الاسم', 'الهاتف', 'المعلم', 'البرنامج', 'الحلقات', 'الحالة', 'إجراء'].map(h => (
                <th key={h} className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center"><EmptyState /></td></tr>}
            {filtered.map(s => {
              const teacher   = teachers.find(t => t.id === s.teacherId)
              const sSessions = s.sessions || []
              return (
                <tr key={s.id} className={`transition-colors ${
                  s.postponeStatus === 'pending' ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/50'
                }`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                        s.postponeStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-700'
                      }`}>{s.name.charAt(0)}</div>
                      <div>
                        <span className="font-medium text-gray-800">{s.name}</span>
                        {s.postponeStatus === 'pending' && (
                          <div className="text-xs text-amber-600 font-medium mt-0.5">⏳ طلب تأجيل</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 font-mono">{s.phone || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{teacher?.name?.replace('الشيخ ', '') || '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{s.program || '—'}</td>
                  <td className="px-5 py-4">
                    {sSessions.length > 0 ? (
                      <button onClick={() => setScheduleModal(s)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-teal-200 text-teal-600 hover:bg-teal-50 font-semibold transition-all">
                        <BookOpen size={13}/> {sSessions.length} حلقة
                      </button>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-4"><Badge status={s.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-2 text-yellow-600 rounded-xl hover:text-teal-600 hover:bg-teal-50 transition-all"><Pencil size={16}/></button>
                      <button onClick={() => setConfirm({ id: s.id, name: s.name })} className="p-2 text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {scheduleModal && (
        <Modal title={<div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-teal-50 text-teal-600"><BookOpen size={20}/></div><span className="text-xl font-bold text-gray-800">حلقات: {scheduleModal.name}</span></div>}
          onClose={() => setScheduleModal(null)} wide>
          <div className="flex flex-col gap-3">
            {(scheduleModal.sessions || []).length === 0 && <div className="text-center py-8 text-gray-400 text-sm">لا توجد حلقات مسجلة</div>}
            {(scheduleModal.sessions || []).map((sess, i) => (
              <div key={i} className={`rounded-xl border p-4 ${typeColor[sess.type] || typeColor.trial}`}>
                <span className="text-xs font-bold">{typeLabel[sess.type]}</span>
                <div className="flex flex-col gap-1.5 mt-2">
                  {(sess.dates || []).map((d, di) => (
                    <div key={di} className="flex items-center gap-2 text-xs font-mono">{d.date} — {d.time}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <Modal
          title={<div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-teal-50 text-teal-600">{editItem ? <Pencil size={20}/> : <Plus size={20}/>}</div><span className="text-xl font-bold text-gray-800">{editItem ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</span></div>}
          onClose={() => setModal(false)} wide>

          <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
            {[{ id: 'info', label: 'البيانات' }, { id: 'sessions', label: 'الحلقات' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
            ))}
          </div>

          {activeTab === 'info' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم <span className="text-red-400">*</span></label>
                  <input className={inputClass} placeholder="اسم الطالب..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف</label>
                  <PhoneInput country={'eg'} value={form.phone} onChange={phone => setForm(p => ({ ...p, phone }))}
                    inputClass="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">المعلم <span className="text-red-400">*</span></label>
                  <select className={inputClass} value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}>
                    <option value="">اختر معلماً...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">البرنامج</label>
                  <select className={inputClass} value={form.program} onChange={e => setForm(p => ({ ...p, program: e.target.value }))}>
                    <option value="">اختر برنامجاً...</option>
                    {programs.map(pr => <option key={pr.id} value={pr.name}>{pr.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">حالة الطالب</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'trial',     label: 'تجريبي', color: 'bg-amber-400' },
                    { value: 'active',    label: 'نشط',     color: 'bg-emerald-500' },
                    { value: 'onhold',    label: 'موقوف',   color: 'bg-gray-400' },
                    // { value: 'cancelled', label: 'ملغي',    color: 'bg-red-400' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                      className={`border-[1.5px] rounded-xl py-2.5 text-center transition-all ${form.status === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                      <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
                      <span className={`text-xs font-semibold ${form.status === opt.value ? 'text-teal-700' : 'text-slate-500'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="flex flex-col gap-4">
              {sessions.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">لا توجد حلقات مضافة بعد</div>}
              {sessions.map((sess, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {[{ value: 'trial', label: 'تجريبي', color: 'bg-amber-400' }, { value: 'makeup', label: 'تعويض', color: 'bg-purple-400' }, { value: 'regular', label: 'عادي', color: 'bg-blue-400' }].map(opt => (
                        <button key={opt.value} type="button" onClick={() => updateSessionField(idx, 'type', opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${sess.type === opt.value ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${opt.color}`}/>{opt.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => removeSession(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(sess.dates || []).map((d, di) => (
                      <div key={di} className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">{sess.type === 'regular' ? 'اليوم' : 'التاريخ'}</label>
                          {sess.type === 'regular' ? (
                            <select className={inputClass} value={d.date} onChange={e => updateSessionDate(idx, di, 'date', e.target.value)}>
                              <option value="">اختر اليوم...</option>
                              {['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map(day => <option key={day} value={day}>{day}</option>)}
                            </select>
                          ) : (
                            <input type="date" className={inputClass} value={d.date} onChange={e => updateSessionDate(idx, di, 'date', e.target.value)} />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">الوقت</label>
                          <input type="time" className={inputClass} value={d.time} onChange={e => updateSessionDate(idx, di, 'time', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addDateRow(idx)}
                      className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all">
                      <Plus size={13}/> إضافة موعد آخر
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addSessionRow}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-teal-300 rounded-xl px-4 py-3 text-sm text-teal-600 hover:bg-teal-50 font-semibold transition-all">
                <Plus size={15}/> إضافة حلقة
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-2">
            <button className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm" onClick={() => setModal(false)}>إلغاء</button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium" onClick={save}>
              {editItem ? '✓ حفظ التعديل' : <><Plus size={15}/> إضافة</>}
            </button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog message={`هل تريد حذف الطالب "${confirm.name}"؟`} danger
          onConfirm={() => { deleteStudent(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const role = localStorage.getItem("role")
  
  const TABS = [
    ...(role === 'admin' ? [{ id: 'supervisors', label: 'المشرفون', icon: UserCog }] : []),
    { id: 'teachers', label: 'المعلمون', icon: GraduationCap },
    { id: 'programs', label: 'البرامج',  icon: BookOpen },
    { id: 'students', label: 'الطلاب',  icon: Users },
  ]

  const [tab, setTab] = useState(role === 'admin' ? 'supervisors' : 'teachers')

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