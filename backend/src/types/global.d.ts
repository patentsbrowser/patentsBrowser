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