import { Request, Response } from 'express';
import { SavedPatent } from '../models/SavedPatent.js';
import { CustomPatentList } from '../models/CustomPatentList.js';
import fs from 'fs-extra';
import mammoth from 'mammoth';
import path from 'path';
import xlsx from 'xlsx';
import { Readable } from 'stream';
import { standardizePatentNumber } from '../utils/patentUtils.js';
import { SearchHistory } from '../models/SearchHistory.js';
import { WorkFile } from '../models/WorkFile.js';
import mongoose from 'mongoose';
import axios from 'axios';

function extractPatentId(trimmedLine: string): string | null {
  // Basic pattern for patent numbers (can be enhanced based on requirements)
  const match = trimmedLine.match(/[A-Z]{2}\d+[A-Z]\d*/);
  return match ? match[0] : null;
}

// Create a complete FileType that includes all properties
interface FileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;r
  filename: string;
  path: string;
  buffer: Buffer;
  stream: Readable;
}

// Use type instead of interface to avoid TypeScript extension issues
type AuthRequest = Request & {
  user?: {
    userId: string;
  };
  file?: FileType;
  body: any;
};

export const savePatent = async (req: AuthRequest, res: Response) => {
  try {
    const { patentIds, folderName } = req.body;
    const userId: any = req.user?.userId;
    console.log('userId', userId);
    console.log('folderName provided:', folderName);
    
    // Validate both patentIds array and userId
    if (!patentIds || !Array.isArray(patentIds) || patentIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'At least one Patent ID is required',
        data: null
      });
    }

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Standardize all patent IDs
    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));
    console.log('Standardized patent IDs:', standardizedPatentIds);

    const savedPatents: any[] = [];

    // Process each patent ID in the array
    for (const patentId of standardizedPatentIds) {
      // Skip empty patent IDs
      if (!patentId) continue;

      // Check if patent is already saved by this user
      const existingPatent = await SavedPatent.findOne({ userId, patentId });
      
      if (!existingPatent) {
        // Create and save the patent if it doesn't exist
        const savedPatent = new SavedPatent({
          userId,
          patentId
        });
        await savedPatent.save();
        savedPatents.push(savedPatent);
      } else {
        // If it exists, just add it to the savedPatents array
        savedPatents.push(existingPatent);
      }
    }

    // Create a custom patent list if a folder name was provided
    let customList = null;
    if (folderName && patentIds.length > 0) {
      console.log(`Creating custom list "${folderName}" with ${standardizedPatentIds.length} patents`);
      
      // Split folderName into main folder and workfile name
      const [mainFolderName, workfileName] = folderName.split('/');
      
      // Find or create the main folder
      let mainFolder = await CustomPatentList.findOne({ 
        userId, 
        name: mainFolderName 
      });

      if (!mainFolder) {
        // Create the main folder if it doesn't exist
        mainFolder = new CustomPatentList({
          userId,
          name: mainFolderName,
          patentIds: [], // We'll store patentIds in the workfile instead
          timestamp: Date.now(),
          source: 'importedList'
        });
        await mainFolder.save();
      }

      // Create a workfile under the folder with a unique ID
      const workFile = {
        _id: new mongoose.Types.ObjectId().toString(), // Generate a unique ID
        name: workfileName || 'workfile1',
        patentIds: standardizedPatentIds,
        timestamp: Date.now()
      };

      // Add the workfile to the folder's workFiles array
      mainFolder.workFiles.push(workFile);
      await mainFolder.save();

      // Update the customList object to include the workfile
      customList = await CustomPatentList.findById(mainFolder._id)
        .lean();
    }

    res.status(201).json({
      statusCode: 201,
      message: 'Patents saved successfully',
      data: {
        savedPatents,
        customList
      }
    });
  } catch (error) {
    console.error('Error saving patents:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to save patents',
      data: null
    });
  }
};

// Add a new function to get saved patents for a user
export const getSavedPatents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    const savedPatents = await SavedPatent.find({ userId })
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      statusCode: 200,
      message: 'Saved patents retrieved successfully',
      data: savedPatents
    });
  } catch (error) {
    console.error('Error fetching saved patents:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch saved patents',
      data: null
    });
  }
};

