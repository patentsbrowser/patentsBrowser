import { Request, Response } from 'express';
import { normalizePatentIds } from '../services/patentNormalizationService.js';

export async function normalizePatents(req: Request, res: Response) {
  try {
    const { patentIds } = req.body;

    if (!Array.isArray(patentIds)) {
      return res.status(400).json({
        error: 'Invalid request: patentIds must be an array'
      });
    }

    const results = await normalizePatentIds(patentIds);
    res.json({ results });
  } catch (error) {
    console.error('Error in normalizePatents controller:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
} 