/** @type {import('next').NextConfig} */
const nextConfig = {
  // Generate static files for Capacitor (production only)
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  reactStrictMode: true,
  swcMinify: true,
  // Required for static export
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
