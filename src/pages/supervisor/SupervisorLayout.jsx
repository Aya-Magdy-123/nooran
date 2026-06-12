// src/pages/supervisor/SupervisorLayout.jsx
import { Outlet } from 'react-router-dom'
import { BookOpen, Users, CalendarClock, CalendarDays } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'

const LINKS = [
  { divider: true, label: 'القائمة' },
  { to: '/supervisor',           label: 'حلقاتي',          icon: BookOpen,      end: true },
  { to: '/supervisor/students',  label: 'إداره المستخدمين',            icon: Users },
  // { to: '/supervisor/postpone',  label: 'طلبات التأجيل',   icon: CalendarClock },
    { to: '/supervisor/sessions', label: ' الحلقات',   icon: CalendarDays },

]

export default function SupervisorLayout() {
  return (
    <DashboardLayout role="supervisor" links={LINKS}>
      <Outlet />
    </DashboardLayout>
  )
}