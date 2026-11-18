import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { SuperAdminDashboardScreen } from '@/features/admin/screens/SuperAdminDashboardScreen';

export default function ProfileRoute() {
  return (
    <ModuleErrorBoundary moduleName="admin_staff" moduleTitleAr="إدارة الكوادر والمشرفين">
      <SuperAdminDashboardScreen />
    </ModuleErrorBoundary>
  );
}
