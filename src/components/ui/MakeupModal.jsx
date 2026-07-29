import { Clock } from 'lucide-react'
import { useState } from 'react'
import { DateTime } from 'luxon'
import ct from 'countries-and-timezones'

const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

const ic = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

// ← نفس قايمة الدول المستخدمة في StudentSessionForm، بكل التايم زونز بتاعة كل دولة
const ALL_COUNTRIES = Object.values(ct.getAllCountries())
  .map(c => ({
    name: c.name,
    id: c.id,
    timezones: c.timezones || [],
  }))
  .filter(c => c.timezones.length)
  .sort((a, b) => a.name.localeCompare(b.name))

// ← رجّع كود الدولة (EG, US...) من اسم التايم زون، عشان نحدد الـ select
//   الافتراضي لما المودال يتفتح على توقيت مخزّن مسبقًا
function getCountryIdFromTimezone(tz) {
  if (!tz) return null
  const tzInfo = ct.getTimezone(tz)
  return tzInfo?.countries?.[0] || null
}

// ← الفرق الحقيقي دلوقتي (بيحسب التوقيت الصيفي/الشتوي أوتوماتيك)
function getCurrentOffsetLabel(timezone) {
  try { return DateTime.now().setZone(timezone).toFormat('ZZ') } catch { return '' }
}

function calcTeacherTime(time, timezone) {
  if (!time || !timezone) return ''
  try {
    const [h, m] = time.split(':').map(Number)
    const studentDt = DateTime.now()
      .set({ hour: h, minute: m, second: 0 })
      .setZone(timezone, { keepLocalTime: true })
    return studentDt.setZone('Africa/Cairo').toFormat('HH:mm')
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
  // ← الدولة والتوقيت بتاعين وقت التعويض — منفصلين عن أي حاجة تانية، بيتحسبوا
  //   مبدئيًا من form.timezone (اللي بقت بتتبعت صح من صفحتي الأدمن والمشرف)
  const [countryId, setCountryId] = useState(() => getCountryIdFromTimezone(form.timezone) || 'EG')
  const [timezoneCode, setTimezoneCode] = useState(form.timezone || 'Africa/Cairo')

  const selectedCountry   = ALL_COUNTRIES.find(c => c.id === countryId)
  const countryTimezones  = selectedCountry?.timezones || []
  const needsRegionSelect = countryTimezones.length > 1 // زي أمريكا/روسيا/كندا

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

  const handleCountryChange = (id) => {
    setCountryId(id)
    const country = ALL_COUNTRIES.find(c => c.id === id)
    const tz = country?.timezones?.[0] || 'Africa/Cairo'
    setTimezoneCode(tz)
    updateField('timezone', tz)
  }

  const handleTimezoneChange = (tz) => {
    setTimezoneCode(tz)
    updateField('timezone', tz)
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

        {/* ← دولة/توقيت الطالب — قابلة للتعديل يدويًا لو محتاج تصحيح التوقيت
            المفترض (مثلاً لو الطالب مسافر أو الدولة الأصلية غلط) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">دولة الطالب</label>
            <select className={ic} value={countryId || ''} onChange={e => handleCountryChange(e.target.value)}>
              <option value="">اختر الدولة...</option>
              {ALL_COUNTRIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {needsRegionSelect ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                المنطقة داخل {selectedCountry?.name}
              </label>
              <select className={ic} value={timezoneCode} onChange={e => handleTimezoneChange(e.target.value)}>
                {countryTimezones.map(tz => {
                  const city = tz.split('/').pop().replace(/_/g, ' ')
                  return (
                    <option key={tz} value={tz}>
                      {city} ({getCurrentOffsetLabel(tz)})
                    </option>
                  )
                })}
              </select>
            </div>
          ) : (
            <div className="flex items-end pb-2.5">
              <p className="text-xs text-slate-400">
                {timezoneCode ? <>🕐 {timezoneCode} (UTC{getCurrentOffsetLabel(timezoneCode)})</> : '—'}
              </p>
            </div>
          )}
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