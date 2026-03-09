'use client';

import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  const [message, setMessage] = useState('');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState<{ 
    hours: string; 
    minutes: string; 
    seconds: string;
    totalMinutes: number;
    percentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/admin/maintenance/status')
      .then(res => res.json())
      .then(data => {
        console.log('[Maintenance Page] API Response:', data);
        setLoading(false);
        setMessage(data.message || '');
        setEstimatedDuration(data.estimated_duration || 0);
        
        if (data.start_time && data.estimated_duration) {
          const start = new Date(data.start_time);
          const end = new Date(start.getTime() + data.estimated_duration * 60000);
          setEndTime(end.toISOString());
        } else if (data.end_time) {
          setEndTime(data.end_time);
        }
      })
      .catch(err => {
        console.error('[Maintenance Page] Error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!endTime) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;
      
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft(null);
        // Auto-refresh when countdown ends
        window.location.reload();
      } else {
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        const totalMinutes = (hours * 60) + minutes + (seconds / 60);
        
        // Calculate percentage - use estimatedDuration or default to 60 minutes
        const totalDuration = (estimatedDuration || 60) * 60 * 1000;
        const percentage = Math.max(0, Math.min(100, (distance / totalDuration) * 100));
        
        setTimeLeft({
          hours: hours.toString().padStart(2, '0'),
          minutes: minutes.toString().padStart(2, '0'),
          seconds: seconds.toString().padStart(2, '0'),
          totalMinutes: parseFloat(totalMinutes.toFixed(1)),
          percentage: percentage
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [endTime, estimatedDuration]);

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#E8E4DC' }}
      >
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
          style={{ backgroundColor: '#CABAA1' }}
        >
          <Wrench className="w-8 h-8" style={{ color: '#3E3D39' }} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#E8E4DC' }}
    >
      <div 
        className="w-full max-w-md rounded-2xl p-8 text-center shadow-xl"
        style={{ backgroundColor: '#D5BFA4' }}
      >
        {/* Logo/Brand */}
        <div className="mb-6">
          <h1 
            className="text-2xl font-bold"
            style={{ color: '#050505' }}
          >
            Okolea
          </h1>
        </div>

        {/* Maintenance Icon */}
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: '#CABAA1' }}
        >
          <Wrench className="w-10 h-10" style={{ color: '#3E3D39' }} />
        </div>
        
        {/* Title */}
        <h2 
          className="text-xl font-bold mb-2"
          style={{ color: '#050505' }}
        >
          Under Maintenance
        </h2>
        
        {/* Message */}
        {message && (
          <p 
            className="mb-6"
            style={{ color: '#6D7464' }}
          >
            {message}
          </p>
        )}
        
        {/* Circle Countdown Timer */}
        {timeLeft && (
          <div className="mb-6 flex flex-col items-center">
            {/* Circular Progress Indicator */}
            <div className="relative w-40 h-40 mb-4">
              {/* Background Circle */}
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#CABAA1"
                  strokeWidth="8"
                />
                {/* Progress Circle - Fades as time decreases */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#3E3D39"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - timeLeft.percentage / 100)}
                  style={{
                    transition: 'stroke-dashoffset 1s linear',
                    opacity: timeLeft.percentage / 100
                  }}
                />
              </svg>
              
              {/* Center Text - Minutes Remaining */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                  className="text-3xl font-bold"
                  style={{ color: '#3E3D39' }}
                >
                  {Math.floor(timeLeft.totalMinutes)}
                </span>
                <span 
                  className="text-xs"
                  style={{ color: '#6D7464' }}
                >
                  min
                </span>
              </div>
            </div>
            
            {/* Digital Time Display */}
            <div className="flex justify-center gap-3">
              {timeLeft.hours !== '00' && (
                <div className="text-center">
                  <div 
                    className="text-2xl font-bold font-mono"
                    style={{ color: '#3E3D39' }}
                  >
                    {timeLeft.hours}
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: '#6D7464' }}
                  >
                    hr
                  </div>
                </div>
              )}
              <div className="text-center">
                <div 
                  className="text-2xl font-bold font-mono"
                  style={{ color: '#3E3D39' }}
                >
                  {timeLeft.minutes}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: '#6D7464' }}
                >
                  min
                </div>
              </div>
              <div className="text-center">
                <div 
                  className="text-2xl font-bold font-mono"
                  style={{ color: '#3E3D39' }}
                >
                  {timeLeft.seconds}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: '#6D7464' }}
                >
                  sec
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
