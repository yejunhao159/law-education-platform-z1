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

    // 注意：tiktoken WebAssembly 文件已在 Dockerfile 中手动复制
    // 无需在此处配置 alias

    return config;
  },
}

export default nextConfig