export const saveCustomPatentList = async (req: AuthRequest, res: Response) => {
  try {
    console.log('customPatentList controller called');
    // console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const { name, patentIds, source } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!name || !patentIds || !Array.isArray(patentIds) || patentIds.length === 0) {
      console.log('Validation failed:', { name, patentIds });
      return res.status(400).json({
        statusCode: 400,
        message: 'Name and at least one patent ID are required',
        data: null
      });
    }

    if (!userId) {
      console.log('No userId found');
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Set source - default to 'customSearch' if not provided or invalid
    const folderSource = source === 'folderName' ? 'folderName' : 'customSearch';
    
    // Standardize all patent IDs
    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));
    console.log('Standardized patent IDs:', standardizedPatentIds);
    
    console.log('Creating custom list with:', { userId, name, patentIds: standardizedPatentIds, source: folderSource });
    
    // Create and save the custom patent list
    const customList = new CustomPatentList({
      userId,
      name,
      patentIds: standardizedPatentIds,
      timestamp: Date.now(),
      source: folderSource // Store the source information
    });

    await customList.save();
    console.log('Custom list saved successfully:', customList);

    res.status(201).json({
      statusCode: 201,
      message: 'Custom patent list created successfully',
      data: customList
    });
  } catch (error) {
    console.error('Error creating custom patent list:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to create custom patent list',
      data: null
    });
  }
};

export const getCustomPatentList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Find all custom patent lists for this user
    const customLists = await CustomPatentList.find({ userId })
      .sort({ timestamp: -1 }); // Most recent first

    res.status(200).json({
      statusCode: 200,
      message: 'Custom patent lists retrieved successfully',
      data: customLists
    });
  } catch (error) {
    console.error('Error fetching custom patent lists:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch custom patent lists',
      data: null
    });
  }
};

export const removePatentFromFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, patentId } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!folderId || !patentId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID and Patent ID are required',
        data: null
      });
    }

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Find the custom list
    const customList = await CustomPatentList.findOne({ 
      _id: folderId,
      userId 
    });

    if (!customList) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Custom folder not found',
        data: null
      });
    }

    // Remove the patent ID from the list
    customList.patentIds = customList.patentIds.filter(id => id !== patentId);
    
    // Save the updated list
    await customList.save();

    res.status(200).json({
      statusCode: 200,
      message: 'Patent removed from folder successfully',
      data: customList
    });
  } catch (error) {
    console.error('Error removing patent from folder:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to remove patent from folder',
      data: null
    });
  }
};

// New function to add a patent to an existing folder
export const addPatentToFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, patentId } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!folderId || !patentId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID and Patent ID are required',
        data: null
      });
    }

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Standardize the patent ID
    const standardizedPatentId = standardizePatentNumber(patentId.trim());
    
    // Find the custom list
    const customList = await CustomPatentList.findOne({ 
      _id: folderId,
      userId 
    });

    if (!customList) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Custom folder not found',
        data: null
      });
    }

    // Check if the patent is already in the folder
    if (customList.patentIds.includes(standardizedPatentId)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Patent is already in this folder',
        data: customList
      });
    }

    // Add the patent ID to the list
    customList.patentIds.push(standardizedPatentId);
    
    // Save the updated list
    await customList.save();

    // Also save the patent to the SavedPatent collection if it doesn't exist
    let savedPatent = await SavedPatent.findOne({ userId, patentId: standardizedPatentId });
    
    if (!savedPatent) {
      savedPatent = new SavedPatent({
        userId,
        patentId: standardizedPatentId
      });
      await savedPatent.save();
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Patent added to folder successfully',
      data: customList
    });
  } catch (error) {
    console.error('Error adding patent to folder:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to add patent to folder',
      data: null
    });
  }
};

