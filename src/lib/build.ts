import { formatStampBg } from "./dates";

/** ISO timestamp injected by vite.config.ts (`define`) at build time. */
export const BUILD_TIME: string = import.meta.env.VITE_BUILD_TIME ?? "";

export const IS_DEV: boolean = import.meta.env.DEV;

/**
 * Short label telling the two copies apart when localhost and the Netlify
 * deploy are open side by side: „dev 30.07.2026 14:22" vs „build 30.07…".
 */
export const BUILD_LABEL: string = BUILD_TIME
  ? `${IS_DEV ? "dev" : "build"} ${formatStampBg(BUILD_TIME)}`
  : IS_DEV
    ? "dev"
    : "build ?";
