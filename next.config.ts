import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': [
      './hail.db',
      './public/sql-wasm.wasm',
      './node_modules/sql.js/dist/**/*.wasm',
    ],
    '/api/**/*': [
      '../../hail.db',
    ],
  },
};

export default nextConfig;
