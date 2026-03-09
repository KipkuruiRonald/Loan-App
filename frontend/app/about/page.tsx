'use client';

import { motion } from 'framer-motion';
import { 
  Target, 
  Heart, 
  Zap, 
  Users, 
  Clock, 
  Shield,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';

// Stats data
const stats = [
  { value: '50,000+', label: 'Loans Disbursed' },
  { value: '25,000+', label: 'Active Customers' },
  { value: '< 5 min', label: 'Average Approval Time' },
  { value: '4%', label: 'Interest Rate' },
];

// Values data
const values = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Transparency',
    description: 'We believe in complete honesty. No hidden fees, no surprise charges—what you see is what you get.'
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: 'Trust',
    description: 'Building lasting relationships with our customers through consistent, reliable service.'
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Speed',
    description: 'We understand life moves fast. Our streamlined process gets you money when you need it.'
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Customer First',
    description: 'Every decision we make starts with the question: How does this benefit our customers?'
  },
];

// How it works steps
const howItWorks = [
  {
    step: '01',
    title: 'Apply in Minutes',
    description: 'Fill out our simple online form with your basic details. No lengthy paperwork required.'
  },
  {
    step: '02',
    title: 'Quick Approval',
    description: 'Our system reviews your application and typically approves qualified applicants within 5 minutes.'
  },
  {
    step: '03',
    title: 'Receive Your Money',
    description: 'Approved loans are disbursed directly to your M-Pesa account within hours.'
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'var(--bg-card-alt)', opacity: 0.3 }} />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.15 }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--button-primary)', opacity: 0.1 }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            About Okolea
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Your trusted loan partner in Kenya since 2024
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16"
        >
          {stats.map((stat, index) => (
            <GlassCard key={index} hover={false} className="text-center p-4 md:p-6">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <div className="text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--button-primary)' }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </div>
              </motion.div>
            </GlassCard>
          ))}
        </motion.div>

        {/* Mission Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <GlassCard hover={false} className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--button-primary)' }}>
                <Target className="h-6 w-6" style={{ color: 'var(--button-text)' }} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Our Mission
              </h2>
            </div>
            <p className="text-lg md:text-xl leading-relaxed max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
              To provide fast, transparent, and accessible loans to every Kenyan, 
              empowering individuals to achieve their financial goals and build a better future.
            </p>
          </GlassCard>
        </motion.section>

        {/* Values Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <GlassCard hover={true} className="p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: 'var(--button-primary)' }}>
                      <span style={{ color: 'var(--button-text)' }}>{value.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {value.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        {value.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How It Works Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <GlassCard hover={true} className="p-6 h-full relative">
                  <div className="text-4xl font-bold mb-4 opacity-20" style={{ color: 'var(--button-primary)' }}>
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                  {index < howItWorks.length - 1 && (
                    <ArrowRight 
                      className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 rotate-90 md:rotate-0" 
                      style={{ color: 'var(--border-light)' }} 
                    />
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Loan Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mb-16"
        >
          <GlassCard hover={false} className="p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
              Why Choose Okolea?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 flex-shrink-0 mt-1" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>9-Day Terms</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Short, manageable repayment periods designed to help you build credit.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 flex-shrink-0 mt-1" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>4% Interest</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Competitive, transparent interest rate with no hidden fees.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 flex-shrink-0 mt-1" style={{ color: 'var(--button-primary)' }} />
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Dynamic Limits</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Credit limits that grow with your repayment history and trust.</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center"
        >
          <GlassCard hover={false} className="p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Ready to Get Started?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Join thousands of Kenyans who trust Okolea for their financial needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: 'var(--button-primary)',
                    color: 'var(--button-text)'
                  }}
                >
                  Create Account
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              </Link>
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-light)'
                  }}
                >
                  Contact Us
                </motion.button>
              </Link>
            </div>
          </GlassCard>
        </motion.section>
      </div>
    </div>
  );
}
