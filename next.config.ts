import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable typed routes for better route safety
  typedRoutes: true,
  // ESLint and TypeScript strict checking enabled - all errors must be fixed
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;