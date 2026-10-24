/// <reference types="vite/client" />

import type { ResOrgApi } from '../electron/preload'

declare global {
  interface Window {
    resOrg: ResOrgApi
  }
}

export {}
