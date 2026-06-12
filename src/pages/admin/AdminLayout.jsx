// src/pages/admin/AdminLayout.jsx
import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'

const LINKS = [
  { divider: true, label: 'الرئيسي' },
  { to: '/admin',          label: 'الداشبورد',        icon: LayoutDashboard, end: true },
  { divider: true, label: 'الإدارة' },
  { to: '/admin/users',    label: 'إدارة المستخدمين', icon: Users },
  { to: '/admin/sessions', label: ' الحلقات',   icon: CalendarDays },
]

export default function AdminLayout() {
  return (
    <DashboardLayout role="admin" links={LINKS}>
      <Outlet />
    </DashboardLayout>
  )
}
