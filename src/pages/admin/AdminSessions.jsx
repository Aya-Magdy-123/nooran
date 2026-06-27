import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, Trash2, Star, Filter, BookOpen, Clock, Calendar, User } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import StudentSessionForm from '../../components/ui/StudentSessionForm'
import MakeupModal from '../../components/ui/MakeupModal'

const DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']


const SESSION_STATUS_STYLE = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-teal-50 text-teal-700 border-teal-200',
  noshow:    'bg-red-50 text-red-600 border-red-200',
  trial:     'bg-amber-50 text-amber-700 border-amber-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused:    'bg-orange-50 text-orange-700 border-orange-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABELS = {
  active:'نشط', trial:'تجريبي', onhold:'موقوف', cancelled:'ملغي', paused:'متوقف',
  scheduled:'مجدول', confirmed:'مؤكد', noshow:'غياب', completed:'مكتمل',
}

function calcTeacherTime(time, timezone) {
  if (!time || !timezone) return ''
  try {
    const [h, m] = time.split(':').map(Number)
    const now = new Date()
    const getOffset = tz => {
      const utc  = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
      const tzDt = new Date(now.toLocaleString('en-US', { timeZone: tz }))
      return (tzDt - utc) / 60000
    }
    const diff     = getOffset('Africa/Cairo') - getOffset(timezone)
    const totalMin = h * 60 + m + diff
    const fh = Math.floor(((totalMin / 60) % 24 + 24) % 24)
    const fm = ((totalMin % 60) + 60) % 60
    return `${String(fh).padStart(2,'0')}:${String(fm).padStart(2,'0')}`
  } catch { return '' }
}

function isMakeupPast(makeup) {
  if (!makeup?.date || !makeup?.studentTime) return false
  return new Date(`${makeup.date}T${makeup.studentTime}`) < new Date()
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ── دالة مساعدة: استخراج شهر-سنة (MM-YYYY) من تاريخ ──
function toMonthYear(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}


// ── هل الحلقة فيها اليوم المختار؟ ──
function matchesDay(s, day) {
  if (day === 'all') return true
  return (s.regularDates || []).some(d => d.day === day)
}

const ic = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          {title}
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto text-2xl">🗑️</div>
        <p className="text-slate-700 text-center font-medium">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel}
            className="px-5 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm">إلغاء</button>
          <button onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-white text-sm font-medium bg-red-500 hover:bg-red-600">تأكيد الحذف</button>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm cursor-pointer hover:border-slate-300 transition-all">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── فلتر متعدد الاختيار (checkboxes في dropdown) — مستخدم لفلتر الحالة ──
function MultiFilterSelect({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false)

  const isAll = value.includes('all') || value.length === 0
  const toggle = (val) => {
    if (val === 'all') { onChange(['all']); return }
    let next = value.filter(v => v !== 'all')
    next = next.includes(val) ? next.filter(v => v !== val) : [...next, val]
    onChange(next.length === 0 ? ['all'] : next)
  }

  const selectedLabels = isAll
    ? options[0]?.label
    : options.filter(o => value.includes(o.value)).map(o => o.label).join('، ')

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm cursor-pointer hover:border-slate-300 transition-all flex items-center gap-1.5 max-w-[160px]">
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
                <label key={o.value}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-600">
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.value)}
                    className="w-3.5 h-3.5 rounded accent-teal-500"/>
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