// New function to add multiple patents to an existing folder
export const addPatentsToFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, patentIds } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!folderId || !patentIds || !Array.isArray(patentIds) || patentIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID and at least one Patent ID are required',
        data: null
      });
    }

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Standardize the patent IDs
    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));
    
    // Find the custom list
    const customList = await CustomPatentList.findOne({ 
      _id: folderId,
      userId 
    });

    if (!customList) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Custom folder not found',
        data: null
      });
    }

    // Filter out patents that are already in the folder
    const newPatentIds = standardizedPatentIds.filter(id => !customList.patentIds.includes(id));
    
    if (newPatentIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'All patents are already in this folder',
        data: customList
      });
    }

    // Add the patent IDs to the list
    customList.patentIds.push(...newPatentIds);
    
    // Save the updated list
    await customList.save();

    // Also save the patents to the SavedPatent collection if they don't exist
    for (const patentId of newPatentIds) {
      let savedPatent = await SavedPatent.findOne({ userId, patentId });
      
      if (!savedPatent) {
        savedPatent = new SavedPatent({
          userId,
          patentId
        });
        await savedPatent.save();
      }
    }

    res.status(200).json({
      statusCode: 200,
      message: `${newPatentIds.length} patents added to folder successfully`,
      data: {
        customList,
        addedCount: newPatentIds.length,
        totalCount: standardizedPatentIds.length
      }
    });
  } catch (error) {
    console.error('Error adding patents to folder:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to add patents to folder',
      data: null
    });
  }
};

// New function to extract patent IDs from uploaded files and optionally save to a folder
export const extractPatentIdsFromFile = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        statusCode: 400,
        message: 'No file uploaded',
        data: null
      });
    }

    const filePath = req.file.path;
    let fileContent = '';
    
    // Initialize data arrays for all file types
    const publicationNumbers: string[] = [];
    const kindCodes: string[] = [];

    // Read file content based on file type
    const fileExtension = path.extname(filePath).toLowerCase();
      
      if (fileExtension === '.txt') {
      fileContent = await fs.readFile(filePath, 'utf-8');
      // Extract patent IDs from text file
      const lines = fileContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Try to extract patent ID from the line
          const patentId = extractPatentId(trimmedLine);
          if (patentId) {
            publicationNumbers.push(patentId);
          }
        }
      }
    } else if (fileExtension === '.doc' || fileExtension === '.docx') {
      // Handle Word documents
      const result = await mammoth.extractRawText({ path: filePath });
      fileContent = result.value;
      const lines = fileContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const patentId = extractPatentId(trimmedLine);
          if (patentId) {
            publicationNumbers.push(patentId);
          }
        }
      }
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx' || fileExtension === '.csv') {
      // Handle Excel and CSV files
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find the column indices for publication numbers and kind codes
      let pubNumIndex = -1;
      let kindCodeIndex = -1;
      
      if (data.length > 0) {
        const headers = data[0] as string[];
        // Look for "Publication numbers" in column B (index 1)
        if (headers.length > 1 && headers[1].toLowerCase().includes('publication numbers')) {
          pubNumIndex = 1;
        }
        kindCodeIndex = headers.findIndex(header => 
          header.toLowerCase().includes('publication kind code') || 
          header.toLowerCase().includes('kind code')
        );
      }
      
      // Extract data from rows
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (pubNumIndex !== -1 && row[pubNumIndex]) {
          // Split multiple publication numbers and remove special characters
          const pubNums = row[pubNumIndex].toString().split(/[,\s]+/).map((num: string) => 
            num.replace(/[^A-Za-z0-9]/g, '') // Remove special characters
          );
          publicationNumbers.push(...pubNums);
        }
        if (kindCodeIndex !== -1 && row[kindCodeIndex]) {
          // Split multiple kind codes
          const codes = row[kindCodeIndex].toString().split(/[,\s]+/).filter(Boolean);
          kindCodes.push(...codes);
        }
      }
    }

    // Clean up the uploaded file
    await fs.remove(filePath);

    // First extract patent IDs from file
    const extractedPatentIds = publicationNumbers.map((pubNum, index) => {
      let patentId = pubNum.trim();
      // If we have a kind code for this publication number, append it
      if (kindCodes[index]) {
        patentId = `${patentId}${kindCodes[index]}`;
      }
      return patentId;
    });

    // Then transform the extracted patent IDs
    try {
      console.log('Sending to transform API:', extractedPatentIds);
      const transformResponse = await axios.post('https://api.unifiedpatents.com/helpers/transform-publication-numbers', {
        publications: extractedPatentIds
      });

      // Process the response to extract unified format patent IDs
      const transformedPatents: string[] = [];
      const notFoundPatents: string[] = [];

      // Check if we have a valid response
      if (transformResponse.data && Array.isArray(transformResponse.data)) {
        // The API returns an array of transformed patent IDs directly
        transformResponse.data.forEach((transformedId: string, index: number) => {
          if (transformedId) {
            // Check if the transformed ID is different from the original
            if (transformedId.toLowerCase() !== extractedPatentIds[index].toLowerCase()) {
              transformedPatents.push(transformedId);
            } else {
              // If the ID didn't change, add it to not found patents
              notFoundPatents.push(extractedPatentIds[index]);
            }
          } else {
            notFoundPatents.push(extractedPatentIds[index]);
          }
        });
      } else {
        // If response structure is invalid, treat all as not found
        notFoundPatents.push(...extractedPatentIds);
      }

      console.log('Transformed patents:', transformedPatents);
      console.log('Not found patents:', notFoundPatents);

      // Return the transformed patent IDs along with raw data for reference
      res.status(200).json({
        statusCode: 200,
        message: 'Patent IDs extracted and transformed successfully',
        data: {
          patentIds: transformedPatents,
          notFoundPatents,
          originalPublicationNumbers: publicationNumbers,
          kindCodes,
          note: kindCodes.length > 0 ? 'Publication numbers were combined with their corresponding kind codes and transformed to unified format.' : undefined
        }
      });
    } catch (error) {
      console.error('Error transforming publication numbers:', error);
      // If transformation fails, return the original format
      res.status(200).json({
        statusCode: 200,
        message: 'Patent IDs extracted successfully (transformation failed)',
        data: {
          patentIds: extractedPatentIds,
          notFoundPatents: [],
          originalPublicationNumbers: publicationNumbers,
          kindCodes,
          note: 'Failed to transform to unified format. Using original format.'
        }
      });
    }
  } catch (error) {
    console.error('Error extracting patent IDs:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to extract patent IDs',
      data: null
    });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!folderId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID is required',
        data: null
      });
    }

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Find and delete the custom list
    const result = await CustomPatentList.findOneAndDelete({ 
      _id: folderId,
      userId 
    });

    if (!result) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Custom folder not found',
        data: null
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Folder deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to delete folder',
      data: null
    });
  }
};

