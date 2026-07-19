import { Plus, Trash2 } from 'lucide-react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { DateTime } from 'luxon'
import ct from 'countries-and-timezones'
import { useState } from 'react'


// جيب كل البلاد مرتبة أبجدياً
const ALL_COUNTRIES = Object.values(ct.getAllCountries())
  .map(c => ({
    name: c.name,
    id:   c.id,                    // كود البلد (EG, SA, JP...)
    timezone: c.timezones?.[0],    // أول timezone للبلد
  }))
  .filter(c => c.timezone)
  .sort((a, b) => a.name.localeCompare(b.name))

const inputClass = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

function calcTeacherTime(studentTime, countryCode) {
  if (!studentTime || !countryCode) return ''
  try {
    const country  = ct.getCountry(countryCode)
    const timezone = country?.timezones?.[0]
    if (!timezone) return ''

    const [h, m] = studentTime.split(':').map(Number)

    const studentDt = DateTime.now()
      .set({ hour: h, minute: m, second: 0 })
      .setZone(timezone, { keepLocalTime: true })

    return studentDt.setZone('Africa/Cairo').toFormat('HH:mm')
  } catch { return '' }
}

const weekDays = [
  { label: 'الأحد', number: 0 },
  { label: 'الاثنين', number: 1 },
  { label: 'الثلاثاء', number: 2 },
  { label: 'الأربعاء', number: 3 },
  { label: 'الخميس', number: 4 },
  { label: 'الجمعة', number: 5 },
  { label: 'السبت', number: 6 },
];

function getTimezoneOffset(timezone, date) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate  = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return (tzDate - utcDate) / 60000
}



