import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { ServicesScreen } from '@/features/services/screens/ServicesScreen';

export default function ServicesRoute() {
  return (
    <ModuleErrorBoundary moduleName="services" moduleTitleAr="الخدمات">
      <ServicesScreen />
    </ModuleErrorBoundary>
  );
}
