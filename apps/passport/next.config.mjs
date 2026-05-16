import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@cubid/auth',
    '@cubid/config',
    '@cubid/identity',
    '@cubid/stamps',
    '@cubid/types',
  ],
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@trufflesuite/bigint-buffer': require.resolve(
        '@trufflesuite/bigint-buffer/dist/browser.js'
      ),
      'bigint-buffer': require.resolve('bigint-buffer/dist/browser.js'),
      'buffer-to-arraybuffer': new URL(
        './lib/browser/buffer-to-arraybuffer.cjs',
        import.meta.url
      ).pathname,
    }
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
