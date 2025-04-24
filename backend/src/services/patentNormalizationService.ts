import axios from 'axios';
import NodeCache from 'node-cache';

// Initialize cache with 24 hour TTL
const cache = new NodeCache({ stdTTL: 86400 });

interface PatentVariation {
  ucid_spif: string[];
  publication_number: string[];
}

interface UnifiedApiResponse {
  results: Array<{
    patent_id: string;
    [key: string]: any;
  }>;
}

function generateVariations(patentId: string): string[] {
  // Remove any spaces and convert to uppercase
  const cleanId = patentId.replace(/\s+/g, '').toUpperCase();
  
  // Generate variations based on common patent ID formats
  const variations = [
    cleanId,
    cleanId.replace(/-/g, ''),
    cleanId.replace(/[A-Z]/g, ''),
    cleanId.replace(/[^A-Z0-9]/g, '')
  ];

  // Remove duplicates
  return [...new Set(variations)];
}

async function queryUnifiedApi(variations: string[]): Promise<UnifiedApiResponse> {
  const payload = {
    query: {
      bool: {
        should: [
          { terms: { ucid_spif: variations } },
          { terms: { publication_number: variations } }
        ],
        minimum_should_match: 1
      }
    },
    size: 300,
    sort: [{ portfolio_score: "desc" }],
    track_total_hits: true,
    _source: {}
  };

  try {
    const response = await axios.post('https://api.unifiedpatents.com/patents/v6/_search', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error querying Unified API:', error);
    throw error;
  }
}

export async function normalizePatentIds(patentIds: string[]) {
  const results = [];

  for (const rawId of patentIds) {
    // Check cache
    if (cache.has(rawId)) {
      results.push({ original: rawId, ...cache.get(rawId) });
      continue;
    }

    const variations = generateVariations(rawId);
    try {
      const apiResponse = await queryUnifiedApi(variations);
      const match = apiResponse?.results?.find(res =>
        variations.includes(res.patent_id)
      );

      if (match) {
        const result = {
          normalized: match.patent_id,
          data: match,
        };
        cache.set(rawId, result);
        results.push({ original: rawId, ...result });
      } else {
        const result = { normalized: null };
        cache.set(rawId, result);
        results.push({ original: rawId, ...result });
      }
    } catch (err) {
      results.push({ original: rawId, normalized: null, error: err.message });
    }
  }

  return results;
} 