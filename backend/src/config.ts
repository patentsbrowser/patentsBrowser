export const UNIFIED_PATENTS_API_KEY = process.env.UNIFIED_PATENTS_API_KEY;
export const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

if (!UNIFIED_PATENTS_API_KEY) {
  throw new Error('UNIFIED_PATENTS_API_KEY is not set in environment variables');
}

if (!SERPAPI_API_KEY) {
  throw new Error('SERPAPI_API_KEY is not set in environment variables');
} 