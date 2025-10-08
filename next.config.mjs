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

    // 服务端特殊处理
    if (isServer) {
      // 将tiktoken标记为外部依赖，不让Next.js打包处理
      // 这样可以确保运行时使用完整的node_modules中的tiktoken
      config.externals = config.externals || [];
      config.externals.push('tiktoken');
    }

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
