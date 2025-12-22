// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  // Configure rewrites for backend services
  async rewrites() {
    return [
      {
        source: '/api/chat/:path*',
        destination: process.env.NEXT_PUBLIC_ORCHESTRATION_SERVICE_URL 
          ? `${process.env.NEXT_PUBLIC_ORCHESTRATION_SERVICE_URL}/:path*`
          : '/api/chat/:path*',
      },
      {
        source: '/api/verify/:path*',
        destination: process.env.NEXT_PUBLIC_ADDRESS_VERIFICATION_SERVICE_URL
          ? `${process.env.NEXT_PUBLIC_ADDRESS_VERIFICATION_SERVICE_URL}/:path*`
          : '/api/verify/:path*',
      },
    ];
  },
};

module.exports = nextConfig;