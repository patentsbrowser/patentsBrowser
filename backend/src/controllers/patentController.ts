import { Request, Response } from 'express';
import { getJson } from 'serpapi';

const SERP_API_KEY = process.env.SERP_API_KEY;
const API_URL = process.env.API_URL;

export const searchPatents = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Search query is required',
        data: null
      });
    }

    const response = await getJson({
      engine: "google_patents",
      api_key: SERP_API_KEY,
      q: query as string
    });

    res.status(200).json({
      statusCode: 200,
      message: 'Patents fetched successfully',
      data: response
    });
  } catch (error) {
    console.error('Error searching patents:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to search patents',
      data: null
    });
  }
}; 