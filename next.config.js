/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'googleapis'],
  },
};

module.exports = nextConfig;
