'use client';

import { motion } from 'framer-motion';
import { Shield, Download, Printer, ChevronDown, Calendar, Mail, Phone, Lock, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
    id: 'information-collect',
    title: '1. Information We Collect',
    content: (
      <div className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Personal Information</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Full name (as per ID)</li>
            <li>National ID number or passport number</li>
            <li>Date of birth</li>
            <li>Gender</li>
            <li>Phone number(s)</li>
            <li>Email address</li>
            <li>Physical address</li>
            <li>Photograph (for verification)</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Financial Information</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>M-Pesa account details</li>
            <li>Bank account information</li>
            <li>Income and employment details</li>
            <li>Loan history and repayment records</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Device & Usage Information</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Device type and model</li>
            <li>Operating system</li>
            <li>IP address</li>
            <li>Location data</li>
            <li>App usage patterns</li>
            <li>Access times</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'how-use',
    title: '2. How We Use Your Information',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>We use your information for the following purposes:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li><strong>Loan Processing:</strong> To evaluate your loan application, determine eligibility, and disburse loans</li>
          <li><strong>Credit Checking:</strong> To assess your creditworthiness through CRB and other credit bureaus</li>
          <li><strong>Identity Verification:</strong> To verify your identity and prevent fraud</li>
          <li><strong>Customer Service:</strong> To respond to your inquiries and provide support</li>
          <li><strong> communications:</strong> To send you loan updates, reminders, and notifications</li>
          <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our services</li>
          <li><strong>Legal Compliance:</strong> To comply with regulatory requirements and prevent illegal activities</li>
        </ul>
      </div>
    )
  },
  {
    id: 'data-sharing',
    title: '3. Data Sharing',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>We may share your information with:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li><strong>Credit Reference Bureaus (CRBs):</strong> As required by the Central Bank of Kenya for credit reporting</li>
          <li><strong>Service Providers:</strong> Third-party vendors who help us operate our platform (payment processors, SMS providers)</li>
          <li><strong>Legal Authorities:</strong> When required by law or for legal proceedings</li>
          <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
        </ul>
        <p className="mt-4">
          We do <strong>NOT</strong> sell your personal information to third parties for marketing purposes.
        </p>
      </div>
    )
  },
  {
    id: 'data-protection',
    title: '4. Data Protection',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>We implement robust security measures to protect your data:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using industry-standard protocols</li>
          <li><strong>Access Controls:</strong> Strict access controls limit who can view your data</li>
          <li><strong>Regular Audits:</strong> We conduct regular security assessments</li>
          <li><strong>Secure Infrastructure:</strong> Our servers are hosted in secure data centers</li>
          <li><strong>Employee Training:</strong> Our staff are trained on data protection best practices</li>
        </ul>
        <p className="mt-4">
          While we strive to protect your information, no method of transmission over the internet is 100% secure. 
          We cannot guarantee absolute security.
        </p>
      </div>
    )
  },
  {
    id: 'your-rights',
    title: '5. Your Rights',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>Under the Kenya Data Protection Act, 2019, you have the following rights:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
          <li><strong>Right to Correction:</strong> Request correction of inaccurate data</li>
          <li><strong>Right to Deletion:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
          <li><strong>Right to Object:</strong> Object to processing of your data</li>
          <li><strong>Right to Restriction:</strong> Request restriction on processing</li>
          <li><strong>Right to Portability:</strong> Request your data in a portable format</li>
          <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
        </ul>
        <p className="mt-4">
          To exercise these rights, contact us at privacy@okolea.co.ke
        </p>
      </div>
    )
  },
  {
    id: 'cookies',
    title: '6. Cookies',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          We use cookies and similar tracking technologies to enhance your experience. 
          Cookies are small files stored on your device.
        </p>
        <div className="mt-4">
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Types of Cookies We Use</h4>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Essential Cookies:</strong> Required for the app to function</li>
            <li><strong>Analytical Cookies:</strong> Help us understand how users interact with our app</li>
            <li><strong>Functional Cookies:</strong> Remember your preferences</li>
          </ul>
        </div>
        <p className="mt-4">
          You can control cookies through your browser settings. Disabling cookies may affect functionality.
        </p>
      </div>
    )
  },
  {
    id: 'data-retention',
    title: '7. Data Retention',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>We retain your personal data for as long as necessary to:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Provide you with our services</li>
          <li>Comply with legal obligations</li>
          <li>Resolve disputes</li>
          <li>Enforce our agreements</li>
        </ul>
        <p className="mt-4">
          After account closure, we may retain certain data for legal and regulatory purposes, 
          but will not use it for commercial purposes.
        </p>
      </div>
    )
  },
  {
    id: 'third-party',
    title: '8. Third-Party Links',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Our app may contain links to third-party websites or services. We are not responsible 
          for the privacy practices of these third parties.
        </p>
        <p>
          We recommend that you read the privacy policies of any third-party websites you visit.
        </p>
      </div>
    )
  },
  {
    id: 'children',
    title: '9. Children&apos;s Privacy',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          Our services are not intended for individuals under the age of 18. We do not knowingly 
          collect personal information from children.
        </p>
        <p>
          If we become aware that we have collected data from a minor without parental consent, 
          we will take steps to delete such information promptly.
        </p>
      </div>
    )
  },
  {
    id: 'changes',
    title: '10. Changes to This Policy',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material 
          changes through:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>In-app notifications</li>
          <li>Email to your registered address</li>
          <li>SMS to your registered phone number</li>
        </ul>
        <p className="mt-4">
          Your continued use of Okolea after such changes constitutes acceptance of the updated 
          Privacy Policy.
        </p>
      </div>
    )
  },
  {
    id: 'contact',
    title: '11. Contact Us',
    content: (
      <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
        <p>
          If you have any questions about this Privacy Policy or wish to exercise your rights, 
          please contact us:
        </p>
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
          <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Data Protection Officer</p>
          <p><strong>Email:</strong> privacy@okolea.co.ke</p>
          <p><strong>Phone:</strong> +254 700 000 000</p>
          <p><strong>WhatsApp:</strong> 0799 333 014</p>
          <p><strong>Address:</strong> Nairobi, Kenya</p>
        </div>
        <p className="mt-4">
          We will respond to your request within 30 days as required by law.
        </p>
      </div>
    )
  },
];

export default function PrivacyPage() {
  const [lastUpdated] = useState('15 February 2026');

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
            <Shield className="h-8 w-8" style={{ color: 'var(--button-primary)' }} />
            <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Privacy Policy
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

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard hover={false} className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              At a Glance
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Your Data is Secure</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>We use encryption and strict access controls</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>You Control Your Data</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Access, correct, or delete anytime</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>We Don&apos;t Sell Data</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your info stays with us</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Right to be Forgotten</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Delete your account anytime</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <GlassCard hover={false} className="p-6 mb-6">
            <p style={{ color: 'var(--text-secondary)' }}>
              This Privacy Policy explains how Okolea (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, 
              discloses, and safeguards your information when you use our mobile application and services.
            </p>
            <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
              We are committed to protecting your privacy and ensuring you understand how your data is handled. 
              This policy is in compliance with the Kenya Data Protection Act, 2019.
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
              transition={{ delay: 0.35 + index * 0.05 }}
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
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-8"
        >
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
            <p className="text-center font-medium" style={{ color: 'var(--text-primary)' }}>
              By using Okolea services, you acknowledge that you have read, understood, and consent to the 
              collection and use of your information as described in this Privacy Policy.
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
            href="/terms" 
            className="text-sm hover:underline"
            style={{ color: 'var(--button-primary)' }}
          >
            View Terms & Conditions
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
