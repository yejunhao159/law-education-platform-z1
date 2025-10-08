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
  webpack: (config, { isServer }) => {
    // 配置pdf.js worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // 修复 tiktoken WebAssembly 文件加载问题
    if (isServer) {
      // 确保 tiktoken 正确解析
      config.resolve.alias = {
        ...config.resolve.alias,
        'tiktoken': require.resolve('tiktoken'),
      };
    }

    return config;
  },
}

export default nextConfig