export const getImportedLists = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Find all custom patent lists for this user and populate workfiles
    const customLists = await CustomPatentList.find({ userId })
      .populate({
        path: 'workFiles',
        select: 'name patentIds timestamp createdAt'
      })
      .sort({ timestamp: -1 }); // Most recent first

    res.status(200).json({
      statusCode: 200,
      message: 'Imported lists retrieved successfully',
      data: customLists
    });
  } catch (error) {
    console.error('Error fetching imported lists:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch imported lists',
      data: null
    });
  }
};

export const getSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 20, page = 1, source, sort = 'timestamp', order = 'desc', search } = req.query;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null,
        code: 'AUTH_ERROR'
      });
    }

    // Build query
    const query: any = { userId };
    
    // Add source filter if provided
    if (source) {
      query.source = source;
    }
    
    // Add search filter if provided
    if (search) {
      query.patentId = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const pageNumber = parseInt(page as string, 10) || 1;
    const pageSize = parseInt(limit as string, 10) || 20;
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sortField = (sort as string) || 'timestamp';
    const sortOrder = (order as string) === 'asc' ? 1 : -1;
    const sortObject: any = {};
    sortObject[sortField] = sortOrder;

    // Count total documents for pagination
    const total = await SearchHistory.countDocuments(query);

    // Find search history entries with pagination and sorting
    const searchHistory = await SearchHistory.find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(pageSize);

    res.status(200).json({
      statusCode: 200,
      message: 'Search history retrieved successfully',
      data: {
        results: searchHistory,
        pagination: {
          total,
          page: pageNumber,
          limit: pageSize,
          pages: Math.ceil(total / pageSize)
        }
      },
      code: 'SUCCESS'
    });
  } catch (error: any) {
    console.error('Error fetching search history:', error);
    res.status(500).json({
      statusCode: 500,
      message: error.message || 'Failed to fetch search history',
      data: null,
      code: 'SERVER_ERROR'
    });
  }
};