function MakeupCell({ session, onOpen, onClearRequest }) {
  const { makeup } = session

  // ← الشرط الصحيح: يظهر بس لو فيه طلب تأجيل معلّق ومفيش makeup مؤكد
  const eligible = session.attendanceStatus === 'postponed' && !makeup?.confirmed

  if (!makeup?.confirmed) {
    // if (eligible) return <span className="text-slate-300 text-xs">—</span>
    return (
      <button onClick={() => onOpen(session)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all">
        <Plus size={12}/> تعويض
      </button>
    )
  }

  const past = isMakeupPast(makeup)
  if (past) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400 line-through">{makeup.date} — {makeup.studentTime}</span>
        <button onClick={() => onOpen(session)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all">
          <Clock size={12}/> تعويض جديد
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 group relative min-w-[130px]">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse"/>
        <span className="text-xs font-semibold text-purple-700">{makeup.day}</span>
      </div>
      <span className="text-xs text-slate-600 font-mono">{makeup.date}</span>
      <span className="text-xs text-slate-500">
        {makeup.studentTime}
        {makeup.teacherTime && makeup.teacherTime !== makeup.studentTime &&
          <span className="text-purple-500"> (مصر: {makeup.teacherTime})</span>}
      </span>
      <button onClick={() => onClearRequest(session.id)}
        className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-all">
        ✕
      </button>
    </div>
  )
}

const EMPTY_FORM = {
  name: '', phone: '', country: '', contactMethod: '',
  teacherId: '', program: '', status: 'trial',
  _hasBeenActive: false,
  trialDate: '', trialTime: '', startDate: '',
  regularDates: [{ day: '', time: '', teacherTime: '', timezone: 'Africa/Cairo' }],
  pauseType: '', pauseUntil: '', notes: '', flagged: false,
}

const PAGE_SIZE = 20

export default function AdminSessions() {
const {
  allSessions, allSessionsLoading, allSessionsError, fetchAllSessions,
  teachers, supervisors, programs,
  addSessionLocal, updateSessionLocal, deleteSessionLocal, toggleFlagLocal, updateMakeupLocal,
    postponeRequests, postponeLoading, resolvePostpone, 
} = useApp()

  // ← كل الحلقات غير المحذوفة، الفلاتر والـ pagination هنا كلهم client-side على الـ array ده
  const liveSessions = useMemo(() => allSessions.filter(s => !s.isDeleted), [allSessions])

  const [search,           setSearch]           = useState('')
  const [filterStatus,     setFilterStatus]     = useState(['all'])
  const [filterTeacher,    setFilterTeacher]    = useState('all')
  const [filterSupervisor, setFilterSupervisor] = useState('all')
  const [filterDay,        setFilterDay]        = useState('all')
  const [filterMonthYear,  setFilterMonthYear]  = useState('')
  const [flaggedOnly,      setFlaggedOnly]      = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editItem,  setEditItem]  = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  const [makeupModal,   setMakeupModal]   = useState(false)
  const [makeupSession, setMakeupSession] = useState(null)
  const [makeupForm,    setMakeupForm]    = useState({ day:'', date:'', studentTime:'', teacherTime:'', timezone:'Africa/Cairo' })

  const [confirm, setConfirm] = useState(null)

  const [showPostpone, setShowPostpone] = useState(false)
  // 1. أضف الـ state ده مع باقي الـ states
const [postponeResolving, setPostponeResolving] = useState(null)

  // ← صفحة العرض الحالية (client-side pagination)
  const [page, setPage] = useState(1)

const sessionsMatchesMonthYear= useMemo(() => {
  if (!filterMonthYear) return liveSessions;
  return liveSessions
    .map((s) => {
      const matchedEntry = s.history?.find(
        (d) => toMonthYear(d.date) === filterMonthYear
      );
      if (!matchedEntry) return null;

      return {
        ...s,
        status: matchedEntry.status, // ← الحالة وقت الشهر المختار
      };
    }).filter(Boolean);
},[liveSessions, filterMonthYear]);

  // ── Filters ── (كلها client-side على liveSessions / allSessions) ──
  const filtered = useMemo(() => {
    const result = (filterMonthYear ? sessionsMatchesMonthYear : liveSessions).filter(s => (
      (!search || s.studentName.toLowerCase()?.includes(search.toLowerCase()) || String(s.sessionNumber.toLowerCase())?.includes(search.toLowerCase())) &&
      (filterStatus.includes('all') || filterStatus.includes(s.status)) &&
      (filterTeacher    === 'all' || s.teacherId    === filterTeacher) &&
      (filterSupervisor === 'all' || s.supervisorId === filterSupervisor) &&
      matchesDay(s, filterDay) &&
      (!flaggedOnly || s.flagged)
    ))

    if (filterDay !== 'all') {
      result.sort((a, b) => {
        const aMatch = matchesDay(a, filterDay) ? 0 : 1
        const bMatch = matchesDay(b, filterDay) ? 0 : 1
        return aMatch - bMatch
      })
    }

    return result
  }, [liveSessions, search, filterStatus, filterTeacher, filterSupervisor, filterDay, filterMonthYear, flaggedOnly])

  // ← كل ما الفلاتر أو البحث يتغيروا، رجّع لأول صفحة
  useEffect(() => { setPage(1) }, [search, filterStatus, filterTeacher, filterSupervisor, filterDay, filterMonthYear, flaggedOnly])

  const totalFiltered = filtered.length
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const safePage       = Math.min(page, totalPages)
  const paginated      = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  const goNextPage = () => setPage(p => Math.min(p + 1, totalPages))
  const goPrevPage = () => setPage(p => Math.max(p - 1, 1))

  // ── CRUD ──
  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setModalOpen(true) }

  const openEdit = (s) => {
    setEditItem(s)
    setForm({
      name:           s.studentName    || '',
      sessionNumber:  s.sessionNumber || '',
      phone:          s.studentPhone   || '',
      country:        s.country        || '',
      contactMethod:  s.contactMethod  || '',
      teacherId:      s.teacherId      || '',
      program:        s.program        || '',
      status:         s.status         || 'trial',
      _hasBeenActive: s._hasBeenActive || ['active','paused','cancelled'].includes(s.status),
      trialDate:      s.trialDate      || '',
      trialTime:      s.trialTime      || '',
      regularDates:   s.regularDates   || [{ day:'', time:'', teacherTime:'', timezone:'Africa/Cairo' }],
      pauseType:      s.pauseType      || '',
      pauseUntil:     s.pauseUntil     || '',
      notes:          s.notes          || '',
      flagged:        s.flagged        || false,
      startDate:      s.startDate      || '',
      cancelledDate:  s.cancelledDate  || '',
    })
    setModalOpen(true)
  }
  const [saving, setSaving] = useState(false)


 const saveSession = async () => {
  if (saving) return          // ← منع الضغط مرتين
  try {
    setSaving(true)
    const teacher = teachers.find(t => t.id === form.teacherId)
    if (editItem) {
      // ← تعديل: قراءة واحدة فقط بعد الكتابة، بدون إعادة جلب كل الحلقات
      await updateSessionLocal(editItem.id, { ...form, makeup: editItem.makeup }, teacher?.name || '')
    } else {
      // ← إضافة: قراءة واحدة فقط بعد الكتابة، بدون إعادة جلب كل الحلقات
      await addSessionLocal(form, teacher?.name || '')
    }
    setModalOpen(false)
  } finally {
    setSaving(false)
  }
}

  const handleDeleteSession  = async (id) => { await deleteSessionLocal(id);         setConfirm(null) }
  const handleToggleFlag     = async (id) => { await toggleFlagLocal(id) }
  const handleClearMakeup    = async (id) => { await updateMakeupLocal(id, null);    setConfirm(null) }

  // ── Makeup ──
  const openMakeup = (s) => {
    setMakeupSession(s)
    setMakeupForm({ day:'', date:'', studentTime:'', teacherTime:'', timezone:'Africa/Cairo' })
    setMakeupModal(true)
  }

  const updateMakeupField = (field, value) => {
    setMakeupForm(p => {
      const updated = { ...p, [field]: value }
      if (field === 'studentTime' || field === 'timezone') {
        updated.teacherTime = calcTeacherTime(
          field === 'studentTime' ? value : updated.studentTime,
          field === 'timezone'    ? value : updated.timezone
        )
      }
      return updated
    })
  }

 // ← تحديث التعويض محليًا بدون إعادة جلب كل الحلقات
