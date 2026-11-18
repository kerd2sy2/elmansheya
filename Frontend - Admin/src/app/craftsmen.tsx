import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { CraftsmenManagementScreen } from '@/features/admin/screens/CraftsmenManagementScreen';

export default function CraftsmenRoute() {
  return (
    <ModuleErrorBoundary moduleName="admin_craftsmen" moduleTitleAr="إدارة واعتماد الصنايعية">
      <CraftsmenManagementScreen />
    </ModuleErrorBoundary>
  );
}