export const clearSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    // Delete all search history entries for this user
    await SearchHistory.deleteMany({ userId });

    res.status(200).json({
      statusCode: 200,
      message: 'Search history cleared successfully',
      data: null
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to clear search history',
      data: null
    });
  }
};

export const addToSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { patentId, source } = req.body;
    
    console.log('Adding to search history:', { patentId, source });
    
    // Check if userId is present
    const userId = req.user?.userId;
    if (!userId) {
      console.log('No userId found in decoded token');
      return res.status(400).json({
        statusCode: 400,
        message: 'User ID is required',
        data: null,
        code: 'INVALID_REQUEST'
      });
    }

    // Validate patentId
    if (!patentId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'patentId is required',
        data: null,
        code: 'INVALID_REQUEST'
      });
    }
    
    if (typeof patentId !== 'string') {
      return res.status(400).json({
        statusCode: 400,
        message: 'patentId must be a string',
        data: null,
        code: 'INVALID_REQUEST'
      });
    }

    // Standardize patent ID (remove hyphens)
    const standardizedPatentId = patentId.replace(/-/g, '');
    console.log('Standardized patent ID:', standardizedPatentId);

    // Use findOneAndUpdate with upsert to handle duplicates
    const result = await SearchHistory.findOneAndUpdate(
      { userId, patentId: standardizedPatentId },
      { 
        $set: { 
          source: source || 'manual',
          timestamp: new Date()
        }
      },
      { upsert: true, new: true }
    );

    console.log('Search history entry saved:', result);

    res.status(201).json({
      statusCode: 201,
      message: 'Search history entry added successfully',
      data: result,
      code: 'SUCCESS'
    });
  } catch (error: any) {
    console.error('Error adding to search history:', error);
    res.status(500).json({
      statusCode: 500,
      message: error.message || 'Failed to add to search history',
      data: null,
      code: 'SERVER_ERROR'
    });
  }
};

export const createWorkFile = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, fileName } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    if (!folderId || !fileName) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID and file name are required',
        data: null
      });
    }

    // Find the folder
    const folder = await CustomPatentList.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Folder not found',
        data: null
      });
    }

    // Create a new work file
    const workFile = {
      fileName,
      patentIds: folder.patentIds,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add the work file to the folder
    folder.workFiles = folder.workFiles || [];
    folder.workFiles.push(workFile);
    await folder.save();

    res.status(201).json({
      statusCode: 201,
      message: 'Work file created successfully',
      data: workFile
    });
  } catch (error) {
    console.error('Error creating work file:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to create work file',
      data: null
    });
  }
};

export const mergeWorkFiles = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, fileIds, mergedFileName } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    if (!folderId || !fileIds || !Array.isArray(fileIds) || fileIds.length < 2 || !mergedFileName) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID, file IDs array (minimum 2 files), and merged file name are required',
        data: null
      });
    }

    // Find the folder
    const folder = await CustomPatentList.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Folder not found',
        data: null
      });
    }

    // Get all work files to merge
    const workFilesToMerge = folder.workFiles?.filter(file => fileIds.includes(file._id.toString()));
    if (!workFilesToMerge || workFilesToMerge.length < 2) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid file IDs or not enough files to merge',
        data: null
      });
    }

    // Merge patent IDs from all files, removing duplicates
    const mergedPatentIds = [...new Set(workFilesToMerge.flatMap(file => file.patentIds))];

    // Create new merged work file
    const mergedWorkFile = {
      fileName: mergedFileName,
      patentIds: mergedPatentIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      mergedFrom: fileIds
    };

    // Add the merged work file to the folder
    folder.workFiles = folder.workFiles || [];
    folder.workFiles.push(mergedWorkFile);
    await folder.save();

    res.status(201).json({
      statusCode: 201,
      message: 'Work files merged successfully',
      data: mergedWorkFile
    });
  } catch (error) {
    console.error('Error merging work files:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to merge work files',
      data: null
    });
  }
};

