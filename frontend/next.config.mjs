/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Chrome may open the local dev server as either localhost or 127.0.0.1.
  // Next's dev resource checks must allow both origins or client hydration can stall.
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
