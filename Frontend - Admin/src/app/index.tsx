import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { AdminDashboardScreen } from '@/features/admin/screens/AdminDashboardScreen';

export default function HomeRoute() {
  return (
    <ModuleErrorBoundary moduleName="admin_dashboard" moduleTitleAr="لوحة القيادة المركزية">
      <AdminDashboardScreen />
    </ModuleErrorBoundary>
  );
}
