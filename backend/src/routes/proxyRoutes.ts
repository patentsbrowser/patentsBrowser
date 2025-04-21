import express from 'express';
import axios from 'axios';
import { UNIFIED_PATENTS_API_KEY, SERPAPI_API_KEY } from '../config';

const router = express.Router();

// Unified Patents API proxy
router.get('/unified-patents/:patentNumber', async (req, res) => {
  try {
    const { patentNumber } = req.params;
    const response = await axios.get(`https://api.unifiedpatents.com/patents/${patentNumber}`, {
      headers: {
        'Authorization': `Bearer ${UNIFIED_PATENTS_API_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying Unified Patents API:', error);
    res.status(500).json({ error: 'Failed to fetch patent data' });
  }
});

router.post('/unified-patents/search', async (req, res) => {
  try {
    const response = await axios.post('https://api.unifiedpatents.com/patents/v6/_search', req.body, {
      headers: {
        'Authorization': `Bearer ${UNIFIED_PATENTS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying Unified Patents search:', error);
    res.status(500).json({ error: 'Failed to search patents' });
  }
});

router.get('/unified-patents/:patentNumber/figures', async (req, res) => {
  try {
    const { patentNumber } = req.params;
    const response = await axios.get(`https://api.unifiedpatents.com/patents/${patentNumber}/figures`, {
      headers: {
        'Authorization': `Bearer ${UNIFIED_PATENTS_API_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying Unified Patents figures:', error);
    res.status(500).json({ error: 'Failed to fetch patent figures' });
  }
});

router.get('/unified-patents/:patentNumber/full-language', async (req, res) => {
  try {
    const { patentNumber } = req.params;
    const response = await axios.get(`https://api.unifiedpatents.com/patents/${patentNumber}/full-language`, {
      headers: {
        'Authorization': `Bearer ${UNIFIED_PATENTS_API_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying Unified Patents full language:', error);
    res.status(500).json({ error: 'Failed to fetch patent full language' });
  }
});

// SerpAPI proxy
router.get('/serpapi/figures', async (req, res) => {
  try {
    const { patent_id } = req.query;
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_patents',
        patent_id,
        api_key: SERPAPI_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying SerpAPI:', error);
    res.status(500).json({ error: 'Failed to fetch patent figures' });
  }
});

export default router; 