import axios from 'axios';
import axiosInstance from './axiosConfig';

const API_URL = import.meta.env.VITE_API_URL;

interface PatentFigure {
  url: string;
  title?: string;
}

interface FamilyMember {
  publication_number: string;
  publication_date: string;
  kind_code: string;
}

interface ClaimChild {
  text: string;
  index: string;
  children?: ClaimChild[];
}

interface Claim {
  text: string;
  index: string;
  children: ClaimChild[];
  description?: string;
  ucid?: string;
}

interface UnifiedPatentResponse {
  _source: {
    title: string;
    grant_number: string;
    expiration_date: string;
    assignee_current: string[];
    type: string;
    num_cit_pat: number;
    abstract: string;
    claims: Claim[];
    description: string;
    figures: PatentFigure[];
    family_members: FamilyMember[];
    priority_date?: string;
    publication_date?: string;
  };
}

// Update the FullLanguageResponse interface
interface FullLanguageResponse {
  claims: Array<{
    text: string;
    index: string;
    children?: Array<{
      text: string;
      index: string;
    }>;
  }>;
  description: string;
}

/**
 * Normalizes patent data from different API sources into a consistent format.
 * This adapter handles variations in API response structures between SerpAPI and Unified Patents API.
 * 
 * It accounts for:
 * 1. Different response structures between APIs
 * 2. SerpAPI responses with search_metadata and organic_results structure
 * 3. Direct patent details vs search results
 * 
 * The goal is to maintain a consistent data structure for the UI components regardless
 * of which API returned the data, allowing the same component structure to be used.
 */
export const normalizePatentResponse = (response: any, apiSource: ApiSource) => {
  console.log(`Normalizing ${apiSource} response:`, response);
  
  // Handle nested data structure (common in API responses)
  const data = response?.data || response;
  if (!data) {
    console.log('No data found in response');
    return null;
  }
  
  // Special case for SerpAPI response with specific structure from the user's query
  if (apiSource === 'serpapi' && 
      (data.organic_results || response.organic_results) && 
      (typeof data.search_metadata === 'object' || typeof response.search_metadata === 'object')) {
    
    console.log('Detected SerpAPI response format with search_metadata structure');
    
    // Get the organic results array, handling nested structure
    const organicResults = data.organic_results || response.organic_results || [];
    if (!Array.isArray(organicResults) || organicResults.length === 0) {
      console.log('No organic results found in SerpAPI response');
      return null;
    }
    
    // Use the first result from organic_results
    const patent = organicResults[0] || {};
    
    // Extract all available data from the patent object
    const normalized = {
      patentId: patent.patent_id || '',
      title: patent.title || '',
      abstract: patent.snippet || '',
      details: {
        assignee_current: patent.assignee ? [patent.assignee] : [],
        priority_date: patent.priority_date || '',
        publication_date: patent.publication_date || '',
        // Preserve any available data for details
        description: patent.description || '',
        claims: patent.claims || [],
        figures: patent.figures || [],
        family_members: patent.family_members || [],
        // Include raw data to ensure we don't lose any information
        raw_patent_data: patent
      }
    };
    console.log('Normalized special SerpAPI response:', normalized);
    return normalized;
  }
  
  if (apiSource === 'unified') {
    // Handle case where _source might be nested in a data property
    const source = data._source || (data.data && data.data._source);
    
    if (!source) {
      console.log('Invalid Unified response format - no _source found:', data);
      return null;
    }
    
    const normalized = {
      patentId: source.grant_number || '',
      title: source.title || '',
      abstract: source.abstract || '',
      details: {
        assignee_current: source.assignee_current || [],
        priority_date: source.priority_date || '',
        publication_date: source.publication_date || '',
        description: source.description || '',
        claims: source.claims || [],
        figures: source.figures || [],
        family_members: source.family_members || [],
        grant_number: source.grant_number || '',
        expiration_date: source.expiration_date || '',
        type: source.type || '',
        num_cit_pat: source.num_cit_pat || 0
      }
    };
    console.log('Normalized Unified response:', normalized);
    return normalized;
  } else if (apiSource === 'serpapi') {
    // Handle SerpAPI response
    if (!data) {
      console.log('Invalid SerpAPI response - response is null or undefined');
      return null;
    }
    
    // Check if this is a search result with organic_results
    if (data.organic_results && Array.isArray(data.organic_results)) {
      console.log('SerpAPI response has organic_results:', data.organic_results.length);
      // Return the first result by default
      const patent = data.organic_results[0] || {};
      
      const normalized = {
        patentId: patent.patent_id || '',
        title: patent.title || '',
        abstract: patent.snippet || '',
        details: {
          assignee_current: patent.assignee ? [patent.assignee] : [],
          priority_date: patent.priority_date || '',
          publication_date: patent.publication_date || '',
          description: patent.description || '',
          claims: patent.claims || [],
          figures: patent.figures || [],
          family_members: patent.family_members || [],
          raw_patent_data: patent
        }
      };
      console.log('Normalized SerpAPI search response:', normalized);
      return normalized;
    } else {
      // Direct patent details
      const normalized = {
        patentId: data.patent_id || '',
        title: data.title || '',
        abstract: data.abstract || data.snippet || '',
        details: {
          assignee_current: data.assignee_current || (data.assignee ? [data.assignee] : []),
          priority_date: data.priority_date || '',
          publication_date: data.publication_date || '',
          description: data.description || '',
          claims: data.claims || [],
          figures: data.figures || [],
          family_members: data.family_members || [],
          // Include any additional fields that might be useful
          inventors: data.inventors || [],
          patent_number: data.patent_number || data.patent_id || '',
          // Preserve the raw response to ensure we don't lose any data
          raw_patent_data: data
        }
      };
      console.log('Normalized SerpAPI direct response:', normalized);
      return normalized;
    }
  }
  
  console.log('Unknown API source:', apiSource);
  return null;
};

