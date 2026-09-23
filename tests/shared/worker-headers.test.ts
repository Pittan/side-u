import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { SECURITY_HEADERS } from '../../worker/headers'

it('Worker が付けるセキュリティヘッダーは public/_headers と同じ', () => {
  const file = readFileSync(resolve(import.meta.dirname, '../../public/_headers'), 'utf8')
  const global = file.split(/\n(?=\S)/)[0]!
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(global).toContain(`${name}: ${value}`)
  }
})
