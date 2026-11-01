/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Chrome may open the local dev server as either localhost or 127.0.0.1.
  // Next's dev resource checks must allow both origins or client hydration can stall.
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  async rewrites() {
    if (process.env.VERCEL && !process.env.BACKEND_URL) throw new Error('BACKEND_URL is required for Vercel builds.');
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
    const parsed = new URL(backendUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('BACKEND_URL must be an HTTP(S) origin.');
    if (process.env.VERCEL && parsed.protocol !== 'https:') throw new Error('Hosted BACKEND_URL must use HTTPS.');
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