export const patentApi = {
  // Search patents using SerpAPI
  searchPatentsSerpApi: async (query: string) => {
    const response = await axiosInstance.get(`/patents/search`, {
      params: {
        query: query
      }
    });
    return response.data;
  },

  // Search patents using Unified Patents API
  searchPatentsUnified: async (patentNumber: string): Promise<UnifiedPatentResponse> => {
    // Keep direct axios for third-party APIs that don't need auth
    const response = await axios.get(`https://api.unifiedpatents.com/patents/${patentNumber}?with_cases=true`);
    return response.data;
  },
  
  // Generic method to search patents with any API
  searchPatents: async (patentId: string, apiType: ApiSource) => {
    if (apiType === 'unified') {
      return await patentApi.searchPatentsUnified(patentId);
    } else {
      return await patentApi.searchPatentsSerpApi(patentId);
    }
  },

  // New method for searching multiple patents using Unified Patents API
  searchMultiplePatentsUnified: async (patentNumbers: string[], searchType: 'direct' | 'smart' = 'direct'): Promise<any> => {
    let payload;
    
    if (searchType === 'smart') {
      // Smart search payload
      payload = {
        query: {
          bool: {
            // must: [
            //   {
            //     wildcard: {
            //       publication_type: "g*"
            //     }
            //   }
            // ],
            should: [
              {
                terms: {
                  ucid_spif: patentNumbers
                }
              }
            ],
            minimum_should_match: 1
          }
        },
        size: 20,
        sort: [
          {
            portfolio_score: "desc"
          }
        ],
        track_total_hits: true,
        _source: {
          exclude: [
            "created_at", "updated_at", "id", "*.created_at", "*.updated_at",
            "*.id", "patent_id", "patent.title",
            "*.full_text", "citations_npl", "citations_pat",
            "family_members", "abstract_fulltext", "description", "claims",
            "non_patent_citations"
          ]
        }
      };
    } else {
      // Direct search payload
      payload = {
        query: {
          bool: {
            must: [
              {
                terms: {
                  ucid_spif: patentNumbers
                }
              },
              // {
              //   wildcard: {
              //     publication_type: "g*"
              //   }
              // }
              // Removed wildcard as per user's changes
            ]
          }
        },
        size: 20,
        sort: [
          {
            portfolio_score: "desc"
          }
        ],
        track_total_hits: true,
        _source: {
          exclude: [
            "created_at", "updated_at", "id", "*.created_at", "*.updated_at",
            "*.id", "patent_id", "patent.title",
            "*.full_text", "citations_npl", "citations_pat",
            "family_members", "abstract_fulltext", "description", "claims",
            "non_patent_citations"
          ]
        }
      };
    }

    const response = await axios.post('https://api.unifiedpatents.com/patents/v6/_search', payload);
    
    // Return the entire response structure
    return {
      hits: response.data.hits,
      timed_out: response.data.timed_out,
      took: response.data.took,
      _cached: response.data._cached,
      _shards: response.data._shards
    };
  },

  getSavedPatents: async () => {
    const response = await axiosInstance.get(`/saved-patents/list`);
    return response.data;
  },
  
  getCustomPatentList: async () => {
    const { data } = await axiosInstance.get(`/saved-patents/custom-list`);
    return data;
  },

  // Add new method for fetching full language
  getFullLanguage: async (patentNumber: string): Promise<FullLanguageResponse> => {
    // Keep direct axios for third-party APIs that don't need auth
    const response = await axios.get(`https://api.unifiedpatents.com/patents/${patentNumber}/full-language`);
    // The data is directly in the response, not nested under 'data'
    return response.data;
  },

  getFigures: async (patentNumber: string) => {
    // Keep direct axios for third-party APIs that don't need auth
    const response = await axios.get(`https://api.unifiedpatents.com/patents/${patentNumber}/figures`);
    return response.data;
  },
};

export type ApiSource = 'serpapi' | 'unified'; 