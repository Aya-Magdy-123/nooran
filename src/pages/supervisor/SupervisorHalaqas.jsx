// src/pages/supervisor/SupervisorHalaqas.jsx
import { useState } from 'react'
import { BookOpen, Clock, Users, ChevronDown, ChevronUp, Phone, CheckCircle, XCircle, Clock as ClockIcon, HelpCircle, User } from 'lucide-react'
import { PageHeader } from '../../components/ui'
// import { DAY_NAMES } from '../../data/mockData'

// بيانات وهمية حلقات المشرف اليوم
const DUMMY_HALAQA_GROUPS = [
  {
    halaqaId: 1,
    halaqaName: 'تجويد ',
    teacherName: 'الشيخ كريم عبد الله',
    time: '06:00',
    students: [
      { id: 101, name: 'أحمد محمود', phone: '01000000010', status: 'مؤكد' },
      { id: 102, name: 'يوسف حسن',   phone: '01000000012', status: 'ملغي' },
      { id: 103, name: 'زينب علي',   phone: '01000000018', status: 'طلب تأجيل' },
    ]
  },
  {
    halaqaId: 2,
    halaqaName: ' فقه',
    teacherName: 'الشيخ كريم عبد الله',
    time: '09:00',
    students: [
      { id: 201, name: 'عمر خالد',    phone: '01000000014', status: 'مؤكد' },
      { id: 202, name: 'ليلى محمد',   phone: '01000000019', status: 'طلب تأجيل' },
      { id: 203, name: 'عبد الله سعيد', phone: '01000000020', status: 'لم يحدد بعد' },
    ]
  },
  {
    halaqaId: 3,
    halaqaName: ' حفظ',
    teacherName: 'الشيخ طارق السيد',
    teacherPhone: '01110000002',
    time: '16:00',
    students: [
      { id: 301, name: 'فاطمة علي',   phone: '01000000011', status: 'مؤكد' },
      { id: 302, name: 'مريم إبراهيم', phone: '01000000013', status: 'ملغي' },
    ]
  }
]

// دالة لعرض البادج المناسب حسب الحالة
const StatusBadge = ({ status }) => {
  const config = {
    'مؤكد':     { icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200', label: 'مؤكد' },
    'ملغي':     { icon: XCircle,      className: 'bg-red-50 text-red-600 border-red-200',    label: 'ملغي' },
    'طلب تأجيل': { icon: ClockIcon,   className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'طلب تأجيل' },
    'لم يحدد بعد': { icon: HelpCircle, className: 'bg-gray-50 text-gray-500 border-gray-200', label: 'لم يحدد بعد' }
  }
  const { icon: Icon, className, label } = config[status] || config['لم يحدد بعد']
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

export default function SupervisorHalaqas() {
  const [expanded, setExpanded] = useState({})

  const today = '2026-05-31'
  const todayDayIndex = new Date(today).getDay()

  // حساب الإحصائيات لكل حلقة
  const getStats = (students) => {
    const confirmed = students.filter(s => s.status === 'مؤكد').length
    const cancelled = students.filter(s => s.status === 'ملغي').length
    const postponed = students.filter(s => s.status === 'طلب تأجيل').length
    const pending   = students.filter(s => s.status === 'لم يحدد بعد').length
    return { confirmed, cancelled, postponed, pending }
  }

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div dir="rtl" className="space-y-8 font-sans">
     

      {DUMMY_HALAQA_GROUPS.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-teal-400" />
          </div>
          <p className="text-gray-400 font-medium">لا توجد حلقات موزعة عليك اليوم</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {DUMMY_HALAQA_GROUPS.map(halaqa => {
          const isOpen = expanded[halaqa.halaqaId] !== false
          const { confirmed, cancelled, postponed, pending } = getStats(halaqa.students)

          return (
            <div key={halaqa.halaqaId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors text-right"
                onClick={() => toggleExpand(halaqa.halaqaId)}
              >
                <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
      <BookOpen size={20} className="text-teal-600" />
    </div>
    <div>
      <div className="font-bold text-gray-800 text-lg text-right">
        {halaqa.halaqaName}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={11}/> {halaqa.time}
        </span>
        <span className="flex items-center gap-1">
          <Users size={11}/> {halaqa.students.length} طالب
        </span>
        <span className="flex items-center gap-1">
          <User size={11}/>
          {halaqa.teacherName}
        </span>
      </div>

      {/* أسماء الطلاب لما الكولابس مقفول */}
      {!isOpen && (
        <div className="flex flex-col gap-1 mt-2">
          {halaqa.students.map(student => (
            <span key={student.id} className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"/>
              {student.name}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>

                <div className="flex items-center gap-3 self-start md:self-center">
                  <div className="flex gap-2">
                    {confirmed > 0 && (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-xl font-semibold">
                        {confirmed} مؤكد
                      </span>
                    )}
                    {cancelled > 0 && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-xl font-semibold">
                        {cancelled} ملغي
                      </span>
                    )}
                    {postponed > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-xl font-semibold">
                        {postponed} تأجيل
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-xl font-semibold">
                        {pending} لم يحدد
                      </span>
                    )}
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isOpen ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </div>
                </div>
              </button>

              {/* Students list (without halaqaNo column) */}
              {isOpen && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الطالب</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الهاتف</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {halaqa.students.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                                {student.name[0]}
                              </div>
                              <span className="font-medium text-gray-800">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                            <div className="flex items-center gap-1">
                              <Phone size={12} className="text-gray-400" />
                              {student.phone}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={student.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}