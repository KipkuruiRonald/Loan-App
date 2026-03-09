'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DollarSign, CreditCard, FileText, TrendingUp, Shield, Clock } from 'lucide-react';
import { useAuth, getRedirectPath } from '@/context/AuthContext';
//import { usersApi } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  const [maxLoanAmount, setMaxLoanAmount] = useState(50000);
  const [stats, setStats] = useState({
    activeUsers: 10000,
    loansDisbursed: 50000000,
    avgProcessingTime: '5 min'
  });

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const redirectPath = getRedirectPath(user);
      router.replace(redirectPath);
    }
  }, [isAuthenticated, user, loading, router]);

  // Fetch max loan amount for non-authenticated users (default tier)
  useEffect(() => {
    const fetchDefaultLimit = async () => {
      try {
        // You can create an endpoint to get default tier limit
        // For now, we'll keep it as is or fetch from a public endpoint
        const response = await fetch('/api/public/default-limit');
        if (response.ok) {
          const data = await response.json();
          setMaxLoanAmount(data.limit || 50000);
        }
      } catch (error) {
        console.error('Failed to fetch default limit:', error);
      }
    };

    if (!isAuthenticated) {
      fetchDefaultLimit();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-w-0" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero Section with Phone Mockup */}
      <section className="relative overflow-hidden px-4 py-12 sm:py-16 md:py-20">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-20 blur-3xl" 
               style={{ backgroundColor: 'var(--accent-primary)' }} />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-20 blur-3xl" 
               style={{ backgroundColor: 'var(--success)' }} />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 sm:mb-6"
          >
            <Image
              src="/logo.png"
              alt="Okolea"
              width={80}
              height={80}
              className="mx-auto rounded-2xl"
              priority
            />
          </motion.div>

          {/* Tagline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Fast cash in <span style={{ color: 'var(--accent-primary)' }}>minutes</span>
          </motion.h1>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mb-6 flex flex-wrap items-center justify-center gap-4 text-sm"
          >
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Secure & Safe</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Disbursed in 5 mins</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Low Interest Rates</span>
            </div>
          </motion.div>

          {/* Login/Register Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-semibold text-sm shadow-lg transition-all hover:shadow-xl"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '2px solid var(--border-light)' }}
              >
                Sign In
              </motion.button>
            </Link>
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-semibold text-sm shadow-lg transition-all hover:shadow-xl"
                style={{ backgroundColor: 'var(--button-primary)', color: 'var(--button-text)' }}
              >
                Create Account
              </motion.button>
            </Link>
          </motion.div>

          {/* Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto max-w-sm lg:max-w-md"
          >
            <div
              className="overflow-hidden rounded-3xl shadow-2xl"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6 lg:px-5 lg:pb-6 lg:pt-5 xl:px-6 xl:pb-7 xl:pt-6">
                {/* App Header */}
                <div
                  className="mb-5 rounded-2xl px-4 py-5 text-center"
                  style={{
                    backgroundColor: 'var(--bg-card-alt)',
                  }}
                >
                  <p className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Apply for a loan up to
                  </p>
                  <div className="mb-1 mx-auto h-px w-16" style={{ backgroundColor: 'var(--accent-primary)' }} />
                  <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {maxLoanAmount.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--accent-primary)' }}>KSh</p>

                  <Link href="/apply">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-4 w-full rounded-full py-3 text-sm font-semibold transition-all hover:opacity-90"
                      style={{ backgroundColor: 'var(--button-text)', color: 'var(--button-primary)' }}
                    >
                      APPLY NOW
                    </motion.button>
                  </Link>

                  {/* Interest Rate Badge */}
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1" 
                       style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Interest from</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>5%</span>
                  </div>
                </div>

                {/* Loan Process */}
                <div className="mb-4">
                  <p className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Simple 3-step process
                  </p>
                  <div className="flex items-start justify-between gap-2">
                    {[
                      { num: '01', label: 'Apply online', desc: '2 minutes' },
                      { num: '02', label: 'Get approved', desc: 'Instant' },
                      { num: '03', label: 'Receive cash', desc: 'Via M-Pesa' },
                    ].map((step) => (
                      <div key={step.num} className="flex flex-1 flex-col items-center text-center">
                        <div className="relative mb-2 flex items-center justify-center">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--accent-primary)',
                              border: '2px solid var(--accent-primary)',
                            }}
                          >
                            {step.num}
                          </div>
                        </div>
                        <p className="text-[10px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {step.label}
                        </p>
                        <p className="text-[8px]" style={{ color: 'var(--text-secondary)' }}>
                          {step.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {(stats.activeUsers / 1000).toFixed(0)}K+
                    </p>
                    <p className="text-[8px]" style={{ color: 'var(--text-secondary)' }}>Happy Customers</p>
                  </div>
                  <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {(stats.loansDisbursed / 1000000).toFixed(0)}M+
                    </p>
                    <p className="text-[8px]" style={{ color: 'var(--text-secondary)' }}>KSh Disbursed</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div>
                    <p className="mb-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Contact us
                    </p>
                    <p className="text-[11px] leading-relaxed sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                      24/7 support on WhatsApp
                    </p>
                  </div>
                  <a
                    href="https://wa.me/254799333014"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:opacity-90 sm:px-4"
                    style={{ backgroundColor: '#25D366', color: 'white' }}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    0799333014
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-12 sm:py-16">
        <div className="relative z-10 mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-center text-2xl font-bold sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Why choose <span style={{ color: 'var(--accent-primary)' }}>Okolea</span>?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-10 text-center text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Quick, secure, and transparent loans with no hidden fees
          </motion.p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { 
                title: 'Instant Approval', 
                description: 'Get approved in minutes with our automated system',
                icon: Clock,
                color: 'var(--accent-primary)'
              },
              { 
                title: 'Low Interest', 
                description: 'Competitive rates starting from 5%',
                icon: TrendingUp,
                color: 'var(--success)'
              },
              { 
                title: 'No Collateral', 
                description: 'Unsecured loans based on your credit tier',
                icon: Shield,
                color: 'var(--warning)'
              },
              { 
                title: 'M-Pesa Disbursement', 
                description: 'Cash sent directly to your phone',
                icon: CreditCard,
                color: 'var(--accent-primary)'
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group rounded-2xl p-5 text-center transition-all duration-300 hover:shadow-xl"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '2px solid var(--border-light)',
                }}
              >
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: feature.color + '20' }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                </div>
                <h3 className="mb-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="relative px-4 py-12 sm:py-16" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
        <div className="relative z-10 mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center text-2xl font-bold sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Ready to get started?
          </motion.h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { title: 'Apply for Loan', description: 'Get up to KSh 50,000', link: '/apply', icon: DollarSign },
              { title: 'Repay Loan', description: 'Pay your dues on time', link: '/repay', icon: CreditCard },
              { title: 'My Loans', description: 'View active loans', link: '/myloans', icon: FileText },
            ].map((action, index) => (
              <Link key={action.title} href={action.link}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-2xl"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '2px solid var(--border-light)',
                  }}
                >
                  <div
                    className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  />
                  
                  <div className="relative z-10">
                    <div
                      className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: 'var(--button-primary)' }}
                    >
                      <action.icon className="h-5 w-5" style={{ color: 'var(--button-text)' }} />
                    </div>
                    
                    <h3 className="mb-2 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {action.title}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {action.description}
                    </p>
                    
                    <div className="mt-3 flex items-center gap-2 transition-transform duration-300 group-hover:translate-x-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--button-primary)' }}>
                        Get started
                      </span>
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        style={{ color: 'var(--button-primary)' }}
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-16">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-2xl font-bold sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Join thousands of satisfied customers
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Get the funds you need in minutes, not days
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 rounded-full font-semibold text-sm shadow-lg transition-all hover:shadow-xl"
                style={{ backgroundColor: 'var(--button-primary)', color: 'var(--button-text)' }}
              >
                Create Free Account
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}