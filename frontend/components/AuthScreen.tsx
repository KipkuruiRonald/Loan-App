'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthScreen() {
  const [showLogin, setShowLogin] = useState(true);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ backgroundColor: '#D4C8B5' }}>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30"
             style={{ backgroundColor: '#C4A995' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20"
             style={{ backgroundColor: '#3E3D39' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Brand & Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <Image
                src="/logo.png"
                alt="Okolea"
                width={50}
                height={50}
                className="rounded-lg"
                priority
              />
              <h1 className="text-4xl font-bold" style={{ color: '#050505' }}>
                Okolea
              </h1>
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: '#050505' }}>
              Welcome to Your<br />Financial Freedom
            </h2>
            
            <p className="text-lg mb-8" style={{ color: '#3E3D39' }}>
              Quick, transparent loans for Kenyans. Join thousands of satisfied customers.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
              {[
                { icon: Zap, text: '9-Day Loans' },
                { icon: Shield, text: 'Secure & Safe' },
                { icon: Users, text: '25K+ Customers' },
                { icon: ArrowRight, text: '4% Interest' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ backgroundColor: '#D5BFA4' }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: '#3E3D39' }} />
                  <span className="text-sm font-medium" style={{ color: '#050505' }}>
                    {feature.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Auth Forms */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            {/* Toggle Buttons */}
            <div className="flex rounded-xl p-1 mb-6" style={{ backgroundColor: '#D5BFA4' }}>
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  showLogin ? 'shadow-lg' : ''
                }`}
                style={{
                  backgroundColor: showLogin ? '#3E3D39' : 'transparent',
                  color: showLogin ? '#D4C8B5' : '#050505',
                }}
              >
                Login
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  !showLogin ? 'shadow-lg' : ''
                }`}
                style={{
                  backgroundColor: !showLogin ? '#3E3D39' : 'transparent',
                  color: !showLogin ? '#D4C8B5' : '#050505',
                }}
              >
                Register
              </button>
            </div>

            {/* Auth Card */}
            <div className="rounded-2xl p-8 shadow-xl" style={{ backgroundColor: '#D5BFA4' }}>
              {showLogin ? <LoginForm /> : <RegisterForm />}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Login Form Component
function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData.identifier, formData.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#050505' }}>
        Welcome Back
      </h2>
      
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#C4A995', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="Username or Email"
          value={formData.identifier}
          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
          required
          className="w-full px-4 py-3 rounded-xl outline-none"
          style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          className="w-full px-4 py-3 rounded-xl outline-none"
          style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90"
        style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <div className="text-center text-sm" style={{ color: '#3E3D39' }}>
        <Link href="/forgot-password" className="hover:underline">
          Forgot Password?
        </Link>
      </div>
    </form>
  );
}

// Register Form Component
function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push('/login');
      } else {
        const data = await res.json();
        setError(data.detail || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#050505' }}>
        Create Account
      </h2>
      
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#C4A995', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Full Name"
        value={formData.full_name}
        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
        required
        className="w-full px-4 py-3 rounded-xl outline-none"
        style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
      />

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        className="w-full px-4 py-3 rounded-xl outline-none"
        style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
      />

      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        className="w-full px-4 py-3 rounded-xl outline-none"
        style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
      />

      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
        className="w-full px-4 py-3 rounded-xl outline-none"
        style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
      />

      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        className="w-full px-4 py-3 rounded-xl outline-none"
        style={{ backgroundColor: '#C4A995', border: '1px solid #B4A58B', color: '#050505' }}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90"
        style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
      >
        {loading ? 'Creating Account...' : 'Register'}
      </button>
    </form>
  );
}
