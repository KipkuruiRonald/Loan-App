'use client';

import { useState } from 'react';
import Image from 'next/image';
import PreApprovedLoan from '@/components/PreApprovedLoan';
import GlassCard from '@/components/GlassCard';
import CosmicBackground from '@/components/CosmicBackground';

export default function PreApprovedPage() {
  const [applicationData, setApplicationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleApply = async (loanData: any) => {
    setIsLoading(true);
    
    // Simulate API call - replace with actual API
    console.log('Applying for loan:', loanData);
    
    // Demo: simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setApplicationData(loanData);
    setIsLoading(false);
    
    // In real app, redirect to next step or show confirmation
    alert(`Loan application submitted!\n\nAmount: KSh ${loanData.principal.toLocaleString()}\nYou'll receive: KSh ${loanData.amountReceived.toLocaleString()}\nTotal to repay: KSh ${loanData.totalRepayment.toLocaleString()}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CosmicBackground />
      
      {/* Header */}
      <header className="relative z-10 px-4 py-6">
        <div className="max-w-md mx-auto">
          <Image
            src="/logo.png"
            alt="Okolea"
            width={60}
            height={60}
            className="mx-auto rounded-xl"
            priority
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-12">
        <div className="max-w-md mx-auto">
          <GlassCard hover={false} className="mb-6">
            <PreApprovedLoan
              userName="John"
              minAmount={500}
              maxAmount={15000}
              defaultAmount={10000}
              onApply={handleApply}
              isLoading={isLoading}
            />
          </GlassCard>

          {/* Debug / Demo Output */}
          {applicationData && (
            <GlassCard hover={false} className="mt-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                Application Data (Demo)
              </h3>
              <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-3 rounded-lg overflow-auto">
                {JSON.stringify(applicationData, null, 2)}
              </pre>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  );
}
