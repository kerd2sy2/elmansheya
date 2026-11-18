import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { ServicesManagementScreen } from '@/features/admin/screens/ServicesManagementScreen';

export default function ServicesRoute() {
  return (
    <ModuleErrorBoundary moduleName="admin_services" moduleTitleAr="إدارة الفروع الخدمية">
      <ServicesManagementScreen />
    </ModuleErrorBoundary>
  );
}