const saveMakeup = async () => {
  await updateMakeupLocal(makeupSession.id, { ...makeupForm, confirmed: true })

  if (postponeResolving) {
    await resolvePostpone(postponeResolving, makeupForm.date, makeupForm.studentTime)
    setPostponeResolving(null)
  }

  setMakeupModal(false)
}
  const formValid = !!(form.name?.trim() && form.teacherId && (
    form.status === 'trial'  ? form.trialDate && form.trialTime :
    form.status === 'active' ? form.regularDates?.some(d => d.day && d.time) : true
  ))

  const hasActiveFilters = !filterStatus.includes('all') || filterTeacher !== 'all' || filterSupervisor !== 'all' || filterDay !== 'all' || !!filterMonthYear
  const clearFilters = () => {
    setFilterStatus(['all']); setFilterTeacher('all'); setFilterSupervisor('all')
    setFilterDay('all'); setFilterMonthYear('')
  }

  if (allSessionsLoading && allSessions.length === 0) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2"/>
      جاري التحميل...
    </div>
  )
  if (allSessionsError) return <div className="text-center py-20 text-red-400">⚠️ {allSessionsError}</div>

  return (
    <div dir="rtl" className="space-y-6 font-sans p-6 min-h-screen">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة الحلقات</h1>
          <p className="text-sm text-slate-500 mt-0.5">عرض وتتبع جميع الحلقات الأكاديمية</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm shadow-sm">
          <Calendar size={15} className="text-teal-500"/>
          <span className="font-mono font-semibold text-slate-700">{todayStr()}</span>
          <span className="text-slate-400 text-xs">اليوم</span>
        </div>
      </div>

      {/* Search + Add */}
     
<div className="flex items-center gap-3">
  <div className="relative flex-1">
    <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
      placeholder="بحث باسم الطالب أو رقم الحلقة..."
      className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 text-sm"/>
  </div>

  {/* ← زرار طلبات التأجيل */}
<button
  onClick={() => setShowPostpone(p => !p)}
  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
    showPostpone
      ? 'bg-orange-50 border-orange-300 text-orange-700'
      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
  }`}>
  <Clock size={15}/>
  طلبات التأجيل
  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-lg">
    {postponeRequests.filter(r => r.status === 'pending').length}
  </span>
</button>

  <button onClick={openAdd}
    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all font-medium text-sm whitespace-nowrap">
    <Plus size={16}/> إضافة حلقة
  </button>
</div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400"/>
            <span className="text-xs font-semibold text-slate-500">فلترة:</span>
          </div>

          <MultiFilterSelect value={filterStatus} onChange={setFilterStatus} label="كل الحالات" options={[
            { value:'all', label:'كل الحالات' },
            { value:'trial',     label:'تجريبي' },
            { value:'active',    label:'نشط' },
            { value:'paused',    label:'متوقف' },
            { value:'cancelled', label:'ملغي' },
          ]}/>

          <FilterSelect value={filterTeacher} onChange={setFilterTeacher} options={[
            { value:'all', label:'كل المعلمين' },
            ...teachers.filter(t => !t.isDeleted).map(t => ({ value: t.id, label: t.name.replace('الشيخ ','') }))
          ]}/>

          <FilterSelect value={filterSupervisor} onChange={setFilterSupervisor} options={[
            { value:'all', label:'كل المشرفين' },
            ...supervisors.filter(s => !s.isDeleted).map(s => ({ value: s.id, label: s.name }))
          ]}/>

          <FilterSelect value={filterDay} onChange={setFilterDay} options={[
            { value:'all', label:'كل الأيام' },
            ...DAYS_AR.map(d => ({ value:d, label:d }))
          ]}/>

          {/* فلتر الشهر/السنة — input month، بيتقارن مع cancelledDate / trialDate / startDate حسب حالة كل حلقة */}
          <input
            type="month"
            value={filterMonthYear ? `${filterMonthYear.split('-')[1]}-${filterMonthYear.split('-')[0]}` : ''}
            onChange={e => {
              const val = e.target.value // "YYYY-MM"
              if (!val) { setFilterMonthYear(''); return }
              const [year, month] = val.split('-')
              setFilterMonthYear(`${month}-${year}`)
            }}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-teal-500/20 outline-none shadow-sm cursor-pointer hover:border-slate-300 transition-all"
          />

          <button onClick={() => setFlaggedOnly(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              flaggedOnly ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-200 hover:text-amber-500'
            }`}>
            <Star size={13} className={flaggedOnly ? 'fill-amber-400 text-amber-400' : ''}/> مميزة فقط
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-all font-medium">
              ✕ مسح الفلاتر
            </button>
          )}

          <div className="mr-auto text-xs text-slate-400 font-medium">{filtered.length} حلقة</div>
        </div>
      </div>

