/// <reference types="node" />

// Basic Node.js modules
declare module 'fs' {}
declare module 'path' {}
declare module 'stream' {}
declare module 'url' {}
declare module 'crypto' {}

// Common npm packages
declare module 'express' {
  export interface Request {
    user?: any;
    file?: any;
    files?: any;
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
    header?: (name: string) => string | undefined;
  }
  export interface Response {
    status(code: number): Response;
    json(data: any): Response;
    send(data: any): Response;
    end(): Response;
  }
  export interface NextFunction {
    (err?: any): void;
  }
  export interface Router {
    get(path: string, ...handlers: any[]): Router;
    post(path: string, ...handlers: any[]): Router;
    put(path: string, ...handlers: any[]): Router;
    delete(path: string, ...handlers: any[]): Router;
    use(...handlers: any[]): Router;
    use(path: string, ...handlers: any[]): Router;
  }
  export function Router(): Router;
  export function json(): any;
  export function urlencoded(options: any): any;
  export function static(path: string, options?: any): any;
  
  const express: {
    (): any;
    Router: typeof Router;
    json: typeof json;
    urlencoded: typeof urlencoded;
    static: typeof static;
  };
  
  export default express;
}

declare module 'mongoose' {
  export interface Schema {
    new(definition: any, options?: any): Schema;
    add(obj: any): void;
    index(fields: any, options?: any): Schema;
    pre(method: string, fn: Function): Schema;
    set(key: string, value: any): Schema;
  }
  
  export interface Model<T> {
    new(doc: any): T;
    create(doc: any): Promise<T>;
    find(conditions: any): Promise<T[]>;
    findOne(conditions: any): Promise<T | null>;
    findById(id: any): Promise<T | null>;
    updateOne(conditions: any, doc: any): Promise<any>;
    deleteOne(conditions: any): Promise<any>;
  }
  
  export function model<T>(name: string, schema: Schema): Model<T>;
  export function Schema(definition: any, options?: any): Schema;
  export function connect(uri: string, options?: any): Promise<any>;
}

declare module 'jsonwebtoken' {
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: any): string;
  export function verify(token: string, secretOrPublicKey: string, options?: any): any;
  export function decode(token: string, options?: any): any | null;
}

declare module 'bcryptjs' {
  export function hash(data: string, salt: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
}

declare module 'cors' {
  function cors(options?: any): any;
  export default cors;
}

declare module 'dotenv' {
  export function config(options?: any): { parsed?: { [key: string]: string } };
}

declare module 'fs-extra' {
  export function readFile(file: string, options?: any): Promise<any>;
  export function writeFile(file: string, data: any, options?: any): Promise<void>;
  export function remove(path: string): Promise<void>;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: any): void;
}

declare module 'multer' {
  function multer(options?: any): any;
  
  namespace multer {
    function diskStorage(options: any): any;
    function memoryStorage(): any;
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
  
  export = multer;
}

declare module 'nodemailer' {
  export interface Transporter {
    sendMail(mailOptions: any): Promise<any>;
    verify(): Promise<boolean>;
  }
  
  export function createTransport(options: any): Transporter;
}

declare module 'xlsx' {
  export function readFile(filename: string): any;
  export const utils: {
    sheet_to_json(worksheet: any, options?: any): any[];
  };
}

declare module 'mammoth' {
  export function convertToHtml(options: any): Promise<{ value: string, messages: any[] }>;
  export function extractRawText(options: any): Promise<{ value: string, messages: any[] }>;
}

declare module 'serpapi' {
  export function getJson(params: any): Promise<any>;
}

declare module 'razorpay' {
  class Razorpay {
    constructor(options: any);
    customers: {
      create(data: any): Promise<any>;
    };
    orders: {
      create(data: any): Promise<any>;
      fetch(orderId: string): Promise<any>;
    };
    payments: {
      fetch(paymentId: string): Promise<any>;
      capture(options: any): Promise<any>;
    };
  }
  export default Razorpay;
} 