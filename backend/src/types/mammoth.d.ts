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