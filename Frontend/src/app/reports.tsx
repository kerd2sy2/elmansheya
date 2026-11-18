import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { ReportsScreen } from '@/features/reports/screens/ReportsScreen';

export default function ReportsRoute() {
  return (
    <ModuleErrorBoundary moduleName="reports" moduleTitleAr="البلاغات">
      <ReportsScreen />
    </ModuleErrorBoundary>
  );
}
