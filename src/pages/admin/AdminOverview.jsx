// src/pages/admin/AdminOverview.jsx
import { UserX, BookOpen, Clock } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function AdminOverview() {
  const { supervisors, teachers, students, sessions, halaqas, postponeRequests } = useApp()

  // بيانات وهمية لعرض حصص المشرفين بشكل جميل
  const dummySupervisorSessions = [
    {
      supervisorId: 1,
      supervisorName: 'سارة محمود',
      sessions: [
        { id: 101, halaqaName: 'حلقة الفجر', time: '06:00' },
        { id: 102, halaqaName: 'حلقة الضحى', time: '09:00' },
      ]
    },
    {
      supervisorId: 2,
      supervisorName: 'منى حسن',
      sessions: [
        { id: 103, halaqaName: 'حلقة العصر', time: '16:00' },
      ]
    },
    {
      supervisorId: 4,
      supervisorName: 'هبة إبراهيم',
      sessions: [
        { id: 104, halaqaName: 'حلقة التجويد', time: '17:00' },
      ]
    },
  ]

  const today         = '2026-05-31'
  // const todaySessions = sessions.filter(s => s.date === today)
  const todaySessions = [1,2,3];
  const absentSups    = supervisors.filter(s => s.status === 'absent')
  const activeSups    = supervisors.filter(s => s.status !== 'absent')

  const pendingPostpone  = (postponeRequests || []).filter(r => r.status === 'pending')
  const resolvedPostpone = (postponeRequests || []).filter(r => r.status === 'resolved')

  const noshowSessions = sessions.filter(s => s.status === 'noshow')

  return (
    <div className="flex flex-col gap-7">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-dark">لوحة التحكم</h1>
        <p className="text-sm text-gray-400 mt-0.5">الأحد، 31 مايو 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'مشرفون نشطون', value: activeSups.length },
          { label: 'معلمون',        value: teachers.length },
          { label: 'طلاب',          value: students.length },
          { label: 'حصص اليوم',    value: todaySessions.length, accent: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className={`text-3xl font-bold mb-1 ${s.accent ? 'text-brand-primary' : 'text-brand-dark'}`}>{s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Absent alert */}
      {absentSups.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <UserX size={15} className="shrink-0"/>
          <span><strong>غائبون اليوم:</strong> {absentSups.map(s => s.name).join('، ')}</span>
        </div>
      )}

      {/* Row 1: supervisor detailed sessions (dummy) + postpone requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Supervisor detailed load with dummy data */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">توزيع الحصص — اليوم</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">حصص المشرفين</span>
          </div>
          <div className="flex flex-col gap-5">
            {dummySupervisorSessions.map(sup => (
              <div key={sup.supervisorId} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-sm">
                      {sup.supervisorName.charAt(0)}
                    </div>
                    <span className="font-semibold text-brand-dark">{sup.supervisorName}</span>
                  </div>
                  <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                    {sup.sessions.length} حصة
                  </span>
                </div>
                {sup.sessions.length === 0 ? (
                  <p className="text-xs text-gray-400 pr-9">لا توجد حصص اليوم</p>
                ) : (
                  <div className="pr-9 space-y-2 mt-1">
                    {sup.sessions.map(sess => (
                      <div key={sess.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-brand-primary" />
                          <span className="font-medium text-gray-800">{sess.halaqaName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Clock size={12} />
                          <span>{sess.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {activeSups.length === 0 && (
              <p className="text-sm text-gray-300 text-center py-4">لا يوجد مشرفون حاضرون</p>
            )}
          </div>
        </div>

        {/* Postpone requests (unchanged) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">طلبات التأجيل</h2>
            {pendingPostpone.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                {pendingPostpone.length} معلّق
              </span>
            )}
          </div>
          {(postponeRequests || []).length === 0 && (
            <p className="text-sm text-gray-300 text-center py-6">لا توجد طلبات</p>
          )}
          <div className="flex flex-col divide-y divide-gray-50">
            {[...pendingPostpone, ...resolvedPostpone].slice(0, 6).map(r => {
              const student   = students.find(s => s.id === r.studentId)
              const isPending = r.status === 'pending'
              return (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>{student?.name?.[0] || '؟'}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-brand-dark truncate">{student?.name || '—'}</div>
                      <div className="text-xs text-gray-400">{r.originalDate} · {r.reason}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isPending ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {isPending ? 'معلّق' : 'تم الحل'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Row 2: noshow sessions (unchanged) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500">الحلقات المرفوضة (غياب)</h2>
          {noshowSessions.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
              {noshowSessions.length} حصة
            </span>
          )}
        </div>

        {noshowSessions.length === 0 && (
          <p className="text-sm text-gray-300 text-center py-6">لا توجد حلقات مرفوضة</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {noshowSessions.map(sess => {
            const student = students.find(s => s.id === sess.studentId)
            const halaqa  = (halaqas || []).find(h => h.id === sess.halaqaId)
            const teacher = teachers.find(t => t.id === sess.teacherId)
            return (
              <div key={sess.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-500 shrink-0">
                  {student?.name?.[0] || '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-dark truncate">{student?.name || '—'}</span>
                    <span className="text-xs text-gray-400 font-mono shrink-0">{student?.halaqaNo}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {halaqa?.name || '—'}
                    {teacher ? ` · ${teacher.name.replace('الشيخ ', '')}` : ''}
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className="text-xs font-mono text-gray-500">{student?.phone}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 justify-end">
                    <Clock size={10}/>{sess.time} · {sess.date}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}