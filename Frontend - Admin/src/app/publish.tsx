import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { NewsManagementScreen } from '@/features/admin/screens/NewsManagementScreen';

export default function PublishRoute() {
  return (
    <ModuleErrorBoundary moduleName="admin_publish" moduleTitleAr="استوديو النشر والإعلام">
      <NewsManagementScreen />
    </ModuleErrorBoundary>
  );
}
