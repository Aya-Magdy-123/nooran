// src/pages/supervisor/SupervisorPostpone.jsx
import { useState } from 'react'
import { CalendarCheck, BookOpen, Clock, AlertCircle, Filter, Plus } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Modal, Badge, PageHeader, EmptyState } from '../../components/ui'
// import { DAY_NAMES } from '../../data/mockData'

const MY_SUPERVISOR_ID = 1
const DAYS_SHORT = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']

const FILTER_OPTS = [
  { value: 'all',      label: 'الكل' },
  { value: 'pending',  label: 'قيد الانتظار' },
  { value: 'resolved', label: 'تم الحل' },
]

export default function SupervisorPostpone() {
  const { postponeRequests, students, halaqas, teachers, sessions, resolvePostpone } = useApp()
  const [filter, setFilter]         = useState('pending')
  const [schedModal, setSchedModal] = useState(null)
  const [newDate, setNewDate]       = useState('')
  const [newTime, setNewTime]       = useState('')

  const myHalaqaIds = [...new Set(
    sessions.filter(s => s.supervisorId === MY_SUPERVISOR_ID).map(s => s.halaqaId)
  )]
  const myStudentIds = students.filter(s => myHalaqaIds.includes(s.halaqaId)).map(s => s.id)
  const myRequests   = postponeRequests.filter(r => myStudentIds.includes(r.studentId))
  const filtered     = myRequests.filter(r => filter === 'all' || r.status === filter)

  const openModal = (req) => {
    const student = students.find(s => s.id === req.studentId)
    const halaqa  = halaqas.find(h => h.id === req.halaqaId || h.id === student?.halaqaId)
    setSchedModal({ ...req, student, halaqa })
    setNewDate('2026-06-01')
    setNewTime(halaqa?.time || '15:00')
  }

  const handleResolve = () => {
    resolvePostpone(schedModal.id, newDate, newTime)
    setSchedModal(null)
  }

  return (
    <div dir="rtl" className="space-y-8 font-sans">
      <PageHeader
        title="طلبات التأجيل"
        subtitle="طلاب حلقاتك الذين طلبوا تأجيل حصتهم"
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
          <Filter size={14}/> الحالة:
        </span>
        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
          {FILTER_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === opt.value
                  ? 'bg-white text-teal-700 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-teal-600'
              }`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck size={24} className="text-teal-400" />
          </div>
          <p className="text-gray-400 font-medium">لا توجد طلبات تأجيل</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {filtered.map(req => {
          const student = students.find(s => s.id === req.studentId)
          const halaqa  = halaqas.find(h => h.id === req.halaqaId || h.id === student?.halaqaId)
          const teacher = halaqa ? teachers.find(t => t.id === halaqa.teacherId) : null

          return (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">

                  {/* Student info */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {student?.name?.[0] || '؟'}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{student?.name || '—'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{student?.halaqaNo}</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1 rounded-xl">
                      <AlertCircle size={11}/> لديه حصة مؤجلة
                    </div>
                    <Badge status={req.status} />
                  </div>

                  {/* Halaqa info */}
                  {halaqa && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-4 py-2.5 rounded-xl w-fit">
                      <BookOpen size={12} className="text-teal-500"/>
                      <span className="font-semibold text-gray-700">{halaqa.name}</span>
                      <span className="text-gray-300">·</span>
                      <Clock size={11}/>
                      <span>{halaqa.days.map(d => DAYS_SHORT[d]).join('، ')} — {halaqa.time}</span>
                      {teacher && <><span className="text-gray-300">·</span><span>{teacher.name}</span></>}
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-xs text-gray-400 block mb-1">الموعد الأصلي</span>
                      <span className="font-semibold text-gray-700 text-sm">{req.originalDate} — {req.originalTime}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-xs text-gray-400 block mb-1">سبب التأجيل</span>
                      <span className="text-gray-700 text-sm">{req.reason || '—'}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-xs text-gray-400 block mb-1">تاريخ الطلب</span>
                      <span className="text-gray-600 text-sm">{req.requestDate}</span>
                    </div>
                    {req.status === 'resolved' && (
                      <div className="bg-green-50 rounded-xl px-4 py-3">
                        <span className="text-xs text-green-600 block mb-1">الحصة البديلة</span>
                        <span className="font-semibold text-green-700 text-sm">{req.newDate} — {req.newTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <button
                    onClick={() => openModal(req)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all font-medium text-sm whitespace-nowrap flex-shrink-0"
                  >
                    <CalendarCheck size={15}/> تحديد حصة بديلة
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {schedModal && (
        <Modal
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <CalendarCheck size={20} />
              </div>
              <span className="text-xl font-bold text-gray-800">
                حصة بديلة — {schedModal.student?.name}
              </span>
            </div>
          }
          onClose={() => setSchedModal(null)}
          wide
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={14}/>
              الحصة المؤجلة: {schedModal.originalDate} الساعة {schedModal.originalTime}
            </div>
            {schedModal.halaqa && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                <BookOpen size={12}/>
                مواعيد الحلقة الأصلية: {schedModal.halaqa.days.map(d => DAYS_SHORT[d]).join('، ')} — {schedModal.halaqa.time}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  التاريخ <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  الوقت <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm"
                onClick={() => setSchedModal(null)}
              >إلغاء</button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium"
                onClick={handleResolve}
              >
                <CalendarCheck size={15}/> تأكيد الحصة البديلة
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}