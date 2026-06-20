import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': ['./hail.db', './public/**/*', './node_modules/sql.js/dist/**/*.wasm'],
  },
};

export default nextConfig;
