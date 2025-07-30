'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { NotificationProvider } from '@/contexts/NotificationContext'

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <NotificationProvider>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </NotificationProvider>
    </AuthGuard>
  )
}