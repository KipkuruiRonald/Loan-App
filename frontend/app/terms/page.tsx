'use client';

import { motion } from 'framer-motion';
import { FileText, Download, Printer, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import CollapsibleSection from '@/components/CollapsibleSection';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          By accessing and using the Okoleo mobile application and services (collectively, the &quot;Service&quot;), 
          you accept and agree to be bound by the terms and provision of this agreement. If you do not agree 
          to abide by these terms, please do not use this Service.
        </p>
        <p>
          These Terms & Conditions constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, 
          or &quot;your&quot;) and Okoleo (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
        </p>
      </div>
    )
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>To be eligible to use Okoleo services, you must meet the following requirements:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Be at least 18 years of age</li>
          <li>Be a resident of Kenya</li>
          <li>Possess a valid Kenyan National ID or passport</li>
          <li>Have an active mobile phone number registered in Kenya</li>
          <li>Have a valid M-Pesa account registered with your mobile number</li>
          <li>Provide accurate and complete information during registration</li>
        </ul>
      </div>
    )
  },
  {
    id: 'loan-terms',
    title: '3. Loan Terms',
    content: (
      <div className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Loan Amount</h4>
          <p>Okoleo offers loans ranging from KES 500 to KES 50,000, subject to approval and your credit history.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Loan Period</h4>
          <p>All loans have a 9-day (nine days) repayment period, unless otherwise specified.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Interest Rate</h4>
          <p>The annual interest rate is 4% (four percent). Interest is calculated on the principal amount and applied for the loan duration.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Late Payment Penalty</h4>
          <p>A late penalty of 6.8% will be applied to any outstanding balance after the due date. This penalty accrues daily on overdue amounts.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Credit Limits</h4>
          <p>Your credit limit is dynamically determined based on:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Your repayment history with Okoleo</li>
            <li>Credit score from Credit Reference Bureau (CRB)</li>
            <li>Account activity and tenure</li>
            <li>Verification of provided information</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'repayment',
    title: '4. Repayment',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Payment Methods</h4>
        <p>All loan repayments must be made through M-Pesa using the following process:</p>
        <ul className="list-decimal list-inside space-y-2 ml-2">
          <li>Go to M-Pesa on your phone</li>
          <li>Select &quot;Pay Bill&quot;</li>
          <li>Enter Business Number: <strong>899999</strong></li>
          <li>Enter your Okoleo phone number as the Account Number</li>
          <li>Enter the repayment amount</li>
          <li>Confirm the transaction with your M-Pesa PIN</li>
        </ul>
        <div className="mt-4">
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Due Dates</h4>
          <p>Loan repayment is due 9 days from the disbursement date. You can repay early without any penalty. Early repayment is encouraged and may improve your credit limit.</p>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Late Fees</h4>
          <p>If payment is not received by the due date, a 6.8% late penalty will be applied to the outstanding balance. Additional daily penalties may apply for continued non-payment.</p>
        </div>
      </div>
    )
  },
  {
    id: 'crb',
    title: '5. Credit Reporting',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          By using Okoleo services, you authorize us to share your credit information with Credit Reference 
          Bureaus (CRBs) registered under the Central Bank of Kenya.
        </p>
        <p>We will report:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Loan applications and disbursements</li>
          <li>Repayment history (timely and late payments)</li>
          <li>Defaulted loans</li>
          <li>Any legal proceedings related to unpaid loans</li>
        </ul>
        <p className="mt-4">
          Your credit report may be accessed by other financial institutions when you apply for credit 
          in the future. Maintaining a good repayment record is essential for your creditworthiness.
        </p>
      </div>
    )
  },
  {
    id: 'privacy',
    title: '6. Privacy & Data Protection',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Your privacy is important to us. Okoleo collects, stores, and processes your personal information 
          in accordance with the Kenya Data Protection Act, 2019 and our Privacy Policy.
        </p>
        <p>We collect information including but not limited to:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Personal identification (name, ID number, date of birth)</li>
          <li>Contact information (phone number, email, address)</li>
          <li>Financial information (bank accounts, M-Pesa details)</li>
          <li>Device and usage data</li>
          <li>Credit history and score</li>
        </ul>
        <p className="mt-4">
          For detailed information about how we handle your data, please refer to our{' '}
          <Link href="/privacy" className="underline" style={{ color: 'var(--button-primary)' }}>
            Privacy Policy
          </Link>.
        </p>
      </div>
    )
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Okoleo shall not be liable for any indirect, incidental, special, consequential, or punitive 
          damages resulting from your use or inability to use the Service.
        </p>
        <p>We do not guarantee that:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>The Service will be available at all times</li>
          <li>There will be no errors or interruptions</li>
          <li>Any particular loan amount will be approved</li>
        </ul>
        <p className="mt-4">
          You agree to indemnify and hold Okoleo harmless from any claims, damages, or expenses arising 
          from your use of the Service or violation of these Terms.
        </p>
      </div>
    )
  },
  {
    id: 'changes',
    title: '8. Changes to Terms',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Okoleo reserves the right to modify these Terms & Conditions at any time. We will provide 
          notice of material changes through:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>In-app notifications</li>
          <li>Email to your registered address</li>
          <li>SMS to your registered phone number</li>
        </ul>
        <p className="mt-4">
          Your continued use of Okoleo services after such modifications constitutes acceptance of the 
          updated Terms & Conditions.
        </p>
      </div>
    )
  },
  {
    id: 'termination',
    title: '9. Termination',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Okoleo may terminate or suspend your access to the Service immediately, without prior notice 
          or liability, for any reason, including breach of these Terms.
        </p>
        <p>Upon termination:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>All outstanding amounts become immediately due</li>
          <li>Your right to use the Service ceases</li>
          <li>We may report defaults to CRBs</li>
        </ul>
      </div>
    )
  },
  {
    id: 'contact',
    title: '10. Contact Information',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>If you have any questions about these Terms & Conditions, please contact us:</p>
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
          <p><strong>Email:</strong> support@okoleo.co.ke</p>
          <p><strong>Phone:</strong> +254 700 000 000</p>
          <p><strong>WhatsApp:</strong> 0799 333 014</p>
          <p><strong>Address:</strong> Nairobi, Kenya</p>
        </div>
      </div>
    )
  },
];

