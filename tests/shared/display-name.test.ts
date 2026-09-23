import { describe, expect, it } from 'vitest'
import { clampDisplayName, countGraphemes, normalizeDisplayName, parseDisplayName } from '@shared/display-name'
import { buildFragment, parseFragment } from '@shared/fragment'

describe('normalizeDisplayName', () => {
  it('NFKC で全角英数・半角カナをそろえる', () => {
    expect(normalizeDisplayName('ＡＢＣ１２３ｱｲｳ')).toBe('ABC123アイウ')
  })

  it('双方向制御・ゼロ幅文字・制御文字を取り除く', () => {
    expect(normalizeDisplayName('a‮b​c⁦d\u0007e﻿')).toBe('abcde')
  })

  it('結合絵文字（ZWJ）は残す', () => {
    expect(normalizeDisplayName('👩‍👩‍👧')).toBe('👩‍👩‍👧')
    expect(countGraphemes('👩‍👩‍👧')).toBe(1)
  })

  it('空白をまとめて前後を削る', () => {
    expect(normalizeDisplayName('  あ　　い\n\tう ')).toBe('あ い う')
  })
})

describe('文字数', () => {
  it('書記素クラスタで数える', () => {
    expect(countGraphemes('ぱふゅーむ')).toBe(5)
    expect(countGraphemes('🇯🇵🇯🇵')).toBe(2)
    expect(countGraphemes('が')).toBe(1) // 結合文字（NFD）
  })

  it('入力欄では 10 文字で切る', () => {
    expect(clampDisplayName('あいうえおかきくけこさ')).toBe('あいうえおかきくけこ')
    expect(clampDisplayName('🇯🇵'.repeat(11))).toBe('🇯🇵'.repeat(10))
  })

  it('URL からは 10 文字を超えたら無視する', () => {
    expect(parseDisplayName('あいうえおかきくけこ')).toBe('あいうえおかきくけこ')
    expect(parseDisplayName('あいうえおかきくけこさ')).toBeNull()
    expect(parseDisplayName('​')).toBeNull()
  })
})

describe('fragment', () => {
  it('名前を往復できる', () => {
    for (const name of ['あもん', 'A B', 'a&n=b', '100%', '👩‍👩‍👧']) {
      expect(parseFragment(buildFragment({ name }))).toEqual({ name })
    }
  })

  it('名前がなければ空', () => {
    expect(buildFragment({ name: null })).toBe('')
    expect(parseFragment('')).toEqual({ name: null })
  })

  it('知らないキーは無視する', () => {
    expect(parseFragment('#x=1&n=%E3%81%82&y=2')).toEqual({ name: 'あ' })
  })
})
