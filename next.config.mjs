/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署优化：禁用standalone输出（避免构建时文件复制问题）
  // output: 'standalone', // 暂时禁用，等构建稳定后再启用

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer, nextRuntime }) => {
    // 配置pdf.js worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // 🔧 修复：启用现代 JS 特性支持
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,    // WASM 支持（tiktoken）
      topLevelAwait: true,        // 顶层 await 支持（pdfjs-dist）
    };

    // 添加 WASM 文件加载规则
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // 🔧 重要：只为客户端设置现代浏览器目标，避免影响 Edge Runtime
    // Edge Runtime 使用 'edge' 或 'edge-light'，不应设置 target
    if (!isServer && nextRuntime !== 'edge') {
      // 客户端浏览器环境
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
        crypto: false,
      };
    } else if (isServer && nextRuntime !== 'edge') {
      // Node.js 服务端环境
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }

    return config;
  },
}

export default nextConfig