export default function TermsPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );
  const [lastUpdated] = useState('15 February 2026');

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'var(--bg-card-alt)', opacity: 0.3 }} />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.15 }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="h-8 w-8" style={{ color: 'var(--button-primary)' }} />
            <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Terms & Conditions
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Last Updated: {lastUpdated}</span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center gap-4 mb-8 print:hidden"
        >
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)'
            }}
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard hover={false} className="p-6 mb-6">
            <p style={{ color: 'var(--text-secondary)' }}>
              Please read these Terms & Conditions carefully before using the Okoleo mobile application 
              and services. By accessing or using our Service, you agree to be bound by these terms. 
              If you disagree with any part of these terms, you may not access our Service.
            </p>
          </GlassCard>
        </motion.div>

        {/* Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <CollapsibleSection
                title={section.title}
                defaultExpanded={true}
              >
                {section.content}
              </CollapsibleSection>
            </motion.div>
          ))}
        </motion.div>

        {/* Agreement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8"
        >
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
            <p className="text-center font-medium" style={{ color: 'var(--text-primary)' }}>
              By using Okoleo services, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms & Conditions.
            </p>
          </div>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center flex flex-col sm:flex-row justify-center gap-4"
        >
          <Link 
            href="/privacy" 
            className="text-sm hover:underline"
            style={{ color: 'var(--button-primary)' }}
          >
            View Privacy Policy
          </Link>
          <span style={{ color: 'var(--border-light)' }}>|</span>
          <Link 
            href="/contact" 
            className="text-sm hover:underline"
            style={{ color: 'var(--button-primary)' }}
          >
            Contact Us
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