{/* طلبات التأجيل */}
{showPostpone && (
  <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
    {postponeRequests.length === 0 ? (
      <div className="p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-orange-400"/>
        </div>
        <p className="text-slate-500 font-medium">لا يوجد طلبات تأجيل</p>
        <p className="text-xs text-slate-400 mt-1">ستظهر هنا طلبات التأجيل عند وصولها</p>
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="bg-orange-50/60 border-b border-orange-100">
            {['الطالب', 'الهاتف', 'المعلم', 'الموعد الأصلي', 'الحالة', 'إجراء'].map(h => (
              <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-orange-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-50">
          {postponeRequests.map(r => (
            <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-700 flex-shrink-0">
                    {r.studentName?.charAt(0) || '؟'}
                  </div>
                  <span className="font-medium text-slate-800 text-sm">{r.studentName || '—'}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{r.studentPhone || '—'}</td>
              <td className="px-4 py-3.5 text-sm text-slate-600">{r.teacherName || '—'}</td>
              <td className="px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-700 font-mono">{r.originalDate}</span>
                  <span className="text-xs text-slate-500 font-mono">{r.originalTime}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span className={`text-xs border px-2.5 py-1 rounded-lg font-semibold ${
                  r.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {r.status === 'pending' ? '⏳ معلّق' : '✓ تم الحل'}
                </span>
                {r.status === 'resolved' && r.newDate && (
                  <div className="text-xs text-green-600 mt-1">
                    {r.newDate} — {r.newTime}
                  </div>
                )}
              </td>
              <td className="px-4 py-3.5">
                {r.status === 'pending' ? (
                <button
  onClick={() => {
    const session = liveSessions.find(s => s.id === r.sessionId)
    setMakeupSession(session || {
      id:            r.sessionId,
      studentName:   r.studentName,
      sessionNumber: '—',
      makeup:        null,
    })
    setMakeupForm({ day:'', date:'', studentTime:'', teacherTime:'', timezone:'Africa/Cairo' })
    setMakeupModal(true)
    setPostponeResolving(r.id)
  }}
  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all">
  <Plus size={12}/> تحديد تعويض
</button>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {['رقم الحلقة','الموعد','الطالب','البلد','المعلم','المشرف','الحالة','التعويض','إجراء'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">🔍</div>
                    <span>لا توجد حلقات مطابقة</span>
                  </div>
                </td></tr>
              )}
              {paginated.map(s => {
                const dateDisplay = s.status === 'trial' ? s.trialDate : filterDay !== 'all' ? filterDay : `${s.regularDates?.[0]?.day?? 'غير محدد'} - ${(s.regularDates?.[1]?.day)?? 'غير محدد' }` || '—'
                const timeDisplay =  s.status === 'trial' ? s.trialTime : filterDay !== 'all'? s.regularDates?.find((d)=> d.day === filterDay).time : `${s.regularDates?.[0]?.time?? 'غير محدد'} - ${s.regularDates?.[1]?.time?? 'غير محدد'}` || ''
                const isToday     = s.trialDate === todayStr()

                return (
                  <tr key={s.id} className={`transition-colors ${s.flagged ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}`}>

                    {/* رقم الحلقة */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        #{s.sessionNumber}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-700 font-mono">{dateDisplay}</span>
                        </div>
                        {timeDisplay && <span className="text-xs text-slate-500 font-mono">{timeDisplay}</span>}
                      </div>
                    </td>

                    {/* الطالب */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                          {s.studentName?.charAt(0) || '؟'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm whitespace-nowrap">{s.studentName || '—'}</div>
                          {s.studentPhone && <div className="text-xs text-slate-400 font-mono">{s.studentPhone}</div>}
                        </div>
                      </div>
                    </td>

                    {/* البلد */}
                    <td className="px-4 py-3.5 text-xs text-slate-500">{s.country || '—'}</td>

                    {/* المعلم */}
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {s.teacherName?.replace('الشيخ ','') || '—'}
                    </td>

                    {/* المشرف */}
                    <td className="px-4 py-3.5">
                      {s.supervisorName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <User size={12} className="text-indigo-500"/>
                          </div>
                          <span className="text-sm text-slate-600 whitespace-nowrap">{s.supervisorName}</span>
                        </div>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                    </td>

                    {/* الحالة */}
                    <td className="px-4 py-3.5">
                      <span className={`text-xs border px-2.5 py-1 rounded-lg font-semibold ${SESSION_STATUS_STYLE[s.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>

                    {/* التعويض */}
                    <td className="px-4 py-3.5 min-w-[140px]">
                      <MakeupCell session={s} onOpen={openMakeup}
                        onClearRequest={(id) => setConfirm({ id, type: 'makeup' })}/>
                    </td>

                    {/* الإجراء */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleToggleFlag(s.id)}
                          className={`p-1.5 rounded-lg transition-all ${s.flagged ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`}>
                          <Star size={14} className={s.flagged ? 'fill-amber-400' : ''}/>
                        </button>
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all">
                          <Pencil size={14}/>
                        </button>
                        <button onClick={() => setConfirm({ id: s.id, type: 'session' })}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

 {/* Pagination — client-side بالكامل على نتيجة الفلترة */}
{totalFiltered > PAGE_SIZE && (
  <div className="flex items-center justify-between px-2">

    {/* معلومات */}
    <p className="text-xs text-slate-400">
      يعرض{' '}
      <span className="font-semibold text-slate-600">
        {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalFiltered)}
      </span>
      {' '}من{' '}
      <span className="font-semibold text-slate-600">{totalFiltered}</span>
      {' '}حلقة
    </p>

    {/* أزرار */}
    <div className="flex items-center gap-2">
      <button
        onClick={goPrevPage}
        disabled={safePage <= 1}
        className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        السابق
      </button>

      {/* رقم الصفحة الحالية بس */}
      <span className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold bg-teal-500 text-white shadow-sm">
        {safePage}
      </span>

      <button
        onClick={goNextPage}
        disabled={safePage >= totalPages}
        className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
        التالي
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </div>
  </div>
)}

      {/* Modal إضافة/تعديل */}
      {modalOpen && (
        <Modal wide
          title={
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${editItem ? 'bg-teal-50 text-teal-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {editItem ? <Pencil size={18}/> : <BookOpen size={18}/>}
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">{editItem ? 'تعديل الحلقة' : 'إضافة حلقة جديدة'}</p>
                {editItem && <p className="text-xs text-slate-500">{editItem.studentName} — #{editItem.sessionNumber}</p>}
              </div>
            </div>
          }
          onClose={() => setModalOpen(false)}>

          <StudentSessionForm
            form={form} setForm={setForm}
            teachers={teachers.filter(t => !t.isDeleted)}
            programs={programs}
            editItem={editItem}
          />

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-sm">
              إلغاء
            </button>
<button
  onClick={saveSession}
  disabled={!formValid || saving}
  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all ${
    formValid && !saving
      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-md'
      : 'bg-slate-300 cursor-not-allowed'
  }`}>
  {saving
    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري الحفظ...</>
    : editItem ? <><Pencil size={14}/> حفظ التعديل</> : <><Plus size={14}/> إضافة الحلقة</>
  }
</button>
          </div>
        </Modal>
      )}

      {/* Modal التعويض */}
     {makeupModal && makeupSession && (
      <MakeupModal
      session={makeupSession}
      form={makeupForm}
      setForm={setMakeupForm}
      onClose={() => setMakeupModal(false)}
      onSave={saveMakeup}
    />
  )}

      {/* Confirm */}
      {confirm && (
        <ConfirmDialog
          message={confirm.type === 'makeup' ? 'هل تريد حذف ميعاد التعويض؟' : 'هل تريد حذف هذه الحلقة نهائياً؟'}
          onConfirm={() => confirm.type === 'makeup' ? handleClearMakeup(confirm.id) : handleDeleteSession(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}