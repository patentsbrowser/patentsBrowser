import { Request } from 'express';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Multer {
      any(): any;
      single(fieldname: string): any;
      array(fieldname: string, maxCount?: number): any;
      fields(fields: Array<{ name: string; maxCount?: number }>): any;
    }

    interface Request {
      file?: Multer.File;
      files?: {
        [fieldname: string]: Multer.File[];
      } | Multer.File[];
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }

  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }

  interface AuthRequest extends Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
    body: any;
  }
}

// For modules that don't have type definitions
declare module 'serpapi' {
  export function getJson(params: Record<string, any>): Promise<any>;
  export const google_search: (params: Record<string, any>) => Promise<any>;
}

declare module 'mammoth' {
  export function convertToHtml(input: Buffer | { buffer: Buffer } | { path: string }): Promise<{
    value: string;
    messages: any[];
  }>;
  
  export function extractRawText(input: Buffer | { buffer: Buffer } | { path: string }): Promise<{
    value: string;
    messages: any[];
  }>;
} 