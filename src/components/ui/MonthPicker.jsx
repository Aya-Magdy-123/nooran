import { useState } from 'react'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export function MonthPicker({ value, onChange }) {
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [showCal, setShowCal] = useState(false)

  return (
    <div className="relative">
      {showCal && <div className="fixed inset-0 z-40" onClick={() => setShowCal(false)} />}

      <button
        onClick={() => setShowCal(p => !p)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
          value ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:border-teal-200 hover:text-teal-600'
        }`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        {value ? `${MONTHS_AR[value.month]} ${value.year}` : 'كل الشهور'}
        {value && (
          <span
            onClick={e => { e.stopPropagation(); onChange(null) }}
            className="mr-1 text-teal-400 hover:text-red-500 transition-colors font-bold">
            ✕
          </span>
        )}
      </button>

      {showCal && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCalYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <span className="font-bold text-gray-700 text-sm">{calYear}</span>
            <button onClick={() => setCalYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS_AR.map((m, i) => {
              const isSelected = value?.month === i && value?.year === calYear
              const isToday    = i === new Date().getMonth() && calYear === new Date().getFullYear()
              return (
                <button key={i}
                  onClick={() => { onChange({ month: i, year: calYear }); setShowCal(false) }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSelected ? 'bg-teal-600 text-white shadow-sm'
                    : isToday  ? 'border border-teal-300 text-teal-600 hover:bg-teal-50'
                    : 'hover:bg-gray-100 text-gray-600'
                  }`}>
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}