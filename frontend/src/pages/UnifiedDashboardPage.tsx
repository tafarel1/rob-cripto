import React, { Suspense } from 'react';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { UnifiedDashboardLayout } from '@/components/dashboard/unified/UnifiedDashboardLayout';
import { UnifiedWorkspace } from '@/components/dashboard/unified/UnifiedWorkspace';
import { LoaderIcon } from '@/components/ui/icons';

function DashboardContent() {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center h-full w-full">
          <LoaderIcon className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <UnifiedWorkspace />
    </Suspense>
  );
}

export default function UnifiedDashboardPage() {
  return (
    <DashboardProvider>
      <UnifiedDashboardLayout>
        <DashboardContent />
      </UnifiedDashboardLayout>
    </DashboardProvider>
  );
}
