'use client';

import Image from 'next/image';

export default function LoadingLogo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Image
        src="/logo.png"
        alt="Loading..."
        width={100}
        height={100}
        className="animate-pulse rounded-2xl"
        priority
      />
      <p className="mt-4 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
        Loading Okolea...
      </p>
    </div>
  );
}
