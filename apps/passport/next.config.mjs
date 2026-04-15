/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cubid/types'],
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        port: '',
      },
    ],
  },
}

export default nextConfig
