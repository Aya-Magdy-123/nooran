import { useState, useEffect } from 'react'
import {
  BookOpen, Clock, Users, ChevronDown, ChevronUp,
  Phone, CheckCircle, XCircle, Clock as ClockIcon,
  HelpCircle, RefreshCw, Pencil, X, Save
} from 'lucide-react'
import StudentSessionForm from '../../components/ui/StudentSessionForm'

const BASE = "http://localhost:5000/api"

// ─── Status Badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    'active':    { icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200',    label: 'نشط' },
    'trial':     { icon: ClockIcon,   className: 'bg-amber-50 text-amber-700 border-amber-200',    label: 'تجريبي' },
    'paused':    { icon: ClockIcon,   className: 'bg-orange-50 text-orange-700 border-orange-200', label: 'متوقف' },
    'cancelled': { icon: XCircle,     className: 'bg-red-50 text-red-600 border-red-200',          label: 'ملغي' },
  }
  const cfg = config[status] || { icon: HelpCircle, className: 'bg-gray-50 text-gray-500 border-gray-200', label: status }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

// ─── Map session → form shape (زي AdminSessions) ───────────────
const sessionToForm = (s) => ({
  name:            s.studentName    || '',
  phone:           s.studentPhone   || '',
  country:         s.country        || '',
  contactMethod:   s.contactMethod  || '',
  teacherId:       s.teacherId      || '',
  program:         s.program        || '',
  status:          s.status         || 'trial',
  trialDate:       s.trialDate      || '',
  trialTime:       s.trialTime      || '',
  trialTeacherTime:s.trialTeacherTime|| '',
  regularDates:    s.regularDates   || [],
  pauseType:       s.pauseType      || '',
  pauseUntil:      s.pauseUntil     || '',
  notes:           s.notes          || '',
  flagged:         s.flagged        || false,
  makeup:          s.makeup         ?? null,
  _hasBeenActive:  ['active','paused','cancelled'].includes(s.status),
})

