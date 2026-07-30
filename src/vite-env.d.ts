/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ISO timestamp stamped by vite.config.ts at build (or dev-server start). */
  readonly VITE_BUILD_TIME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
