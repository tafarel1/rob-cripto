declare module 'express' {
  export interface Request {
    params: Record<string, string>
    query: Record<string, unknown>
    body: unknown
    [key: string]: unknown
  }
  export interface Response {
    status: (code: number) => Response
    json: (body: unknown) => Response
  }
  export type NextFunction = (err?: unknown) => void
  export interface Router {
    get: (...args: unknown[]) => Router
    post: (...args: unknown[]) => Router
    delete: (...args: unknown[]) => Router
    use: (...args: unknown[]) => Router
  }
  export interface Application {
    (req: Request, res: Response, next?: NextFunction): unknown
    use: (...args: unknown[]) => void
    listen: (port: number | string, cb?: () => void) => unknown
  }
  export interface ExpressExport {
    (): Application
    json: (...args: unknown[]) => unknown
    urlencoded: (...args: unknown[]) => unknown
  }
  const express: ExpressExport
  export default express
  export function Router(): Router
}

declare module './routes/auth.js' {
  import type { Router } from 'express'
  const router: Router
  export default router
}

declare module './routes/trading.js' {
  import type { Router } from 'express'
  const router: Router
  export default router
}

declare module './routes/account.js' {
  import type { Router } from 'express'
  const router: Router
  export default router
}

declare module './routes/automatedTrading.js' {
  import type { Router } from 'express'
  const router: Router
  export default router
}

declare module '@vercel/node' {
  import type { Request, Response } from 'express'
  export type VercelRequest = Request
  export type VercelResponse = Response
}

declare module '@supabase/supabase-js' {
  export function createClient(...args: unknown[]): unknown
}
