// API Configuration for Capacitor native app and PWA

// Default production API URL - change this to your actual production API
const PRODUCTION_API_URL = 'https://your-production-api.com';

// Development API URL - use localhost for local development
const DEVELOPMENT_API_URL = 'http://localhost:8000';

export const getApiUrl = (): string => {
  // Check if running in Capacitor native app
  if (typeof window !== 'undefined') {
    const capacitorProtocol = (window as any)?.location?.protocol;
    
    // If running in Capacitor native app (capacitor:// or file://)
    if (capacitorProtocol === 'capacitor:' || capacitorProtocol === 'file:') {
      // Use environment variable for native app, or fallback to localhost
      return process.env.NEXT_PUBLIC_API_URL || DEVELOPMENT_API_URL;
    }
  }
  
  // For web/PWA, use environment variable or default to localhost for dev
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || DEVELOPMENT_API_URL;
  }
  
  return PRODUCTION_API_URL;
};

// Export API URL constant for use in axios configuration
export const API_URL = getApiUrl();
