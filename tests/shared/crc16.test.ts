import { expect, it } from 'vitest'
import { crc16 } from '@shared/crc16'

it('CRC-16/CCITT-FALSE のチェック値（"123456789" → 0x29B1）', () => {
  expect(crc16(new TextEncoder().encode('123456789'))).toBe(0x29b1)
})
