import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';

export default function ProfileRoute() {
  return (
    <ModuleErrorBoundary moduleName="profile" moduleTitleAr="حسابي">
      <ProfileScreen />
    </ModuleErrorBoundary>
  );
}
