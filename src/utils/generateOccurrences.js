// ═══════════════════════════════════════════════════════════════
// src/utils/generateOccurrences.js
//
// توليد "حصص" (occurrences) بشكل ديناميكي فوق بيانات الحلقات (sessions)
// الحالية، بدون تغيير أي Firestore schema موجود.
//
// - الحلقات الـ active بتعتبر لا نهائية: مفيش تخزين لكل حصة في Firestore.
// - بس الحصص "المعدَّلة" (ملغاة/غياب/مؤجلة/تعويض/مؤكدة يدويًا، أو اللي
//   اتعمل لها snapshot للمشرف/المعلم) بتتخزن في Collection جديدة اسمها
//   sessionOccurrences (عبر occurrencesService.js).
// - كل حصة بيتبعت عنها رسالة واتساب للطالب، وردّه هو اللي بيحدد حالتها
//   الحقيقية: هيحضر (confirmed) / لن يحضر (absent) / هيطلب تعويض (postponed).
// - أي حصة لسه ملهاش رد/حالة محدَّدة (مفيش override مخزّن) → تفضل
//   "قيد الانتظار" (pending) دايمًا، بغض النظر عن تاريخها فات أو لسه جاي.
//
// ── مشرف/معلم الحصة ──
// لو الحصة اتحسم أمرها (status أو snapshot مخزّن)، بنفضّل قيمة المشرف/المعلم
// المخزّنة فعليًا في sessionOccurrences (وقت ما حصل الحدث) على القيمة
// الحيّة الحالية في الحلقة، عشان لو اتغيّر المشرف بعدين ميأثرش بأثر رجعي
// على حصص قديمة اتسجلت لمشرف تاني.
//
// ── نوافذ النشاط (active windows) — جديد ──
// بدل ما نعتمد على session.status الحالية بس (اللي كانت بتوقف توليد أي
// حصص خالص لو الحلقة بقت paused/cancelled، حتى الحصص القديمة اللي كانت
// فعلاً شغالة قبل كده)، بنستخدم session.history (المتسجّل تلقائيًا مع كل
// تغيير حالة في sessionsService.js) عشان نبني الفترات (نوافذ) اللي كانت
// فيها الحلقة فعلاً trial أو active، ونولّد الحصص جوه النوافذ دي بس:
//   - trial/active  → نافذة نشاط (بيتولد فيها حصص)
//   - paused/cancelled → تقفل النافذة اللي قبلها، ومفيش حصص تتولد في مدتها
//   - paused بتاريخ محدد (pauseType: 'dated') → نضيف نافذة افتراضية تبدأ
//     من اليوم اللي بعد pauseUntil مباشرة، عشان الحصص المستقبلية بعد
//     الرجوع تظهر فورًا من غير ما نستنى الكرون اليومي يرجّع status فعليًا
//
// لو الحلقة مالهاش history خالص (بيانات قديمة من قبل إضافة الحقل ده)،
// بيرجع لنفس السلوك القديم: نافذة واحدة مفتوحة بحالتها الحالية لو
// trial/active، أو مفيش توليد ديناميكي خالص لو paused/cancelled (زي زمان).
//
// ── ترقيم الحصص (occurrenceNumber) — جديد ──
// كل حصة بتاخد رقم تسلسلي (1, 2, 3...) محسوب من *بداية* الحلقة فعليًا
// (أول trial/active window)، مش من بداية نطاق الفلتر الحالي في الواجهة.
// بالتالي الرقم ثابت ومنطقي بغض النظر عن أي فلتر تاريخ مستخدَم، ومحسوب
// عبر buildOccurrenceNumberMap لكل حلقة ظاهرة في النتيجة فقط (مش كل
// الحلقات في قاعدة البيانات).
//
// Session.status  : trial | active | paused | cancelled   (بدون تغيير)
// Occurrence.status: pending | confirmed | absent | postponed | makeup | cancelled
// ═══════════════════════════════════════════════════════════════

// ── أدوات تاريخ بسيطة (بدون مشاكل التايم زون، بنفس أسلوب باقي الكود) ──
function toDateOnly(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function todayStr() {
  return toDateStr(new Date())
}

function maxDateStr(a, b) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}
function minDateStr(a, b) {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

// ── يوم واحد قبل/بعد تاريخ معيّن ──
function nextDayStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1)
  return toDateStr(dt)
}
function prevDayStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return toDateStr(dt)
}

