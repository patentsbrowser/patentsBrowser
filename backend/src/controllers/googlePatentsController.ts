import { Request, Response } from 'express';
import axios from 'axios';

export const searchGooglePatents = async (req: Request, res: Response) => {
  try {
    const { country, country_pref, type, exp, peid } = req.query;
    
    // Get all num parameters from the query
    const numParams = Object.entries(req.query)
      .filter(([key]) => key === 'num')
      .map(([_, value]) => value);

    // Create the URL with the exact format that works in browser
    const baseUrl = 'https://patents.google.com/api/match';
    const queryParams = new URLSearchParams();
    
    // Add all num parameters
    numParams.forEach(num => {
      queryParams.append('num', num as string);
    });
    
    // Add other parameters
    if (country) queryParams.append('country', country as string);
    if (country_pref) queryParams.append('country_pref', country_pref as string);
    if (type) queryParams.append('type', type as string);
    if (exp) queryParams.append('exp', exp as string);
    if (peid) queryParams.append('peid', peid as string);

    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://patents.google.com',
        'Referer': 'https://patents.google.com/'
      }
    });

    // Process the response
    if (response.data && response.data.result) {
      // Filter out empty results and map to a more useful format
      const processedResults = response.data.result
        .filter((item: any) => item.match && item.match.length > 0)
        .map((item: any) => ({
          originalId: item.match[0].id,
          ucid: item.match[0].ucid
        }));

      res.json({
        success: true,
        results: processedResults
      });
    } else {
      res.json({
        success: false,
        error: 'Invalid response format from Google Patents API',
        rawResponse: response.data
      });
    }
  } catch (error) {
    console.error('Error calling Google Patents API:', error);
    
    // Check if it's an Axios error
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to fetch data from Google Patents API',
        details: error.message,
        response: error.response?.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch data from Google Patents API',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}; 