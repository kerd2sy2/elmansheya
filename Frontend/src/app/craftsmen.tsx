import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { CraftsmenScreen } from '@/features/craftsmen/screens/CraftsmenScreen';

export default function CraftsmenRoute() {
  return (
    <ModuleErrorBoundary moduleName="craftsmen" moduleTitleAr="الصنايعية">
      <CraftsmenScreen />
    </ModuleErrorBoundary>
  );
}
