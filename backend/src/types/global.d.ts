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
      // Replace Multer.File with a simple type definition
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      };
      files?: {
        [fieldname: string]: Array<{
          fieldname: string;
          originalname: string;
          encoding: string;
          mimetype: string;
          size: number;
          destination: string;
          filename: string;
          path: string;
          buffer: Buffer;
        }>;
      } | Array<{
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }>;
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

// Add type definitions for missing modules
declare module 'jsonwebtoken' {
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: object): string;
  export function verify(token: string, secretOrPublicKey: string, options?: object): any;
  export function decode(token: string, options?: object): any | null;
}

declare module 'multer' {
  interface Options {
    dest?: string;
    storage?: any;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?(req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void): void;
    preservePath?: boolean;
  }

  function multer(options?: Options): any;
  
  namespace multer {
    function diskStorage(options: {
      destination?: string | ((req: any, file: any, cb: (error: Error | null, destination: string) => void) => void);
      filename?(req: any, file: any, cb: (error: Error | null, filename: string) => void): void;
    }): any;

    function memoryStorage(): any;
  }

  export = multer;
} 