// ── خريطة الـ occurrences المخزّنة فعليًا (sessionId + date → occurrence) ──
export function buildOccurrenceMap(occurrenceDocs = []) {
  const map = new Map()
  occurrenceDocs.forEach((o) => {
    if (o?.sessionId && o?.date) map.set(`${o.sessionId}__${o.date}`, o)
  })
  return map
}

// ── الحالة الافتراضية للحصة لو مفيش override مخزّن لها ──
// مفيش أي افتراض بناءً على التاريخ: الحالة الحقيقية بتيجي بس من ردّ
// الطالب على رسالة الواتساب (اللي بيتخزن كـ override في sessionOccurrences).
// لغاية ما يوصل الرد، الحصة تفضل "قيد الانتظار".
function defaultOccurrenceStatus() {
  return 'pending'
}

// ═══════════════════════════════════════════════════════════════
// buildActiveWindows(session)
// بيرجع array من { status: 'trial'|'active', start: 'YYYY-MM-DD', end: 'YYYY-MM-DD'|null }
// end === null معناها النافذة لسه مفتوحة (الحالة الحالية مستمرة).
// ═══════════════════════════════════════════════════════════════
function buildActiveWindows(session) {
  const history = (session.history || [])
    .filter((h) => h?.date && h?.status)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const windows = []

  if (!history.length) {
    // ← fallback لحلقات قديمة من غير history: نافذة واحدة مفتوحة بحالتها
    //   الحالية لو trial/active، وإلا مفيش توليد ديناميكي (زي السلوك القديم)
    if (session.status === 'trial') {
      windows.push({ status: 'trial', start: session.trialDate || session.startDate || null, end: null })
    } else if (session.status === 'active') {
      windows.push({ status: 'active', start: session.startDate || null, end: null })
    }
  } else {
    for (let i = 0; i < history.length; i++) {
      const cur = history[i]
      const next = history[i + 1]
      const isLast = i === history.length - 1

      if (isLast) {
        // ← النافذة الأخيرة (المفتوحة) لازم تعكس الحالة الحالية الفعلية
        //   للحلقة (session.status)، مش بالضرورة الـ status المسجّل في آخر
        //   عنصر بالـ history. أحيانًا الـ history بيتضارب مع الحقل الحالي
        //   (مثلاً حلقة اتلغت وبعدين رجّعها حد لـ active يدويًا من غير ما
        //   يتسجل انتقال جديد صحيح) — فبنثق في session.status كمصدر الحقيقة
        //   لأي حاجة بتحصل "دلوقتي وطالع"، ونستخدم تاريخ آخر انتقال مسجّل
        //   كبداية للنافذة دي، حتى لو نوعه نفسه (status) غلط/قديم.
        if (session.status === 'active' || session.status === 'trial') {
          windows.push({ status: session.status, start: cur.date, end: null })
        } else if (cur.status === 'active' || cur.status === 'trial') {
          windows.push({ status: cur.status, start: cur.date, end: null })
        }
        continue
      }

      if (cur.status === 'active' || cur.status === 'trial') {
        windows.push({ status: cur.status, start: cur.date, end: next.date })
      }
      // paused / cancelled: من غير نافذة — بتقفل النافذة اللي قبلها تلقائيًا
    }
  }

  // ═══ توقف بتاريخ محدد (pauseFrom → pauseUntil) ═══
  // شغّالة في الحالتين:
  //   1) الحلقة اتقفلت فعليًا دلوقتي (status === 'paused') — الجوب/الـ
  //      client-check قلبوا الحالة الحقيقية خلاص.
  //   2) التوقف لسه مجدول للمستقبل (pendingPauseDate موجودة، والحالة
  //      الحيّة لسه active/trial زي ما هي عمدًا لحد ما ييجي pauseFrom).
  // في الحالتين: مفيش حصص جوه [pauseFrom, pauseUntil]، وقبلها/بعدها
  // التوزيع عادي — حتى لو فلترت على شهر مستقبلي بعيد.
  if (session.pauseType === 'dated' && session.pauseFrom && session.pauseUntil && windows.length) {
    const last = windows[windows.length - 1]
    if (last && (last.status === 'active' || last.status === 'trial') && last.end === null && last.start <= session.pauseFrom) {
      last.end = session.pauseFrom
    }
    windows.push({ status: 'active', start: nextDayStr(session.pauseUntil), end: null })
  }

    // ═══ إلغاء مجدول للمستقبل (pendingCancelDate) — جديد ═══
  if (session.pendingCancelDate && windows.length) {
    const last = windows[windows.length - 1]
    if (last && (last.status === 'active' || last.status === 'trial') && last.end === null && last.start <= session.pendingCancelDate) {
      last.end = session.pendingCancelDate
    }
  }

   // ═══ تفعيل مجدول (pendingActivateDate) ═══
  // الحلقة لسه في حالتها القديمة فعليًا (غالبًا trial)، وماحصلش أي تسجيل
  // في history لأن liveStatus فضلت زي ما هي (updateSession بتؤجل التفعيل
  // الفعلي لحد ما يوصل startDate). لكن عندنا pendingActivateDate محفوظة
  // فعلًا، فبنضيف نافذة "active" تبدأ منها مباشرة، عشان حصص الحلقة تظهر
  // في شهرها/فترتها الصحيحة فورًا من غير ما نستنى الكرون يقلب الـstatus.
  if (session.pendingActivateDate) {
    windows.push({ status: 'active', start: session.pendingActivateDate, end: null })
  }

  return windows
}

