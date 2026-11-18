import React from 'react';
import { ModuleErrorBoundary } from '@/core/error-boundary/ModuleErrorBoundary';
import { NewsHomeScreen } from '@/features/news/screens/NewsHomeScreen';

export default function HomeRoute() {
  return (
    <ModuleErrorBoundary moduleName="news" moduleTitleAr="الشاشة الرئيسية والأخبار">
      <NewsHomeScreen />
    </ModuleErrorBoundary>
  );
}
