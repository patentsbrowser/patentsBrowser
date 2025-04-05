declare module 'serpapi' {
  export function getJson(params: Record<string, any>): Promise<any>;
  export const google_search: (params: Record<string, any>) => Promise<any>;
} 