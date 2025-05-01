import { Request, Response } from 'express';
import { getJson } from 'serpapi';
import { standardizePatentNumber } from '../utils/patentUtils.js';
import axios from 'axios';

const SERP_API_KEY = process.env.SERP_API_KEY;
const API_URL = process.env.API_URL;

// Use type instead of interface to avoid TypeScript extension issues
type AuthRequest = Request & {
  user?: {
    userId: string;
  };
  body: any;
};

export const searchPatents = async (req: AuthRequest, res: Response) => {
  try {
    const { query, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (!query) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Search query is required',
        data: null
      });
    }

    // Calculate start parameter for Google Patents API
    const start = (pageNum - 1) * limitNum;

    const params = {
      engine: 'google_patents',
      q: query,
      api_key: process.env.SERPAPI_KEY,
      start,
      num: limitNum
    };

    const response = await getJson(params);

    // Calculate pagination details
    const totalResults = response.search_information?.total_results || 0;
    const totalPages = Math.ceil(totalResults / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    // Format the response to include pagination information
    const formattedResponse = {
      statusCode: 200,
      message: 'Search completed successfully',
      data: {
        results: response.organic_results || [],
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalResults,
          resultsPerPage: limitNum,
          hasNextPage,
          hasPreviousPage
        }
      }
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error('Error searching patents:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to search patents',
      data: null
    });
  }
};

export const searchMultiplePatents = async (req: AuthRequest, res: Response) => {
  try {
    const { patentIds, page = '1', limit = '50' } = req.body;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (!patentIds || !Array.isArray(patentIds) || patentIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'At least one Patent ID is required',
        data: null
      });
    }

    // Standardize all patent IDs
    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));

    // Calculate pagination slice
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedIds = standardizedPatentIds.slice(startIndex, endIndex);

    // Process each patent ID
    const results = await Promise.all(
      paginatedIds.map(async (patentId) => {
        try {
          const params = {
            engine: 'google_patents',
            q: patentId,
            api_key: process.env.SERPAPI_KEY
          };

          const response = await getJson(params);
          return {
            patentId,
            status: 'success',
            data: response.organic_results?.[0] || null
          };
        } catch (error) {
          return {
            patentId,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Calculate pagination details
    const totalResults = standardizedPatentIds.length;
    const totalPages = Math.ceil(totalResults / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    res.status(200).json({
      statusCode: 200,
      message: 'Search completed successfully',
      data: {
        results,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalResults,
          resultsPerPage: limitNum,
          hasNextPage,
          hasPreviousPage
        }
      }
    });
  } catch (error) {
    console.error('Error searching multiple patents:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to search patents',
      data: null
    });
  }
};

export const filterPatentsByFamily = async (req: AuthRequest, res: Response) => {
  try {
    const { patents, preferredAuthorities: reqPreferredAuthorities } = req.body;

    if (!patents || !Array.isArray(patents) || patents.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'At least one Patent is required',
        data: null
      });
    }

    console.log('Received patents:', patents);
    if (reqPreferredAuthorities) {
      console.log('Using custom preferred authorities:', reqPreferredAuthorities);
    }

    // Group patents by family_id
    const familyMap = new Map<string, any[]>();
    patents.forEach((patent: any) => {
      const familyId = patent.familyId;
      if (familyId) {
        if (!familyMap.has(familyId)) {
          familyMap.set(familyId, []);
        }
        familyMap.get(familyId)?.push(patent);
      }
    });

    console.log('Family groups:', {
      totalFamilies: familyMap.size,
      familyIds: Array.from(familyMap.keys())
    });

    // For each family, select one representative patent based on preferred authority
    // Use the provided preferred authorities or fall back to default
    const preferredAuthorities = reqPreferredAuthorities && reqPreferredAuthorities.length > 0
      ? reqPreferredAuthorities
      : ['US', 'WO', 'EP', 'GB', 'FR', 'DE', 'CH', 'JP', 'RU', 'SU'];
      
    const filteredPatents = Array.from(familyMap.values()).map(familyPatents => {
      // Sort patents by preferred authority order
      const sortedPatents = familyPatents.sort((a, b) => {
        const aIndex = preferredAuthorities.indexOf(a.country);
        const bIndex = preferredAuthorities.indexOf(b.country);
        return aIndex - bIndex;
      });

      // Return the patent with the highest preferred authority
      return sortedPatents[0].patentId;
    });

    console.log('Filtered patents:', {
      totalFiltered: filteredPatents.length,
      patents: filteredPatents
    });

    res.status(200).json({
      statusCode: 200,
      message: 'Patents filtered by family successfully',
      data: {
        filteredPatents,
        totalFamilies: familyMap.size,
        totalOriginalPatents: patents.length
      }
    });
  } catch (error) {
    console.error('Error filtering patents by family:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to filter patents by family',
      data: null
    });
  }
}; 