export const addPatentsToWorkFile = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, workFileName, patentIds } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    if (!folderId || !workFileName || !patentIds || !Array.isArray(patentIds) || patentIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Folder ID, work file name, and at least one patent ID are required',
        data: null
      });
    }

    // Find the folder
    const folder = await CustomPatentList.findOne({ _id: folderId, userId });
    if (!folder) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Folder not found',
        data: null
      });
    }

    // Standardize the patent IDs
    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));

    // Find or create the work file
    let workFile = folder.workFiles.find(file => file.name === workFileName);
    
    if (!workFile) {
      // Create a new work file if it doesn't exist
      workFile = {
        _id: new mongoose.Types.ObjectId().toString(), // Generate unique ID
        name: workFileName,
        patentIds: standardizedPatentIds,
        timestamp: Date.now()
      };
      folder.workFiles.push(workFile);
    } else {
      // Filter out patents that are already in the work file
      const newPatentIds = standardizedPatentIds.filter(id => !workFile.patentIds.includes(id));
      
      if (newPatentIds.length === 0) {
        return res.status(400).json({
          statusCode: 400,
          message: 'All patents are already in this work file',
          data: workFile
        });
      }

      // Add the new patent IDs to the work file
      workFile.patentIds.push(...newPatentIds);
      workFile.timestamp = Date.now();
    }

    // Save the updated folder
    await folder.save();

    // Also save the patents to the SavedPatent collection if they don't exist
    for (const patentId of standardizedPatentIds) {
      let savedPatent = await SavedPatent.findOne({ userId, patentId });
      
      if (!savedPatent) {
        savedPatent = new SavedPatent({
          userId,
          patentId
        });
        await savedPatent.save();
      }
    }

    res.status(200).json({
      statusCode: 200,
      message: `${standardizedPatentIds.length} patents added to work file successfully`,
      data: {
        workFile,
        addedCount: standardizedPatentIds.length,
        totalCount: standardizedPatentIds.length
      }
    });
  } catch (error) {
    console.error('Error adding patents to work file:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to add patents to work file',
      data: null
    });
  }
};

export const deleteItem = async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, folderId, workFileId, patentId } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated',
        data: null
      });
    }

    if (!itemType || !folderId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Item type and folder ID are required',
        data: null
      });
    }

    // Find the folder
    const folder = await CustomPatentList.findOne({ 
      _id: folderId,
      userId 
    });

    if (!folder) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Folder not found',
        data: null
      });
    }

    switch (itemType) {
      case 'folder':
        // Delete the entire folder
        await CustomPatentList.findByIdAndDelete(folderId);
        break;

      case 'workfile':
        if (!workFileId) {
          return res.status(400).json({
            statusCode: 400,
            message: 'Workfile ID is required',
            data: null
          });
        }
        // Remove the workfile from the folder's workFiles array using _id
        folder.workFiles = folder.workFiles.filter(wf => wf._id !== workFileId);
        await folder.save();
        break;

      case 'patent':
        if (!patentId) {
          return res.status(400).json({
            statusCode: 400,
            message: 'Patent ID is required',
            data: null
          });
        }
        // Remove the patent from all workfiles in the folder
        folder.workFiles = folder.workFiles.map(wf => ({
          ...wf,
          patentIds: wf.patentIds.filter(id => id !== patentId)
        }));
        await folder.save();
        break;

      default:
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid item type',
          data: null
        });
    }

    res.status(200).json({
      statusCode: 200,
      message: `${itemType} deleted successfully`,
      data: null
    });
  } catch (error) {
    const errorType = req.body.itemType || 'item';
    console.error(`Error deleting ${errorType}:`, error);
    res.status(500).json({
      statusCode: 500,
      message: `Failed to delete ${errorType}`,
      data: null
    });
  }
};
