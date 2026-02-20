'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send,
  Loader2,
  CheckCircle,
  MessageCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { validateRequired, isValidEmail } from '@/lib/validation';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

// Contact methods data
const contactMethods = [
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: 'WhatsApp',
    value: '0799 333 014',
    description: 'Quick chat for instant support',
    link: 'https://wa.me/254799333014',
    primary: true
  },
  {
    icon: <Phone className="h-6 w-6" />,
    title: 'Phone',
    value: '+254 700 000 000',
    description: 'Mon-Fri 8am-6pm',
    link: 'tel:+254700000000'
  },
  {
    icon: <Mail className="h-6 w-6" />,
    title: 'Email',
    value: 'support@okoleo.co.ke',
    description: 'We reply within 24 hours',
    link: 'mailto:support@okoleo.co.ke'
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: 'Office',
    value: 'Nairobi, Kenya',
    description: 'Visit us during office hours'
  },
];

// Office hours
const officeHours = [
  { days: 'Monday - Friday', hours: '8:00 AM - 6:00 PM' },
  { days: 'Saturday', hours: '9:00 AM - 2:00 PM' },
  { days: 'Sunday', hours: 'Closed' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const nameError = validateRequired(formData.name, 'Name');
    if (nameError) newErrors.name = nameError;
    
    const emailError = validateRequired(formData.email, 'Email');
    if (!newErrors.email && formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    const subjectError = validateRequired(formData.subject, 'Subject');
    if (subjectError) newErrors.subject = subjectError;
    
    const messageError = validateRequired(formData.message, 'Message');
    if (messageError) newErrors.message = messageError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: keyof FormErrors) => {
    const newErrors = { ...errors };
    if (field === 'name' && formData.name) {
      const error = validateRequired(formData.name, 'Name');
      if (error) newErrors.name = error;
      else delete newErrors.name;
    }
    if (field === 'email' && formData.email) {
      if (!isValidEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        delete newErrors.email;
      }
    }
    if (field === 'subject' && formData.subject) {
      const error = validateRequired(formData.subject, 'Subject');
      if (error) newErrors.subject = error;
      else delete newErrors.subject;
    }
    if (field === 'message' && formData.message) {
      const error = validateRequired(formData.message, 'Message');
      if (error) newErrors.message = error;
      else delete newErrors.message;
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const fieldName = name as keyof FormErrors;
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'var(--bg-card-alt)', opacity: 0.3 }} />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.15 }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'var(--button-primary)', opacity: 0.1 }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Contact Us
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            We&apos;re here to help. Reach out through any of our channels.
          </p>
        </motion.div>

        {/* Contact Methods Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12"
        >
          {contactMethods.map((method, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <GlassCard 
                hover={true} 
                className={`p-6 h-full ${method.primary ? 'border-2' : ''}`}
                style={method.primary ? { borderColor: 'var(--button-primary)' } : {}}
              >
                <div className="flex flex-col items-center text-center">
                  <div 
                    className={`p-3 rounded-xl mb-4 ${method.primary ? '' : ''}`}
                    style={{ 
                      backgroundColor: method.primary ? 'var(--button-primary)' : 'var(--bg-card-alt)',
                    }}
                  >
                    <span style={{ color: method.primary ? 'var(--button-text)' : 'var(--text-primary)' }}>
                      {method.icon}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {method.title}
                  </h3>
                  {method.link ? (
                    <a 
                      href={method.link}
                      target={method.link.startsWith('http') ? '_blank' : undefined}
                      rel={method.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm hover:underline flex items-center gap-1"
                      style={{ color: 'var(--button-primary)' }}
                    >
                      {method.value}
                      {method.link.startsWith('http') && <ExternalLink className="h-3 w-3" />}
                    </a>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {method.value}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {method.description}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <GlassCard hover={false} className="p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                Send Us a Message
              </h2>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div 
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <CheckCircle className="h-8 w-8" style={{ color: 'var(--button-text)' }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Message Sent!
                  </h3>
                  <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Thank you for contacting us. We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-sm underline"
                    style={{ color: 'var(--button-primary)' }}
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={() => handleBlur('name')}
                      placeholder="Your full name"
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 ${
                        errors.name 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--border-light)] focus:border-[var(--button-primary)]'
                      }`}
                      style={{ 
                        backgroundColor: 'rgba(212, 200, 181, 0.5)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur('email')}
                      placeholder="your@email.com"
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 ${
                        errors.email 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--border-light)] focus:border-[var(--button-primary)]'
                      }`}
                      style={{ 
                        backgroundColor: 'rgba(212, 200, 181, 0.5)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      onBlur={() => handleBlur('subject')}
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 ${
                        errors.subject 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--border-light)] focus:border-[var(--button-primary)]'
                      }`}
                      style={{ 
                        backgroundColor: 'rgba(212, 200, 181, 0.5)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="loan">Loan Related</option>
                      <option value="payment">Payment Issues</option>
                      <option value="technical">Technical Support</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      onBlur={() => handleBlur('message')}
                      placeholder="How can we help you?"
                      rows={5}
                      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 resize-none ${
                        errors.message 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[var(--border-light)] focus:border-[var(--button-primary)]'
                      }`}
                      style={{ 
                        backgroundColor: 'rgba(212, 200, 181, 0.5)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                    )}
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
                        Send Message
                        <Send className="h-5 w-5" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </GlassCard>
          </motion.div>

          {/* Office Hours & FAQ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Office Hours */}
            <GlassCard hover={false} className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6" style={{ color: 'var(--button-primary)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Office Hours
                </h2>
              </div>
              <div className="space-y-3">
                {officeHours.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span style={{ color: 'var(--text-secondary)' }}>{item.days}</span>
                    <span 
                      className="font-medium"
                      style={{ 
                        color: item.hours === 'Closed' ? 'var(--text-secondary)' : 'var(--text-primary)'
                      }}
                    >
                      {item.hours}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* FAQ Link */}
            <GlassCard hover={true} className="p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Need Quick Answers?
              </h2>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                Check our frequently asked questions for instant solutions to common queries.
              </p>
              <Link href="/faq">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: 'var(--bg-card-alt)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  View FAQ
                  <ExternalLink className="h-4 w-4" />
                </motion.button>
              </Link>
            </GlassCard>

            {/* Emergency Contact */}
            <div className="p-6 md:p-8 rounded-xl" style={{ backgroundColor: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.1)' }}>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Urgent Inquiries
                </h2>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                For urgent matters related to your loan or payments, please call us directly or message us on WhatsApp for faster response.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
