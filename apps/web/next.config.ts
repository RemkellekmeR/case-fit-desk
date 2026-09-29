import type {NextConfig} from 'next'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.join(__dirname, '../..')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    '/api/fit': ['../../seed/**/*', '../../kb-sources/**/*'],
    '/api/chat': ['../../seed/**/*', '../../kb-sources/**/*'],
  },
}

export default nextConfig