// ─── Edit Modal ─────────────────────────────────────────────────
function EditModal({ session, teachers, programs, onClose, onSave }) {
  const [form, setForm]     = useState(sessionToForm(session))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      const teacher     = teachers?.find(t => t.id === form.teacherId)
      const teacherName = teacher?.name || session.teacherName || ''

      await fetch(`${BASE}/sessions/${session.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName:   form.name,
          studentPhone:  form.phone,
          country:       form.country       || '',
          contactMethod: form.contactMethod || '',
          teacherId:     form.teacherId     || null,
          teacherName,
          program:       form.program       || '',
          status:        form.status,
          trialDate:     form.trialDate     || '',
          trialTime:     form.trialTime     || '',
          trialTeacherTime: form.trialTeacherTime || '',
          regularDates:  form.regularDates  || [],
          pauseType:     form.pauseType     || '',
          pauseUntil:    form.pauseUntil    || '',
          notes:         form.notes         || '',
          flagged:       form.flagged       || false,
          makeup:        form.makeup        ?? null,
        }),
      })
      await onSave()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
           dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">تعديل الحلقة</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              #{session.sessionNumber} — {session.studentName}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StudentSessionForm
            form={form}
            setForm={setForm}
            teachers={teachers}
            programs={programs}
            editItem={session}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            إلغاء
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white rounded-xl transition-all shadow-sm">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────
export default function SupervisorHalaqas({ teachers, programs }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [expanded, setExpanded] = useState({})
  const [editSession, setEditSession] = useState(null)   // ← الحلقة اللي بنعدلها

  const supervisorId = localStorage.getItem('uid')

  const fetchSessions = async () => {
    try {
      setLoading(true); setError(null)
      const res  = await fetch(`${BASE}/sessions/supervisor/${supervisorId}`)
      if (!res.ok) throw new Error('فشل تحميل الحلقات')
      setSessions(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (supervisorId) fetchSessions() }, [supervisorId])

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  // تجميع الحلقات حسب المعلم + الوقت
  const grouped = sessions.reduce((acc, s) => {
    const key = `${s.teacherId}_${s.trialTime || s.regularDates?.[0]?.time || ''}`
    if (!acc[key]) acc[key] = {
      key,
      teacherName: s.teacherName || '—',
      time:        s.trialTime || s.regularDates?.[0]?.time || '—',
      sessions:    [],
    }
    acc[key].sessions.push(s)
    return acc
  }, {})

  const groups = Object.values(grouped).sort((a, b) => a.time.localeCompare(b.time))

  const getStats = (sess) => ({
    active:    sess.filter(s => s.status === 'active').length,
    trial:     sess.filter(s => s.status === 'trial').length,
    paused:    sess.filter(s => s.status === 'paused').length,
    cancelled: sess.filter(s => s.status === 'cancelled').length,
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2" />
      جاري تحميل الحلقات...
    </div>
  )

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-3">⚠️ {error}</p>
      <button onClick={fetchSessions} className="text-sm text-teal-600 hover:underline">
        إعادة المحاولة
      </button>
    </div>
  )

  return (
    <div dir="rtl" className="space-y-5 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">حلقاتي</h2>
          <p className="text-sm text-gray-500 mt-0.5">{sessions.length} حلقة مخصصة لك</p>
        </div>
        <button onClick={fetchSessions}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* Empty */}
      {groups.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-teal-400" />
          </div>
          <p className="text-gray-400 font-medium">لا توجد حلقات موزعة عليك حالياً</p>
        </div>
      )}

      {/* Groups */}
      <div className="flex flex-col gap-4">
        {groups.map(group => {
          const isOpen = expanded[group.key] === true
          const stats  = getStats(group.sessions)

          return (
            <div key={group.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Group Header */}
              <button
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors text-right"
                onClick={() => toggleExpand(group.key)}>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-base">{group.teacherName}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={11} /> {group.time}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {group.sessions.length} حلقة</span>
                    </div>

                    {!isOpen && (
                      <div className="flex flex-col gap-1 mt-2">
                        {group.sessions.slice(0, 3).map(s => (
                          <span key={s.id} className="text-xs text-gray-500 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                            {s.studentName}
                            {s.studentPhone && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Phone size={11} /> {s.studentPhone}
                              </span>
                            )}
                          </span>
                        ))}
                        {group.sessions.length > 3 && (
                          <span className="text-xs text-gray-400 mr-4">
                            +{group.sessions.length - 3} أخرى...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-center">
                  <div className="flex gap-2 flex-wrap">
                    {stats.active    > 0 && <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-xl font-semibold">{stats.active} نشط</span>}
                    {stats.trial     > 0 && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-xl font-semibold">{stats.trial} تجريبي</span>}
                    {stats.paused    > 0 && <span className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-xl font-semibold">{stats.paused} متوقف</span>}
                    {stats.cancelled > 0 && <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-xl font-semibold">{stats.cancelled} ملغي</span>}
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isOpen ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Table */}
              {isOpen && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="bg-gray-50/80">
                        {['رقم الحلقة','الطالب','الهاتف','البلد','وسيلة التواصل','الموعد','الحالة',''].map((h, i) => (
                          <th key={i} className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.sessions.map(s => {
                        const dateDisplay = s.trialDate || s.regularDates?.[0]?.day || '—'
                        const timeDisplay = s.trialTime || s.regularDates?.[0]?.time || ''
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">

                            <td className="px-5 py-4">
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                #{s.sessionNumber}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                                  {s.studentName?.charAt(0) || '؟'}
                                </div>
                                <span className="font-medium text-gray-800">{s.studentName || '—'}</span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                              {s.studentPhone
                                ? <span className="flex items-center gap-1"><Phone size={11} /> {s.studentPhone}</span>
                                : '—'}
                            </td>

                            <td className="px-5 py-4 text-xs text-gray-500">{s.country || '—'}</td>

                            <td className="px-5 py-4 text-xs text-gray-500">{s.contactMethod || '—'}</td>

                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-700 font-mono">{dateDisplay}</span>
                                {timeDisplay && <span className="text-xs text-gray-400 font-mono">{timeDisplay}</span>}
                              </div>
                            </td>

                            <td className="px-5 py-4"><StatusBadge status={s.status} /></td>

                            {/* ── زرار التعديل ── */}
                            <td className="px-4 py-4">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditSession(s) }}
                                title="تعديل الحلقة"
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                <Pencil size={14} />
                              </button>
                            </td>

                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editSession && (
        <EditModal
          session={editSession}
          teachers={teachers}
          programs={programs}
          onClose={() => setEditSession(null)}
          onSave={fetchSessions}
        />
      )}

    </div>
  )
}