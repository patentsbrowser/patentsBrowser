import { Request, Response } from 'express';
import { SavedPatent } from '../models/SavedPatent.js';
import { CustomPatentList } from '../models/CustomPatentList.js';
import fs from 'fs-extra';
import mammoth from 'mammoth';
import path from 'path';
import xlsx from 'xlsx';
import { Readable } from 'stream';
import { standardizePatentNumber } from '../utils/patentUtils.js';
import { WorkFile } from '../models/WorkFile.js';
import mongoose from 'mongoose';

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
    console.log('User:', req.user);
    
    const { name, patentIds, source, workFileName } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!name || !patentIds || !Array.isArray(patentIds) || patentIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Name and at least one patent ID are required',
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

    // Set source - default to 'customSearch' if not provided or invalid
    const folderSource = source === 'folderName' ? 'folderName' : 'customSearch';
    
    // Standardize all patent IDs
    const standardizedPatentIds = patentIds.map(id => standardizePatentNumber(id.trim()));
    console.log('Standardized patent IDs:', standardizedPatentIds);
    
    console.log('Creating custom list with:', { userId, name, patentIds: standardizedPatentIds, source: folderSource });
    
    // Create workfile with user-provided name or default
    const workFile = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: workFileName || 'Workfile 1',
      patentIds: standardizedPatentIds,
      timestamp: Date.now()
    };

    // Create and save the custom patent list with workfile
    const customList = new CustomPatentList({
      userId,
      name,
      patentIds: standardizedPatentIds,
      timestamp: Date.now(),
      source: folderSource,
      workFiles: [workFile] // Initialize with the workfile
    });

    await customList.save();

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
        pubNumIndex = headers.findIndex(header => {
          const headerText = String(header || '').toLowerCase();
          return headerText.includes('earliest publication number');
        });
        kindCodeIndex = headers.findIndex(header => {
          const headerText = String(header || '').toLowerCase();
          return headerText.includes('publication kind codes');
        });
      }

      if (pubNumIndex === -1) {
        throw new Error('Could not find "Earliest publication number" column');
      }
      
      // Extract data from rows
      const extractedData: { [key: string]: string } = {};
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (row && row[pubNumIndex]) {
          const pubNum = String(row[pubNumIndex]).trim();
          if (pubNum && pubNum !== 'undefined' && pubNum !== 'null') {
            // Get corresponding kind code if available
            let kindCode = '';
            if (kindCodeIndex !== -1 && row[kindCodeIndex]) {
              const codes = String(row[kindCodeIndex])
                .split(/[,\s]+/)
                .map(code => code.trim())
                .filter(Boolean);
              kindCode = codes[0] || ''; // Take first kind code
            }
            
            // Clean publication number and combine with kind code
            const cleanPubNum = pubNum.replace(/[\s/-]+/g, '');
            extractedData[cleanPubNum] = kindCode;
          }
        }
      }
      // Convert to arrays for response
      const processedPatentIds = Object.entries(extractedData).map(([pubNum, kindCode]) => {
        return kindCode ? `${pubNum}${kindCode}` : pubNum;
      });

      // Return the extracted patent IDs
      res.status(200).json({
        statusCode: 200,
        message: 'Patent IDs extracted successfully',
        data: {
          patentIds: processedPatentIds,
          publicationNumbers: Object.keys(extractedData),
          kindCodes: Object.values(extractedData)
        }
      });
      return;
    }

    // Clean up the uploaded file
    await fs.remove(filePath);

    // Process the extracted patent IDs - only combine with kind codes, no standardization
    const processedPatentIds = publicationNumbers.map((pubNum, index) => {
      let patentId = pubNum.trim();
      // If we have a kind code for this publication number, append it
      if (kindCodes[index]) {
        // Split multiple kind codes and remove spaces
        const availableKindCodes = kindCodes[index].split(/[,\s]+/).filter(Boolean);
        // Take only the first kind code
        const selectedKindCode = availableKindCodes[0];
        
        if (selectedKindCode) {
          // Remove any existing kind code from the publication number
          patentId = patentId.replace(/[A-Z]\d*$/, '');
          // Append the selected kind code
          patentId = `${patentId}${selectedKindCode}`;
        }
      }
      return patentId;
    });

    // Return the extracted patent IDs along with raw data for reference
    res.status(200).json({
      statusCode: 200,
      message: 'Patent IDs extracted successfully',
      data: {
        patentIds: processedPatentIds,
        publicationNumbers,
        kindCodes
      }
    });
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
