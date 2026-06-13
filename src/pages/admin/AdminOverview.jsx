import { UserX, BookOpen, Clock, CalendarClock } from 'lucide-react'
import { useApp } from '../../context/AppContext'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function formatArabicDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${DAYS_AR[d.getDay()]}، ${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`
}

// ── Dummy Data طلبات التأجيل ──────────────────────────────────
const DUMMY_POSTPONE = [
  {
    id: 1,
    studentName:  'أحمد محمود',
    studentPhone: '01000000010',
    teacherName:  'الشيخ كريم',
    originalDate: '2026-06-13',
    originalTime: '14:00',
    reason:       'ظروف عائلية',
    status:       'pending',
    createdAt:    '2026-06-12',
  },
  {
    id: 2,
    studentName:  'فاطمة علي',
    studentPhone: '01000000011',
    teacherName:  'الشيخ طارق',
    originalDate: '2026-06-13',
    originalTime: '15:30',
    reason:       'سفر',
    status:       'pending',
    createdAt:    '2026-06-12',
  },
  {
    id: 3,
    studentName:  'يوسف حسن',
    studentPhone: '01000000012',
    teacherName:  'الشيخ أحمد',
    originalDate: '2026-06-11',
    originalTime: '10:00',
    reason:       'مرض',
    status:       'resolved',
    newDate:      '2026-06-15',
    newTime:      '10:00',
    createdAt:    '2026-06-10',
  },
]

export default function AdminOverview() {
  const { supervisors, teachers, sessions } = useApp()

  const today      = todayStr()
  const todayDayAr = DAYS_AR[new Date().getDay()]

  const absentSups = supervisors.filter(s => s.status === 'absent' && !s.isDeleted)
  const activeSups = supervisors.filter(s => s.status !== 'absent' && !s.isDeleted)

  const todaySessions = sessions.filter(s => {
    if (s.status === 'trial')  return s.trialDate === today
    if (s.status === 'active') return s.regularDates?.some(d => d.day === todayDayAr)
    return false
  })

  const noshowSessions = sessions.filter(s => s.status === 'cancelled')

  const supervisorSessions = activeSups.map(sup => {
    const supSessions = todaySessions
      .filter(s => s.supervisorId === sup.id)
      .map(s => ({
        id:          s.id,
        studentName: s.studentName || '—',
        time:        s.trialTime || s.regularDates?.find(d => d.day === todayDayAr)?.time || '—',
        status:      s.status,
      }))
    return { supervisorId: sup.id, supervisorName: sup.name, sessions: supSessions }
  }).filter(sup => sup.sessions.length > 0)

  const pendingPostpone  = DUMMY_POSTPONE.filter(r => r.status === 'pending')
  const resolvedPostpone = DUMMY_POSTPONE.filter(r => r.status === 'resolved')

  return (
    <div className="flex flex-col gap-7">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-dark">لوحة التحكم</h1>
        <p className="text-sm text-gray-400 mt-0.5">{formatArabicDate(today)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'مشرفون نشطون', value: activeSups.length },
          { label: 'معلمون',        value: teachers.filter(t => !t.isDeleted).length },
          { label: 'طلاب',          value: sessions.filter(s => !s.isDeleted).length },
          { label: 'حلقات اليوم',  value: todaySessions.length, accent: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className={`text-3xl font-bold mb-1 ${s.accent ? 'text-brand-primary' : 'text-brand-dark'}`}>{s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Absent alert */}
      {absentSups.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <UserX size={15} className="shrink-0 mt-0.5"/>
          <div className="flex flex-col gap-2 w-full">
            <span className="font-semibold">غائبون اليوم ({absentSups.length})</span>
            <div className="flex flex-wrap gap-2">
              {absentSups.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-white border border-red-100 rounded-xl px-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-500">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-red-700">{s.name}</div>
                    <div className="text-xs text-red-400">
                      {s.shift === 'morning' ? '🌅 4ص - 12ظ' : s.shift === 'afternoon' ? '🌞 12ظ - 8م' : '🌙 8م - 4ص'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* توزيع الحلقات */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">توزيع الحلقات — اليوم</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {todaySessions.length} حلقة
            </span>
          </div>
          {supervisorSessions.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-6">لا توجد حلقات موزعة اليوم</p>
          ) : (
            <div className="flex flex-col gap-5">
              {supervisorSessions.map(sup => (
                <div key={sup.supervisorId} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                        {sup.supervisorName.charAt(0)}
                      </div>
                      <span className="font-semibold text-brand-dark">{sup.supervisorName}</span>
                    </div>
                    <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                      {sup.sessions.length} حلقة
                    </span>
                  </div>
                  <div className="pr-9 space-y-2 mt-1">
                    {sup.sessions.map(sess => (
                      <div key={sess.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-brand-primary"/>
                          <span className="font-medium text-gray-800">{sess.studentName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Clock size={12}/> {sess.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* إحصائيات الحلقات */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">إحصائيات الحلقات</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'نشطة',    value: sessions.filter(s => s.status === 'active'    && !s.isDeleted).length, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'تجريبية', value: sessions.filter(s => s.status === 'trial'     && !s.isDeleted).length, color: 'bg-amber-50 text-amber-700' },
              { label: 'متوقفة',  value: sessions.filter(s => s.status === 'paused'    && !s.isDeleted).length, color: 'bg-orange-50 text-orange-700' },
              { label: 'ملغية',   value: sessions.filter(s => s.status === 'cancelled' && !s.isDeleted).length, color: 'bg-red-50 text-red-600' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
          {sessions.filter(s => !s.supervisorId && !s.isDeleted).length > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5 text-xs text-yellow-700 font-medium">
              ⚠️ {sessions.filter(s => !s.supervisorId && !s.isDeleted).length} حلقة بدون مشرف — يحتاج توزيع
            </div>
          )}
        </div>
      </div>

      {/* طلبات التأجيل */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-amber-500"/>
            <h2 className="text-sm font-semibold text-gray-500">طلبات التأجيل</h2>
          </div>
          <div className="flex items-center gap-2">
            {pendingPostpone.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                {pendingPostpone.length} معلّق
              </span>
            )}
            {resolvedPostpone.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                {resolvedPostpone.length} تم حله
              </span>
            )}
          </div>
        </div>

        {DUMMY_POSTPONE.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-6">لا توجد طلبات تأجيل</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {/* المعلقة أولاً */}
            {[...pendingPostpone, ...resolvedPostpone].map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {r.studentName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-brand-dark truncate">{r.studentName}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-gray-400">{r.teacherName}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400 font-mono">{r.originalDate} — {r.originalTime}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{r.reason}</span>
                    </div>
                    {/* لو اتحل — عرض الموعد الجديد */}
                    {r.status === 'resolved' && r.newDate && (
                      <div className="text-xs text-green-600 font-medium mt-0.5">
                        ✓ موعد جديد: {r.newDate} — {r.newTime}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  r.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {r.status === 'pending' ? '⏳ معلّق' : '✓ تم الحل'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الحلقات الملغية */}
      {noshowSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">الحلقات الملغية</h2>
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
              {noshowSessions.length} حلقة
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {noshowSessions.slice(0, 6).map(sess => (
              <div key={sess.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-500 shrink-0">
                  {sess.studentName?.charAt(0) || '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-brand-dark truncate">{sess.studentName || '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{sess.teacherName || '—'}</div>
                </div>
                <div className="text-left shrink-0">
                  <div className="text-xs font-mono text-gray-500">{sess.studentPhone}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 justify-end">
                    <Clock size={10}/>
                    {sess.trialTime || sess.regularDates?.[0]?.time || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}