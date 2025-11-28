/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['github.com', 'avatars.githubusercontent.com'],
  },
  // Enable instrumentation for startup validation
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
