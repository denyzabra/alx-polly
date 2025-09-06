import { redirect } from 'next/navigation';
import { checkUserRole, UserRole } from '@/app/lib/utils/rbac';
import React from 'react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if the user has admin role
  const { authorized } = await checkUserRole(UserRole.ADMIN);
  
  // If not authorized, redirect to the home page
  if (!authorized) {
    redirect('/');
  }
  
  return <>{children}</>;
}