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
      file?: Express.Multer.File;
      files?: {
        [fieldname: string]: Express.Multer.File[];
      } | Express.Multer.File[];
      user?: {
        id: string;
        email: string;
        role: string;
      };
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