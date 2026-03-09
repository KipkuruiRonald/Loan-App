/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment - use default output
  // Set output: 'export' only for static hosting ( Capacitor )
  output: process.env.VERCEL ? undefined : (process.env.NODE_ENV === 'production' ? 'export' : undefined),
  reactStrictMode: true,
  swcMinify: true,
  // Required for static export
  images: {
    unoptimized: true,
  },
  // Vercel handles trailing slash differently
  trailingSlash: true,
};

module.exports = nextConfig;
