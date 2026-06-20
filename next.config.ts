import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./hail.db', './node_modules/sql.js/dist/**/*', './public/sql-wasm.wasm'],
  },
};

export default nextConfig;
