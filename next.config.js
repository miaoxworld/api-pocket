const withNextIntl = require('next-intl/plugin')();

const nextConfig = {
    eslint: {
      // 在构建过程中忽略ESLint错误
      ignoreDuringBuilds: true,
    },
  }

module.exports = withNextIntl(nextConfig);