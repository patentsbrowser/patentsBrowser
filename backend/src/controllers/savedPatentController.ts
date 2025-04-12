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
      customList = new CustomPatentList({
        userId,
        name: folderName,
        patentIds: standardizedPatentIds,
        timestamp: Date.now(),
        source: 'importedList'
      });

      await customList.save();
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
    console.log('Request body:', req.body);
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

    // Check if a folder name was provided
    const folderName = req.body.folderName;
    console.log('Folder name provided:', folderName);
    
    const filePath = req.file.path;
    let fileContent = '';
    
    // Initialize data arrays for all file types
    const publicationNumbers: string[] = [];
    const kindCodes: string[] = [];

    try {
      // Extract text based on file type
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      console.log('File extension:', fileExtension);
      
      // Flag to identify Excel and CSV files for later processing
      const isExcelFile = fileExtension === '.xls' || fileExtension === '.xlsx' || fileExtension === '.csv';
      
      if (fileExtension === '.txt') {
        // For text files, read directly
        console.log('Processing TXT file');
        fileContent = await fs.readFile(filePath, 'utf8');
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        // For Word documents, use mammoth to extract text
        console.log('Processing DOC/DOCX file');
        const result = await mammoth.extractRawText({
          path: filePath
        });
        fileContent = result.value;
      } else if (isExcelFile) {
        // For Excel files (including CSV) - find and extract headers
        console.log(`Processing ${fileExtension.toUpperCase().substring(1)} file:`, req.file.originalname);
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        console.log('Sheets found:', sheetNames);
        
        // Process each sheet in the workbook
        for (const sheetName of sheetNames) {
          console.log(`Processing sheet: ${sheetName}`);
          const worksheet = workbook.Sheets[sheetName];
          
          // First, convert the entire sheet to an array including headers
          const sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (sheetData.length === 0) {
            console.log(`Sheet ${sheetName} is empty`);
            continue;
          }
          
          // Try to find the column indices with our target headers
          const headerRow = sheetData[0] as any[];
          console.log(`Headers in sheet ${sheetName}:`, headerRow);
          
          let pubNumberColumnIndex = -1;
          let kindCodeColumnIndex = -1;
          
          // Look for the "Earliest publication number" header (case insensitive)
          for (let i = 0; i < headerRow.length; i++) {
            const header = String(headerRow[i] || '').toLowerCase();
            
            // Check for publication number
            if (header.includes('earliest') && header.includes('publication') && header.includes('number')) {
              pubNumberColumnIndex = i;
              console.log(`Found "Earliest publication number" column at index ${i}`);
            }
            
            // Check for publication kind codes
            if (header.includes('publication') && header.includes('kind') && header.includes('code')) {
              kindCodeColumnIndex = i;
              console.log(`Found "Publication kind codes" column at index ${i}`);
            }
          }
          
          // If we couldn't find the exact headers, try a more flexible search
          if (pubNumberColumnIndex === -1) {
            for (let i = 0; i < headerRow.length; i++) {
              const header = String(headerRow[i] || '').toLowerCase();
              if ((header.includes('publication') && header.includes('number')) || 
                  header.includes('patent') || 
                  header.includes('pub')) {
                pubNumberColumnIndex = i;
                console.log(`Found possible publication number column with header "${headerRow[i]}" at index ${i}`);
                break;
              }
            }
          }
          
          if (kindCodeColumnIndex === -1) {
            for (let i = 0; i < headerRow.length; i++) {
              const header = String(headerRow[i] || '').toLowerCase();
              if ((header.includes('kind') && header.includes('code')) || 
                  header.includes('pub') && header.includes('kind')) {
                kindCodeColumnIndex = i;
                console.log(`Found possible kind code column with header "${headerRow[i]}" at index ${i}`);
                break;
              }
            }
          }
          
          // Extract data from the publication number column if found
          if (pubNumberColumnIndex !== -1) {
            console.log(`Extracting data from publication number column at index ${pubNumberColumnIndex}`);
            
            // Extract data from the found column (skip header row)
            for (let i = 1; i < sheetData.length; i++) {
              const row = sheetData[i];
              if (row && row[pubNumberColumnIndex] !== undefined && row[pubNumberColumnIndex] !== null) {
                const value = String(row[pubNumberColumnIndex]).trim();
                if (value.length > 0) {
                  publicationNumbers.push(value);
                }
              }
            }
          } else {
            console.log(`Could not find "Earliest publication number" column in sheet ${sheetName}`);
            
            // Fallback: If we couldn't find the target header but have data, assume first column might contain publication numbers
            if (sheetData.length > 1) {
              console.log('Falling back to first column as potential publication numbers');
              for (let i = 1; i < sheetData.length; i++) {
                const row = sheetData[i];
                if (row && row[0] !== undefined && row[0] !== null) {
                  const value = String(row[0]).trim();
                  if (value.length > 0) {
                    publicationNumbers.push(value);
                  }
                }
              }
            }
          }
          
          // Extract data from the kind code column if found
          if (kindCodeColumnIndex !== -1) {
            console.log(`Extracting data from kind code column at index ${kindCodeColumnIndex}`);
            
            // Extract data from the found column (skip header row)
            for (let i = 1; i < sheetData.length; i++) {
              const row = sheetData[i];
              if (row && row[kindCodeColumnIndex] !== undefined && row[kindCodeColumnIndex] !== null) {
                const value = String(row[kindCodeColumnIndex]).trim();
                if (value.length > 0) {
                  // Check if this value contains multiple kind codes
                  if (/[A-Z\d][,;\s|][A-Z\d]/.test(value)) {
                    console.log(`Row ${i} has multiple kind codes: "${value}" - will use first one only`);
                  }
                  kindCodes.push(value);
                }
              }
            }
          } else {
            console.log(`Could not find "Publication kind codes" column in sheet ${sheetName}`);
            // No fallback for kind codes, as they're optional
          }
        }
        
        console.log('All extracted publication numbers:', publicationNumbers);
        console.log('All extracted kind codes:', kindCodes);
      } else {
        console.log('Unsupported file type:', fileExtension);
        // We'll still try to extract content from unsupported files
        try {
          fileContent = await fs.readFile(filePath, 'utf8');
        } catch (err) {
          console.log('Could not read file as text:', err);
        }
      }

      let extractedPatentIds: string[] = [];
      
      if (isExcelFile) {
        // Get unique publication numbers (in case of duplicates)
        const uniquePubNumbers = [...new Set(publicationNumbers)];
        console.log(`Found ${uniquePubNumbers.length} unique publication numbers`);
        
        // For each unique publication number, find the first kind code
        extractedPatentIds = uniquePubNumbers.map(pubNumber => {
          // Find the index of this publication number in the original array
          // (to match it with the corresponding kind code)
          const firstIndex = publicationNumbers.indexOf(pubNumber);
          
          // Get the kind code at the same index, if available
          const kindCode = firstIndex >= 0 && firstIndex < kindCodes.length ? kindCodes[firstIndex] : '';
          
          // If both publication number and kind code are available, combine them
          if (pubNumber && kindCode) {
            // When kind code contains multiple codes, take only the first one
            // Split by common delimiters (commas, spaces, semicolons, vertical bars)
            const kindCodeParts = kindCode.split(/[\s,;|]+/).filter(Boolean);
            
            // If we have multiple kind codes, log them
            if (kindCodeParts.length > 1) {
              console.log(`Publication ${pubNumber} has multiple kind codes: ${kindCodeParts.join(', ')}`);
            }
            
            // Choose the first kind code, prioritizing certain codes if available
            let selectedKindCode = '';
            
            // Priority order: A1, B1, B2, A, B - look for these patterns first
            const priorityOrder = ['A1', 'B1', 'B2', 'A', 'B'];
            for (const code of priorityOrder) {
              const found = kindCodeParts.find(part => part === code);
              if (found) {
                selectedKindCode = found;
                console.log(`For ${pubNumber}, found priority kind code: ${selectedKindCode}`);
                break;
              }
            }
            
            // If we didn't find a priority code, just use the first one
            if (!selectedKindCode && kindCodeParts.length > 0) {
              selectedKindCode = kindCodeParts[0];
              console.log(`For ${pubNumber}, using first available kind code: ${selectedKindCode}`);
            }
            
            // Return the combined publication number and kind code
            if (selectedKindCode) {
              // Combine publication number and kind code WITHOUT space between them
              const combined = `${pubNumber}${selectedKindCode}`;
              console.log(`Combined without space: ${pubNumber} + ${selectedKindCode} → ${combined}`);
              // Standardize the patent ID format
              const standardized = standardizePatentNumber(combined);
              console.log(`Standardized format: ${combined} → ${standardized}`);
              return standardized;
            }
            
            return standardizePatentNumber(pubNumber);
          } else {
            // If no kind code is available, just use the publication number
            return standardizePatentNumber(pubNumber);
          }
        });
        
        console.log('Final combined publication numbers with first kind codes:', extractedPatentIds);
      } else {
        // For non-Excel files, use regex to extract patent IDs
        const patentIdPattern = /(?:US|EP|WO|JP|CN|KR|DE|FR|GB|CA)[\s-]?\d{5,10}[\s-]?[A-Z]\d?/g;
        const matchedIds = fileContent.match(patentIdPattern) || [];
        // Standardize each extracted patent ID
        extractedPatentIds = [...new Set(matchedIds.map(id => standardizePatentNumber(id)))];
        console.log('Patent IDs extracted from text content:', extractedPatentIds);
      }
      
      // Clean up the temporary file
      await fs.remove(filePath);

      // Create a response object
      const responseData: {
        patentIds: string[];
        count: number;
        publicationNumbers: string[];
        kindCodes: string[];
        note?: string;
        savedFolder?: {
          id: string;
          name: string;
          patentCount: number;
        };
        folderError?: string;
      } = {
        patentIds: extractedPatentIds,
        count: extractedPatentIds.length,
        publicationNumbers: isExcelFile ? publicationNumbers : [],
        kindCodes: isExcelFile ? kindCodes : [],
        note: isExcelFile && kindCodes.some(code => /[A-Z\d][,;\s|][A-Z\d]/.test(code)) 
          ? 'Some kind codes contained multiple values. The first one or a priority code (A1, B1, B2, A, B) was selected and combined without spaces.'
          : undefined
      };

      // If a folder name was provided, create a custom patent list
      if (folderName && extractedPatentIds.length > 0) {
        try {
          // Create and save the custom patent list
          const customList = new CustomPatentList({
            userId,
            name: folderName,
            patentIds: extractedPatentIds,
            timestamp: Date.now(),
            source: 'folderName'
          });

          const savedList = await customList.save();
          console.log('Created custom patent list from file upload:', savedList);
          
          // Add the saved list info to the response
          responseData.savedFolder = {
            id: savedList._id.toString(),
            name: savedList.name,
            patentCount: savedList.patentIds.length
          };
        } catch (folderError) {
          console.error('Error saving custom patent list:', folderError);
          responseData.folderError = 'Failed to create custom patent list, but patents were extracted successfully';
        }
      }

      return res.status(200).json({
        statusCode: 200,
        message: folderName && responseData.savedFolder 
          ? `Patents extracted and saved to folder "${folderName}" successfully` 
          : 'Publication numbers and kind codes extracted successfully',
        data: responseData
      });
    } catch (error) {
      console.error('Error processing file content:', error);
      
      // Clean up the temporary file
      if (fs.existsSync(filePath)) {
        await fs.remove(filePath);
      }
      
      return res.status(500).json({
        statusCode: 500,
        message: 'Error processing file content',
        data: null
      });
    }
  } catch (error) {
    console.error('Error extracting patent IDs from file:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to process file',
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

    // Find all custom patent lists with source 'importedList'
    const importedLists = await CustomPatentList.find({ 
      userId,
      source: 'importedList'
    }).sort({ timestamp: -1 }); // Most recent first

    res.status(200).json({
      statusCode: 200,
      message: 'Imported lists retrieved successfully',
      data: importedLists
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
    const { patentId, patentIds, source } = req.body;
    
    console.log('Adding to search history:', { patentId, patentIds, source });
    
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

    // Determine which patents to process
    let idsToProcess: string[] = [];
    
    // Handle both single patentId and array of patentIds
    if (patentId) {
      if (typeof patentId === 'string') {
        idsToProcess.push(patentId);
      } else {
        return res.status(400).json({
          statusCode: 400,
          message: 'patentId must be a string',
          data: null,
          code: 'INVALID_REQUEST'
        });
      }
    } else if (patentIds) {
      if (Array.isArray(patentIds)) {
        if (patentIds.length === 0) {
          return res.status(400).json({
            statusCode: 400,
            message: 'patentIds array must not be empty',
            data: null,
            code: 'INVALID_REQUEST'
          });
        }
        idsToProcess = patentIds;
      } else {
        return res.status(400).json({
          statusCode: 400,
          message: 'patentIds must be an array',
          data: null,
          code: 'INVALID_REQUEST'
        });
      }
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: 'Either patentId or patentIds is required',
        data: null,
        code: 'INVALID_REQUEST'
      });
    }

    // Standardize patent IDs (remove hyphens)
    const standardizedPatentIds = idsToProcess.map(id => id.replace(/-/g, ''));
    console.log('Standardized patent IDs:', standardizedPatentIds);

    // Use bulkWrite with upsert to handle duplicates
    const bulkOperations = standardizedPatentIds.map(patentId => ({
      updateOne: {
        filter: { userId, patentId },
        update: { 
          $set: { 
            source: source || 'manual',
            timestamp: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await SearchHistory.bulkWrite(bulkOperations);
    console.log('Search history entries saved:', {
      insertedCount: result.insertedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });

    res.status(201).json({
      statusCode: 201,
      message: 'Search history entries added successfully',
      data: {
        insertedCount: result.insertedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        totalProcessed: standardizedPatentIds.length
      },
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