/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署优化：生成 standalone 输出
  output: 'standalone',

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // 配置pdf.js worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    return config;
  },
}

export default nextConfig