// ← أضفنا editItem كـ prop
export default function StudentSessionForm({ form, setForm, teachers, programs, editItem }) {
    const [countryCode, setCountryCode] = useState('EG')


  const statusOptions = form._hasBeenActive
    ? [
        { value: 'active',    label: 'نشط',   color: 'bg-emerald-500', desc: 'مواعيد منتظمة' },
        { value: 'paused',    label: 'متوقف', color: 'bg-orange-400',  desc: 'إيقاف مؤقت' },
        { value: 'cancelled', label: 'ملغي',  color: 'bg-red-400',     desc: 'إلغاء' },
      ]
    : [
        { value: 'trial',  label: 'تجريبي', color: 'bg-amber-400',   desc: 'موعد واحد' },
        { value: 'active', label: 'نشط',    color: 'bg-emerald-500', desc: 'مواعيد منتظمة' },
      ]

  const addRegularDate = () => setForm(p => ({
    ...p,
    regularDates: [...(p.regularDates || []), { day: '', time: '', teacherTime: '', timezone: 'Africa/Cairo' }]
  }))

const updateRegularDate = (idx, field, value) => setForm(p => {
  const dates   = [...(p.regularDates || [])]
  const updated = { ...dates[idx], [field]: value }
  if (field === 'time') {
    updated.teacherTime = calcTeacherTime(value, countryCode)
  }
  if(field === 'day'){
    updated.dayNumber = weekDays.find((w)=> w.label === value).number;
  }
    dates[idx] = updated
  return { ...p, regularDates: dates }
})

  const removeRegularDate = (idx) => setForm(p => ({
    ...p, regularDates: p.regularDates.filter((_, i) => i !== idx)
  }))

  return (
    <div className="flex flex-col gap-4">

      {/* ─── بيانات الطالب ─── */}
      <div className="grid grid-cols-2 gap-3">

        {/* الاسم */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            اسم الطالب <span className="text-red-400">*</span>
          </label>
          <input className={inputClass} placeholder="اسم الطالب..." value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>

        {/* رقم الحلقة */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الحلقة</label>
          <input className={inputClass} placeholder=" رقم الحلقه..." type='text' value={form.sessionNumber} onChange={e => setForm(p => ({ ...p, sessionNumber: e.target.value }))}/>
        </div>

        {/* رقم الهاتف + البلد تلقائي */}
         {/* البلد */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">البلد</label>
          <select
            className={inputClass}
            value={countryCode}
            onChange={e => {
              const code    = e.target.value
              const country = ct.getCountry(code)
              setCountryCode(code)
              setForm(p => ({
                ...p,
                country: country?.name || '',
                  trialTeacherTime: calcTeacherTime(p.trialTime, code),  // ← جديد
                // إعادة حساب teacherTime لكل المواعيد
                regularDates: (p.regularDates || []).map(d => ({
                  ...d,
                  teacherTime: calcTeacherTime(d.time, code)
                }))
              }))
            }}>
            {ALL_COUNTRIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {/* عرض الـ timezone */}
          {countryCode && (
            <p className="text-xs text-slate-400 mt-1">
              🕐 {ct.getCountry(countryCode)?.timezones?.[0]}
            </p>
          )}
        </div>

         {/* رقم الهاتف */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">رقم الهاتف</label>
          <PhoneInput
            country={countryCode.toLowerCase()}  // ← بيتزامن مع البلد المختار
            value={form.phone}
            onChange={(phone, countryData) => {
              const code    = countryData.countryCode.toUpperCase()
              const country = ct.getCountry(code)
              setCountryCode(code)
              setForm(p => ({
                ...p,
                phone,
                country: country?.name || countryData.name,
                trialTeacherTime: calcTeacherTime(p.trialTime, code),  // ← جديد
                regularDates: (p.regularDates || []).map(d => ({
                  ...d,
                  teacherTime: calcTeacherTime(d.time, code)
                }))
              }))
            }}
            inputClass="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
          />
        </div>

        {/* وسيلة التواصل */}
        {/* <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            وسيلة التواصل <span className="text-red-400">*</span>
          </label>
          <input
            className={inputClass}
            placeholder=" "
            value={form.contactMethod || ''}                              // ← contactMethod موحد
            onChange={e => setForm(p => ({ ...p, contactMethod: e.target.value }))}
          />
        </div> */}

      </div>

      {/* المعلم + البرنامج */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
            المعلم <span className="text-red-400">*</span>
          </label>
          <select className={inputClass} value={form.teacherId}
            onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}>
            <option value="">اختر معلماً...</option>
            {teachers?.filter(t => !t.isDeleted).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">البرنامج</label>
          <select className={inputClass} value={form.program}
            onChange={e => setForm(p => ({ ...p, program: e.target.value }))}>
            <option value="">اختر برنامجاً...</option>
            {programs?.filter(p => !p.isDeleted).map(pr => (
              <option key={pr.id} value={pr.name}>{pr.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* حالة الطالب */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">حالة الطالب</label>
        <div className={`grid gap-2 ${statusOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {statusOptions.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setForm(p => ({ ...p, status: opt.value }))}
              className={`border-[1.5px] rounded-xl py-3 text-center transition-all ${
                form.status === opt.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}>
              <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${opt.color}`}/>
              <div className={`text-xs font-semibold ${form.status === opt.value ? 'text-teal-700' : 'text-slate-500'}`}>
                {opt.label}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

        {/* تجريبي */}
        {form.status === 'trial' && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-700">📅 موعد الحلقة التجريبية</p>
            <div className="rounded-xl border border-amber-100 bg-white p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">

                {/* التاريخ */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">التاريخ</label>
                  <input type="date" className={inputClass} value={form.trialDate || ''}
                    onChange={e => setForm(p => ({ ...p, trialDate: e.target.value }))} />
                </div>

                {/* وقت الطالب */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    وقت الطالب
                    {form.country && <span className="text-slate-400"> ({form.country})</span>}
                  </label>
                  <input type="time" className={inputClass} value={form.trialTime || ''}
                    onChange={e => {
                      const newTime     = e.target.value
                      const teacherTime = calcTeacherTime(newTime, countryCode)
                      setForm(p => ({ ...p, trialTime: newTime, trialTeacherTime: teacherTime }))
                    }} />
                </div>
              </div>

              {/* وقت المعلم */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  وقت المعلم (مصر) <span className="text-amber-500">⚡ تلقائي</span>
                </label>
                <div className={`${inputClass} bg-amber-50 border-amber-200 flex items-center justify-between`}>
                  {form.trialTeacherTime ? (
                    <>
                      <span className="text-amber-700 font-mono font-semibold">{form.trialTeacherTime}</span>
                      {form.trialTeacherTime !== form.trialTime && (
                        <span className="text-xs text-slate-400">الطالب: {form.trialTime}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs">أدخل وقت الطالب أولاً</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

     
        {/* نشط — مع teacherTime تلقائي */}
      {form.status === 'active' && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-emerald-700">📅 مواعيد الحلقات المنتظمة</p>
           <div>
            <label className="block text-xs text-slate-400 mb-1">  بدايه الانضمام </label>
            <input type='date' className={inputClass} value={form.startDate} onChange={e => setForm((p)=> ({...p, startDate: e.target.value}))}/>
            </div>
 
          {(form.regularDates || []).map((d, idx) => (
            <div key={idx} className="rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">اليوم</label>
                  <select className={inputClass} value={d.day}
                    onChange={e => updateRegularDate(idx, 'day', e.target.value)}>
                    <option value="">اختر اليوم...</option>
                    {weekDays.map(day => (
                      <option key={day.number} value={day.label}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    وقت الطالب
                    {form.country && <span className="text-slate-400"> ({form.country})</span>}
                  </label>
                  <input type="time" className={inputClass} value={d.time}
                    onChange={e => updateRegularDate(idx, 'time', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  وقت المعلم (مصر) <span className="text-emerald-500">⚡ تلقائي</span>
                </label>
                <div className={`${inputClass} bg-emerald-50 border-emerald-200 flex items-center justify-between`}>
                  {d.teacherTime ? (
                    <>
                      <span className="text-emerald-700 font-mono font-semibold">{d.teacherTime}</span>
                      {d.teacherTime !== d.time && (
                        <span className="text-xs text-slate-400">الطالب: {d.time}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs">أدخل وقت الطالب أولاً</span>
                  )}
                </div>
              </div>
              {(form.regularDates || []).length > 1 && (
                <div className="flex justify-end">
                  <button onClick={() => removeRegularDate(idx)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                    <Trash2 size={12}/> حذف
                  </button>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={addRegularDate}
            className="flex items-center justify-center gap-1.5 border border-dashed border-emerald-300 rounded-xl px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-100 transition-all w-full">
            <Plus size={13}/> إضافة موعد آخر
          </button>
        </div>
      )}
    


      {/* متوقف */}
      {form.status === 'paused' && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-orange-700">⏸ نوع الإيقاف</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button"
              onClick={() => setForm(p => ({ ...p, pauseType: 'dated' }))}
              className={`border-[1.5px] rounded-xl py-3 px-4 text-right transition-all ${
                form.pauseType === 'dated' ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'
              }`}>
              <div className="text-xs font-semibold text-orange-700 mb-0.5">📅 متوقف لتاريخ محدد</div>
              <div className="text-xs text-slate-400">سيعود بتاريخ معين</div>
            </button>
            <button type="button"
              onClick={() => setForm(p => ({ ...p, pauseType: 'indefinite' }))}
              className={`border-[1.5px] rounded-xl py-3 px-4 text-right transition-all ${
                form.pauseType === 'indefinite' ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'
              }`}>
              <div className="text-xs font-semibold text-orange-700 mb-0.5">🔄 متوقف مؤقتاً</div>
              <div className="text-xs text-slate-400">بدون تاريخ محدد للعودة</div>
            </button>
          </div>
          {form.pauseType === 'dated' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1"> من</label>
                <input type="date" className={inputClass} value={form.pauseFrom || ''}
                  max={form.pauseUntil || undefined}
                  onChange={e => setForm(p => ({ ...p, pauseFrom: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1"> إلى</label>
                <input type="date" className={inputClass} value={form.pauseUntil || ''}
                  min={form.pauseFrom || undefined}
                  onChange={e => setForm(p => ({ ...p, pauseUntil: e.target.value }))} />
              </div>
            </div>
          )}
        </div>
      )}

      {form.status === 'cancelled' && (
       <div>
       <label className="block text-xs text-slate-500 mb-1">  بدايه تاريخ الإلغاء </label>
       <input type="date" className={inputClass} value={form.cancelledDate || ''}
       onChange={e => setForm(p => ({ ...p, cancelledDate: e.target.value }))} />
       </div>
      )}

      {/* ملاحظات */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">ملاحظات</label>
        <textarea rows={2} placeholder="أي ملاحظات إضافية..."
          className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all resize-none"
          value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </div>

    </div>
    
  )
}