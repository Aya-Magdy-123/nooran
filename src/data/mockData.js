// src/data/mockData.js
// Central mock data — in production replace with API calls

export const SUPERVISORS = [
  { id: 1, name: 'سارة محمود',  phone: '01000000001', shift: 'morning',   status: 'active' },
  { id: 2, name: 'منى حسن',     phone: '01000000002', shift: 'morning',   status: 'active' },
  { id: 3, name: 'دعاء سامي',   phone: '01000000003', shift: 'afternoon', status: 'absent' },
  { id: 4, name: 'هبة إبراهيم', phone: '01000000004', shift: 'evening',   status: 'active' },
]

export const TEACHERS = [
  { id: 1, name: 'الشيخ كريم عبد الله', phone: '01110000001', program: 'حفظ القرآن',  shift: 'مسائي',  students: 18 },
  { id: 2, name: 'الشيخ طارق السيد',    phone: '01110000002', program: 'تجويد',       shift: 'مسائي',  students: 22 },
  { id: 3, name: 'الشيخ أحمد فريد',    phone: '01110000003', program: 'حفظ وتجويد', shift: 'صباحي', students: 14 },
]

// src/data/mockData.js

export const HALAQAS = [
  { id: 1, name: 'حلقة الفجر',    teacherId: 1, days: [0, 2, 4], time: '14:00', shift: 'مسائي' },
  { id: 2, name: 'حلقة النور',    teacherId: 2, days: [1, 3, 5], time: '14:30', shift: 'مسائي' },
  { id: 3, name: 'حلقة الصباح',   teacherId: 3, days: [0, 3],   time: '10:00', shift: 'صباحي' },
]

// وعدّل STUDENTS — زود halaqaId لكل طالب
export const STUDENTS = [
  { id: 1,  name: 'أحمد محمود',    halaqaNo: 'H-1042', phone: '01000000010', teacherId: 1, halaqaId: 1, program: 'تجويد' , supervisorId: 1, status: 'active',  attendance: 95 },
  { id: 2,  name: 'فاطمة علي',     halaqaNo: 'H-0871', phone: '01000000011', teacherId: 2, halaqaId: 2, program: 'تجويد' , supervisorId: 2, status: 'active',  attendance: 100 },
  { id: 3,  name: 'يوسف حسن',      halaqaNo: 'H-0334', phone: '01000000012', teacherId: 1, halaqaId: 1, program: 'حفظ القرآن', supervisorId: 1, status: 'active',  attendance: 80 },
  { id: 4,  name: 'مريم إبراهيم',  halaqaNo: 'H-0512', phone: '01000000013', teacherId: 2, halaqaId: 2, program: 'تجويد' , supervisorId: 3, status: 'onhold',  attendance: 70, postponeStatus: 'pending' },
  { id: 5,  name: 'عمر خالد',      halaqaNo: 'H-0228', phone: '01000000014', teacherId: 1, halaqaId: 1, program: 'حفظ القرآن', supervisorId: 2, status: 'active',  attendance: 93 },
  { id: 6,  name: 'نور أحمد',      halaqaNo: 'H-0099', phone: '01000000015', teacherId: 2, halaqaId: 2, program: 'تجويد' , supervisorId: 3, status:'trial',   attendance: null },
  { id: 7,  name: 'سلمى عبد الله', halaqaNo: 'H-0750', phone: '01000000016', teacherId: 3, halaqaId: 3, supervisorId: 4, status: 'active',  attendance: 88, postponeStatus: 'pending', postponeDate: '2026-06-04', postponeTime: '14:00', postponeReason: 'ظروف عائلية', postponeRequestDate: '2026-06-02'},
  { id: 8,  name: 'حمزة سعيد',     halaqaNo: 'H-0901', phone: '01000000017', teacherId: 3, halaqaId: 3, supervisorId: 4, status: 'active',  attendance: 91,  postponeStatus: 'pending', postponeDate: '2026-06-05', postponeTime: '15:00', postponeReason: 'مرض', postponeRequestDate: '2026-06-03'  },
]

export const PROGRAMS = [
  { id: 1, name: 'برنامج الحفظ' },
  { id: 2, name: 'برنامج التجويد'},
  { id: 3, name: 'برنامج الحفظ والتجويد' },
]

export const SESSIONS = [
  { id: 1, studentId: 1, teacherId: 1, supervisorId: 1, date: '2026-05-31', time: '14:00', type: 'regular',  status: 'confirmed',  flagged: false },
  { id: 2, studentId: 2, teacherId: 2, supervisorId: 2, date: '2026-05-31', time: '14:30', type: 'regular',  status: 'confirmed',  flagged: false },
  { id: 3, studentId: 3, teacherId: 1, supervisorId: 1, date: '2026-05-31', time: '15:00', type: 'makeup',   status: 'scheduled',  flagged: true  },
  { id: 4, studentId: 4, teacherId: 2, supervisorId: 3, date: '2026-05-31', time: '15:00', type: 'regular',  status: 'noshow',     flagged: false },
  { id: 5, studentId: 5, teacherId: 1, supervisorId: 2, date: '2026-05-31', time: '16:00', type: 'regular',  status: 'confirmed',  flagged: false },
  { id: 6, studentId: 6, teacherId: 2, supervisorId: 3, date: '2026-05-31', time: '17:30', type: 'trial',    status: 'scheduled',  flagged: false },
  { id: 7, studentId: 7, teacherId: 3, supervisorId: 4, date: '2026-05-31', time: '10:00', type: 'regular',  status: 'completed',  flagged: false },
  { id: 8, studentId: 8, teacherId: 3, supervisorId: 4, date: '2026-05-31', time: '10:30', type: 'regular',  status: 'scheduled',  flagged: false },
]

export const POSTPONE_REQUESTS = [
  { id: 1, studentId: 4, originalDate: '2026-05-31', originalTime: '15:00', reason: 'ظروف عائلية',  requestDate: '2026-05-30', status: 'pending',  newDate: null, newTime: null },
  { id: 2, studentId: 3, originalDate: '2026-05-28', originalTime: '15:00', reason: 'مرض',          requestDate: '2026-05-27', status: 'resolved', newDate: '2026-05-31', newTime: '15:00' },
  { id: 3, studentId: 1, originalDate: '2026-06-02', originalTime: '14:00', reason: 'سفر',          requestDate: '2026-05-31', status: 'pending',  newDate: null, newTime: null },
]

export const STATUS_LABELS = {
  active:    'نشط',
  trial:     'تجريبي',
  onhold:    'موقوف',
  cancelled: 'ملغي',
  absent:    'غائب',
  scheduled:  'مجدول',
  confirmed:  'مؤكد',
  noshow:     'غياب',
  completed:  'مكتمل',
  pending:    'قيد الانتظار',
  resolved:   'تم الحل',
  regular:    'عادي',
  makeup:     'تعويض',
}

export const TYPE_BADGE = {
  regular: 'badge-scheduled',
  trial:   'badge-trial',
  makeup:  'badge-makeup',
}

export const STATUS_BADGE = {
  active:    'badge-active',
  trial:     'badge-trial',
  onhold:    'badge-onhold',
  cancelled: 'badge-cancelled',
  absent:    'badge-absent',
  scheduled:  'badge-scheduled',
  confirmed:  'badge-confirmed',
  noshow:     'badge-noshow',
  completed:  'badge-active',
  pending:    'badge-onhold',
  resolved:   'badge-confirmed',
}
