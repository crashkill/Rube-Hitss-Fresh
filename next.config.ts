import type { NextConfig } from "next";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig: NextConfig = {
  output: 'standalone',
  // Set the root for file tracing to this project directory
  // This fixes the issue with nested standalone output when multiple lockfiles exist
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
