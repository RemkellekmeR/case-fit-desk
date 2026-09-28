#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'seed')
const file = 'all.ndjson'
const lines = readFileSync(join(root, file), 'utf8').trim().split('\n').filter(Boolean)
const byType = {}
for (const [i, line] of lines.entries()) {
  try {
    const doc = JSON.parse(line)
    if (!doc._id || !doc._type) throw new Error('missing _id or _type')
    byType[doc._type] = (byType[doc._type] || 0) + 1
  } catch (err) {
    console.error(`Invalid ${file}:${i + 1}`, err.message)
    process.exit(1)
  }
}
console.log(`${file}: ${lines.length} docs`, byType)
if ((byType.module || 0) < 30 || (byType.case || 0) < 3) {
  console.error('Expected >=30 modules and >=3 cases')
  process.exit(1)
}
console.log('OK')
