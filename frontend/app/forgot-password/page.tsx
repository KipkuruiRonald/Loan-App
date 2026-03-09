'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, ArrowRight, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import GlassCard from '@/components/GlassCard';
import { validateRequired, isValidEmail, validatePhoneNumber } from '@/lib/validation';

interface FormErrors {
  contact?: string;
}

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({
    contact: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate contact (email or phone)
    const contactError = validateRequired(formData.contact, 'Email or phone number');
    if (contactError) {
      newErrors.contact = contactError;
    } else {
      // Check if it's a valid email or phone
      const isEmail = isValidEmail(formData.contact);
      const isPhone = validatePhoneNumber(formData.contact);
      
      if (!isEmail && !isPhone) {
        newErrors.contact = 'Please enter a valid email or phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = () => {
    if (formData.contact) {
      const isEmail = isValidEmail(formData.contact);
      const isPhone = validatePhoneNumber(formData.contact);
      
      if (!isEmail && !isPhone) {
        setErrors({ contact: 'Please enter a valid email or phone number' });
      } else {
        setErrors({});
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success - show message
      setSuccess(true);
      setFormData({ contact: '' });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        setError('No account found with this email or phone number. Please check and try again.');
      } else {
        setError('Failed to send reset link. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData({ contact: value });
    if (errors.contact) {
      setErrors({});
    }
    setError('');
    setSuccess(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--bg-card-alt)', opacity: 0.3 }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.2 }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Logo/Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="Okolea"
              width={60}
              height={60}
              className="rounded-xl"
              priority
            />
          </Link>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Password Recovery
          </p>
        </motion.div>

        <GlassCard hover={false} className="p-8">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: 'rgba(109, 116, 100, 0.1)', border: '1px solid var(--border-light)' }}
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Reset Link Sent!
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Check your email or SMS for reset instructions. The link will expire in 24 hours.
                </p>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)' }}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </motion.div>
          )}

          {!success ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Forgot Password?
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Enter your email or phone number to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email or Phone Input */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2">
                      <Mail className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--border-light)' }}>|</span>
                    </div>
                    <input
                      type="text"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      placeholder="Enter your email or phone"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all duration-300 ${
                        errors.contact 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--border-light)] focus:border-[var(--button-primary)]'
                      }`}
                      style={{ 
                        backgroundColor: 'rgba(212, 200, 181, 0.5)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  {errors.contact && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-500"
                    >
                      {errors.contact}
                    </motion.p>
                  )}
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    We&apos;ll send you a reset link via email or SMS
                  </p>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: 'var(--button-primary)',
                    color: 'var(--button-text)'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <CheckCircle className="h-8 w-8" style={{ color: 'var(--button-text)' }} />
              </motion.div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSuccess(false)}
                  className="font-medium underline"
                  style={{ color: 'var(--button-primary)' }}
                >
                  try again
                </button>
              </p>
            </div>
          )}

          {/* Back to Login */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm transition-colors hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </motion.div>
        </GlassCard>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Need help? Contact us at{' '}
          <a href="mailto:support@okolea.co.ke" className="underline">
            support@okolea.co.ke
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
