/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ビルド時に scripts/generate-apple-token.ts で作る Apple Music の開発者トークン */
  readonly VITE_APPLE_DEVELOPER_TOKEN?: string
  /** 開発者トークンの有効期限（UNIX 秒） */
  readonly VITE_APPLE_DEVELOPER_TOKEN_EXP?: string
}