// ── توليد تواريخ حلقة متكررة (حسب أيام regularDates) داخل مدى معيّن ──
// المدى هنا (rangeStart/rangeEnd) بيبقى أصلاً متقاطع مع نافذة النشاط من
// buildActiveWindows، فمفيش أي منطق cutoff إضافي هنا.
function enumerateRecurringDates(session, { rangeStart, rangeEnd, limitCount, dayNumber } = {}) {
  let dayNumbers = (session.regularDates || [])
    .map((d) => d.dayNumber)
    .filter((n) => n !== undefined && n !== null)

  if (dayNumber !== undefined && dayNumber !== null) {
    dayNumbers = dayNumbers.filter((n) => n === dayNumber)
  }

  if (!dayNumbers.length || !rangeStart) return []

  const startDate = toDateOnly(rangeStart)
  if (!startDate) return []

  const endDate = rangeEnd ? toDateOnly(rangeEnd) : null

  const dates = []
  const cursor = new Date(startDate)

  // ← سقف أمان لمنع loop لا نهائي لو مفيش rangeEnd ولا limitCount (تقريبًا 27 سنة)
  const MAX_ITERATIONS = 10000
  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++
    if (endDate && cursor > endDate) break

    if (dayNumbers.includes(cursor.getDay())) {
      dates.push(toDateStr(cursor))
      if (limitCount && !endDate && dates.length >= limitCount) break
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

// ═══════════════════════════════════════════════════════════════
// buildOccurrenceNumberMap(session, occurrencesMap, datesNeeded)
// بيرجع Map<date, number> — رقم تسلسلي لكل حصة، محسوب من *بداية* الحلقة
// فعليًا (كل نوافذ النشاط من أولها)، مش من بداية نطاق الفلتر الحالي.
// بالتالي الرقم بيفضل ثابت ومنطقي بغض النظر عن أي فلتر تاريخ مستخدَم في
// الواجهة (يوم/شهر/فترة/من النهارده وطالع...).
//
// datesNeeded: مصفوفة التواريخ المطلوب ترقيمها فعليًا (مش كل تاريخ في
// قاعدة البيانات) — بنحسب أقصى تاريخ فيها ونولّد كل تواريخ الحلقة لغاية
// هذا التاريخ بس، عشان الأداء يفضل معقول حتى مع حلقات active قديمة.
// ═══════════════════════════════════════════════════════════════
function buildOccurrenceNumberMap(session, occurrencesMap, datesNeeded) {
  if (!datesNeeded.length) return new Map()
  const maxDate = datesNeeded.reduce((m, d) => (d > m ? d : m), datesNeeded[0])

  const activeWindows = buildActiveWindows(session)
  let allDates = []

  for (const win of activeWindows) {
    if (!win.start) continue
    const windowEnd = win.end ? minDateStr(maxDate, prevDayStr(win.end)) : maxDate
    if (windowEnd && win.start > windowEnd) continue

    if (win.status === 'trial') {
      if (session.trialDate && session.trialDate >= win.start && (!windowEnd || session.trialDate <= windowEnd)) {
        allDates.push(session.trialDate)
      }
    } else if (win.status === 'active') {
      allDates.push(...enumerateRecurringDates(session, { rangeStart: win.start, rangeEnd: windowEnd }))
    }
  }

  // ← union مع أي occurrences متخزَّنة فعليًا لنفس الحلقة (حتى لو بتاريخ
  //   خارج النمط العادي، زي حصة معوَّضة بيوم مختلف تمامًا)، عشان الترقيم
  //   يفضل شامل كل الحصص الحقيقية للحلقة
  const dateSet = new Set(allDates)
  occurrencesMap.forEach((o) => {
    if (o.sessionId === session.id && o.date <= maxDate) dateSet.add(o.date)
  })

  const sorted = [...dateSet].sort()
  const map = new Map()
  sorted.forEach((d, i) => map.set(d, i + 1))
  return map
}

// ── تحويل تاريخ + حلقة + (override لو موجود) إلى object الحصة الظاهر في الواجهة ──
// ── تحويل تاريخ + حلقة + (override لو موجود) إلى object الحصة الظاهر في الواجهة ──
function buildOccurrence(session, date, stored, occurrenceNumber = null) {
  const dow = toDateOnly(date)?.getDay()
  const matchingRegular = (session.regularDates || []).find((d) => d.dayNumber === dow)

  // ← المشرف "الحيّ" حسب إعدادات الحلقة الحالية فعليًا
  const liveSupervisorId   = matchingRegular?.supervisorId   || session.supervisorId
  const liveSupervisorName = matchingRegular?.supervisorName || session.supervisorName

  // ← نجمّد قيمة المشرف المخزّنة (snapshot) بس لو:
  //   - الحصة فاتت فعلاً (تاريخها قبل النهاردة) — سجل تاريخي ثابت، أو
  //   - اتحسم أمرها (status غير pending)، أو
  //   - فيها substitute صريح (مشرف بديل وقت غياب حد)
  // غير كده (لسه pending ولسه ما جاش معادها) بتفضل تتبع المشرف الحيّ دايمًا،
  // فلو حد غيّر معاد الحصة أو المشرف بتاعها هيتحدث تلقائيًا.
  const isPast       = date < todayStr()
  const isResolved   = !!stored?.status && stored.status !== 'pending'
  const isSubstitute = !!stored?.substituteFor
  const shouldFreeze = !!stored?.supervisorId && (isPast || isResolved || isSubstitute)

  return {
    id: stored?.id || `${session.id}__${date}`,
    sessionId: session.id,
    studentName: session.studentName,
    sessionNumber: session.sessionNumber,
    occurrenceNumber,
    teacherId: session.teacherId,
    teacherName: stored?.teacherName || session.teacherName,
    supervisorId:   shouldFreeze ? stored.supervisorId   : liveSupervisorId,
    supervisorName: shouldFreeze ? stored.supervisorName : liveSupervisorName,
    flagged: stored?.flagged || false,
    date,
    time: stored?.time || matchingRegular?.time || (date === session.trialDate ? session.trialTime : session.regularDates?.[0]?.time),
    status: stored?.status || defaultOccurrenceStatus(),
    makeupDate: stored?.makeupDate || null,
    makeup: stored?.makeup || null,
    notes: stored?.notes || '',
    postponedReason: stored?.postponedReason || '',
    // ← جديد: تمرير علامة "حصة تعويضية" ومصدرها من الـ doc المتخزّن
    isMakeupOccurrence: stored?.isMakeupOccurrence || false,
    makeupSourceDate: stored?.makeupSourceDate || null,
    isStored: !!stored,
    createdAt: stored?.createdAt || null,
    updatedAt: stored?.updatedAt || null,
  }
}

// ── فلترة overrides متخزَّنة فعليًا لحلقة معيّنة، واقعة في مدى معيّن ──
function filterStoredForSession(occurrencesMap, sessionId, { rangeStart, rangeEnd, dayNumber } = {}, excludeDates = null) {
  return [...occurrencesMap.values()].filter((o) => {
    if (o.sessionId !== sessionId) return false
    if (excludeDates && excludeDates.has(o.date)) return false
    if (rangeStart && o.date < rangeStart) return false
    if (rangeEnd && o.date > rangeEnd) return false
    if (dayNumber !== undefined && dayNumber !== null) {
      const dow = toDateOnly(o.date)?.getDay()
      if (dow !== dayNumber) return false
    }
    return true
  })
}

// ═══════════════════════════════════════════════════════════════
// buildSessionOccurrences(session, occurrencesMap, options)
// بتبني كل حصص حلقة واحدة بس، فوق نوافذ النشاط الفعلية بتاعتها (مش على
// أساس الحالة الحالية بس). دي اللي بتُستخدم فوق نتيجة فلترة المرحلة
// الأولى (session-level)، مش على كل الحلقات.
//
// options: { rangeStart, rangeEnd, limitCount, dayNumber }
// ═══════════════════════════════════════════════════════════════
export function buildSessionOccurrences(session, occurrencesMap = new Map(), options = {}) {
  const { rangeStart, rangeEnd, limitCount, dayNumber } = options

  const activeWindows = buildActiveWindows(session)

    let dates = []
  for (const win of activeWindows) {
    const windowStart = maxDateStr(rangeStart, win.start)
    const windowEnd = win.end ? minDateStr(rangeEnd, prevDayStr(win.end)) : rangeEnd

    if (win.status === 'trial') {
      if (session.trialDate) {
        const inRange = (!windowStart || session.trialDate >= windowStart) && (!windowEnd || session.trialDate <= windowEnd)
        const dayOk = dayNumber === undefined || dayNumber === null || toDateOnly(session.trialDate)?.getDay() === dayNumber
        if (inRange && dayOk) dates.push(session.trialDate)
      }
   } else if (win.status === 'active') {
  const windowDates = enumerateRecurringDates(session, {
    rangeStart: windowStart,
    rangeEnd: windowEnd,
    limitCount,
    dayNumber,
  })
  dates.push(...windowDates)
   // ← جديد: تاريخ الانضمام/الرجوع الفعلي (بداية النافذة) لازم يظهر في
  //   شهره حتى لو مش من ضمن نمط الأيام المتكرر (regularDates)، عشان لو
  //   انضم بيوم مايصادفش أي معاد أسبوعي في هذا الشهر بالتحديد، يفضل
  //   ظاهر كدليل إنه انضم فيه
  // if (win.start) {
  //   const dayOk = dayNumber === undefined || dayNumber === null
  //     || toDateOnly(win.start)?.getDay() === dayNumber
  //   const inRange = (!windowStart || win.start >= windowStart) && (!windowEnd || win.start <= windowEnd)
  //   if (inRange && dayOk) dates.push(win.start)
  // }
}
    
  }

  // ← دفاعيًا: union مع أي override متخزَّن فعليًا لنفس الحلقة في نفس المدى،
  //   حتى لو تاريخه مش من ضمن التواريخ المحسوبة تلقائيًا (مثلاً: تعويض
  //   confirmed بتاريخ تاني تمامًا، أو رد واتساب وصل بتاريخ مختلف بسبب فرق
  //   توقيت السيرفر، أو تغيّر نمط الأيام بعد إنشاء الـ override). من غيرها،
  //   الحصة تفضل موجودة في Firestore فعليًا بس تختفي تمامًا من الجدول.
  const dateSet = new Set(dates)
  const storedExtra = filterStoredForSession(occurrencesMap, session.id, { rangeStart, rangeEnd, dayNumber }, dateSet)

  const allDates = [...new Set([...dates, ...storedExtra.map((o) => o.date)])]


  // ← ترقيم الحصص: رقم تسلسلي لكل حصة محسوب من بداية الحلقة فعليًا
  const numberMap = buildOccurrenceNumberMap(session, occurrencesMap, allDates)

  return allDates.map((date) =>
    buildOccurrence(session, date, occurrencesMap.get(`${session.id}__${date}`), numberMap.get(date))
  )
}

// ═══════════════════════════════════════════════════════════════
// generateOccurrences(sessions, occurrenceDocs, options)
// الدالة التنسيقية العليا (المرحلة الثانية):
//   بتاخد الحلقات الناتجة من فلترة المرحلة الأولى + كل الـ occurrences
//   المخزّنة من Firestore + خيارات المدى، وترجع كل الحصص الناتجة.
// ═══════════════════════════════════════════════════════════════
export function generateOccurrences(sessions = [], occurrenceDocs = [], options = {}) {
  const map = buildOccurrenceMap(occurrenceDocs)
  return sessions.flatMap((session) => buildSessionOccurrences(session, map, options))
}

// ── مساعدات لفلاتر التاريخ (المرحلة الثالثة) — بترجع { rangeStart, rangeEnd } ──

// فلتر الشهر: monthYearStr شكلها "MM-YYYY" (نفس الفورمات المستخدم في الصفحة)
export function monthRange(monthYearStr) {
  if (!monthYearStr) return {}
  const [mm, yyyy] = monthYearStr.split('-').map(Number)
  if (!mm || !yyyy) return {}
  const start = new Date(yyyy, mm - 1, 1)
  const end = new Date(yyyy, mm, 0) // آخر يوم في الشهر
  return { rangeStart: toDateStr(start), rangeEnd: toDateStr(end) }
}

// فلتر يوم محدد بتاريخه الكامل
export function dayRange(dateStr) {
  if (!dateStr) return {}
  return { rangeStart: dateStr, rangeEnd: dateStr }
}
// فلتر فترة (من - إلى)
export function customRange(from, to) {
  return { rangeStart: from || undefined, rangeEnd: to || undefined }
}

export { toDateStr, toDateOnly }