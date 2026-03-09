'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="mt-auto border-t"
      style={{ 
        borderColor: '#E5E0D5',
        backgroundColor: '#F5F2EB'
      }}
    >
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-xs" style={{ color: '#6D7464' }}>
          <span>© {currentYear} Okolea</span>
          <span className="text-gray-300">|</span>
          <Link 
            href="/about" 
            className="transition-colors hover:underline"
            style={{ color: '#6D7464' }}
          >
            About
          </Link>
          <span className="text-gray-300">|</span>
          <Link 
            href="/contact" 
            className="transition-colors hover:underline"
            style={{ color: '#6D7464' }}
          >
            Contact
          </Link>
          <span className="text-gray-300">|</span>
          <Link 
            href="/terms" 
            className="transition-colors hover:underline"
            style={{ color: '#6D7464' }}
          >
            Terms
          </Link>
          <span className="text-gray-300">|</span>
          <Link 
            href="/privacy" 
            className="transition-colors hover:underline"
            style={{ color: '#6D7464' }}
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
