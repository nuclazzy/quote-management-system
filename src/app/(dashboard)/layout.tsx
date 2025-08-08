'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStaticAuth } from '@/contexts/StaticAuthContext';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useStaticAuth();

  // StaticAuth는 항상 user가 있고 loading이 없으므로 바로 렌더링
  return <DashboardLayout>{children}</DashboardLayout>;
}