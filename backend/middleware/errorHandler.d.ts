import { Request, Response, NextFunction } from 'express';

export function handleApiErrors(err: any, req: Request, res: Response, next: NextFunction): void;
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
export function validateRequestBody(requiredFields: string[]): (req: Request, res: Response, next: NextFunction) => void;
export function handleCorsErrors(err: any, req: Request, res: Response, next: NextFunction): any;
export function ensureJsonResponse(req: Request, res: Response, next: NextFunction): void;
export function requestLogger(req: Request, res: Response, next: NextFunction): void;
