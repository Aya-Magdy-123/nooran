import { Clock } from 'lucide-react'
import { useState } from 'react'

const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

const ic = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

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

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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

export default function MakeupModal({ session, form, setForm, onClose, onSave }) {
  const updateField = (field, value) => {
    setForm(p => {
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

const [loading, setLoading] = useState(false)

const handleOnSave = async () => {
  setLoading(true)
  try {
    await onSave()
  } finally {
    setLoading(false)
  }
}

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Clock size={18}/></div>
          <div>
            <p className="text-base font-bold text-slate-800">حصة تعويض</p>
            <p className="text-xs text-slate-500">{session?.studentName} — #{session?.sessionNumber}</p>
          </div>
        </div>
      }
      onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">اليوم</label>
            <select className={ic} value={form.day} onChange={e => updateField('day', e.target.value)}>
              <option value="">اختر اليوم...</option>
              {DAYS_AR.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">التاريخ</label>
            <input type="date" className={ic} value={form.date}
              onChange={e => updateField('date', e.target.value)}/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">وقت الطالب</label>
            <input type="time" className={ic} value={form.studentTime}
              onChange={e => updateField('studentTime', e.target.value)}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              توقيت مصر <span className="text-purple-500 font-normal">⚡ تلقائي</span>
            </label>
            <div className={`${ic} bg-purple-50/70 border-purple-200 text-purple-700 font-mono`}>
              {form.teacherTime || <span className="text-slate-400 font-normal text-xs">يُحسب تلقائياً</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button onClick={onClose}
          className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm">إلغاء</button>
        <button onClick={()=> handleOnSave()  } disabled={!form.date || !form.studentTime}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all ${
            form.date && form.studentTime
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:shadow-md'
              : 'bg-slate-300 cursor-not-allowed'
          }
          ${loading && "bg-purple-200"}`}>
          <Clock size={14}/> {loading? "جاري التأكيد" : "تأكيد التعويض"} 

        </button>
      </div>
    </Modal>
  )
}