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

    // 配置WASM文件支持
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // 确保WASM文件被正确处理
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
}

export default nextConfig
