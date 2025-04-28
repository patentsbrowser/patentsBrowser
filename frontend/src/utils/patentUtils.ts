/**
 * Utility functions for patent processing
 */

/**
 * Standardizes patent number format to a consistent format: XX-NNNNNNNN-YY
 * Handles special formats like Japanese era-based patent numbers
 * @param patentNumber The patent number to standardize
 * @returns Standardized patent number in format XX-NNNNNNNN-YY
 */
export const standardizePatentNumber = (patentNumber: string): string => {
    // Remove non-alphanumeric characters
    const cleanedNumber = patentNumber.replace(/[^a-zA-Z0-9]/g, '');

    // Regular expression to capture country code, optional era letter, serial number, and kind code
    const pattern = /^([A-Za-z]{2})([A-Za-z]?)(\d+)([A-Za-z]\d*)?$/;
    const match = cleanedNumber.match(pattern);

    if (!match) {
        return patentNumber; // Return original if pattern doesn't match
    }

    let countryCode = match[1].toUpperCase();
    const eraLetter = match[2].toUpperCase();
    const serialNumber = match[3];
    const kindCode = match[4] ? match[4].toUpperCase() : '';

    // Remove era letter for Japanese patents
    if (countryCode === 'JP' && (eraLetter === 'H' || eraLetter === 'S' || eraLetter === 'R')) {
        // Convert imperial year to Western year if necessary
        const year = parseInt(serialNumber.substring(0, 2), 10);
        let westernYear = 0; // Initialize with default value
        
        if (eraLetter === 'H') {
            westernYear = 1988 + year;
        } else if (eraLetter === 'S') {
            westernYear = 1925 + year;
        } else if (eraLetter === 'R') {
            westernYear = 2018 + year;
        }
        
        // Adjust serial number to include full Western year
        const adjustedSerialNumber = westernYear.toString() + serialNumber.substring(2);
        return `${countryCode}-${adjustedSerialNumber}${kindCode ? '-' + kindCode : ''}`;
    }

    return `${countryCode}-${serialNumber}${kindCode ? '-' + kindCode : ''}`;
}

/**
 * Checks if a patent ID belongs to a US patent
 * @param patentId The patent ID to check
 * @returns True if the patent is a US patent, false otherwise
 */
export const isUSPatent = (patentId: string): boolean => {
    // Standardize the patent ID first
    const standardized = standardizePatentNumber(patentId);
    // Check if it starts with US-
    return standardized.startsWith('US-');
}

/**
 * Extracts the country code from a patent ID
 * @param patentId The patent ID
 * @returns The country code (e.g., 'US', 'KR')
 */
export const getPatentCountry = (patentId: string): string => {
    // Standardize the patent ID first
    const standardized = standardizePatentNumber(patentId);
    // Extract the country code (first part before the dash)
    const parts = standardized.split('-');
    return parts[0] || '';
}

/**
 * Filters a list of family members to include only US patents
 * @param familyMembers Array of family member objects with publication_number property
 * @returns Array of family members filtered to include only US patents
 */
export const filterUSFamilyMembers = (familyMembers: any[]): any[] => {
    return familyMembers.filter(member => {
        if (!member.publication_number) return false;
        return isUSPatent(member.publication_number);
    });
}

export const filterPatentsByFamilyId = (patents: any[], isUnifiedSearch: boolean, isSmartSearch: boolean) => {
  if (!isUnifiedSearch || !isSmartSearch) {
    return patents;
  }

  const familyIds = new Set();
  const filteredPatents = [];

  for (const patent of patents) {
    const familyId = patent._source?.family_id;
    if (!familyId || !familyIds.has(familyId)) {
      familyIds.add(familyId);
      filteredPatents.push(patent);
    }
  }

  return filteredPatents;
};

// export function normalizePatentIds(rawText: string): string[] {
//   const regexCompact = /^([A-Z]{2})(\d+)([A-Z]\d?)$/;
//   const regexFormatted = /^([A-Z]{2})-(\d+)-([A-Z]\d?)$/;

//   // Split on common delimiters: comma, semicolon, newline, tab, space, or pipe
//   const rawIds = rawText.split(/[\s,;|\n\r\t]+/).map(id => id.trim()).filter(Boolean);

//   const normalized = rawIds.map(id => {
//     if (regexFormatted.test(id)) {
//       return id; // Already in normalized format
//     }

//     const match = id.match(regexCompact);
//     if (match) {
//       const [, country, number, kind] = match;
//       return `${country}-${number}-${kind}`;
//     }

//     console.warn(`Skipping unrecognized ID: ${id}`);
//     return null;
//   });

//   // Remove nulls and duplicates
//   return [...new Set(normalized.filter((id): id is string => id !== null))];
// }
export function normalizePatentIds(rawText: any) {
    const regexCompact = /^([A-Z]{2,3})(\d+)([A-Z]+\d*)$/;
    const regexFormatted = /^([A-Z]{2,3})-(\d+)-([A-Z]+\d*)$/;
  
    const rawIds = rawText
      .split(/[\s,;|\n\r\t]+/)
      .map((id: any) => id.replace(/\(.*?\)/g, '').trim())
      .filter(Boolean);
  
    const normalized = rawIds.map((id: any) => {
      if (regexFormatted.test(id)) {
        return id;
      }
  
      const match = id.match(regexCompact);
      if (match) {
        const [, country, number, kind] = match;
        return `${country}-${number}-${kind}`;
      }
  
      console.warn(`Skipping unrecognized ID: ${id}`);
      return null;
    });
  
    return [...new Set(normalized.filter(Boolean))];
  }
  
/**
 * Corrects patent ID variations to a standardized format
 * @param patentId The patent ID to correct
 * @returns The corrected patent ID in standardized format
 */
export const variationCorrection = (patentId: string): string => {
  // Remove any spaces and convert to uppercase
  const cleanId = patentId.replace(/\s+/g, '').toUpperCase();
  console.log('Clean ID:', cleanId);
  
  // More flexible patterns for different patent formats
  const patterns = {
    US: {
      from: /^US(\d+)([A-Z]+\d*)$/,
      to: 'US-$1-$2'
    },
    EP: {
      from: /^EP(\d+)([A-Z]+\d*)$/,
      to: 'EP-$1-$2'
    },
    WO: {
      from: /^WO(\d{4})(\d+)([A-Z]+\d*)$/,
      to: 'WO-$1/$2-$3'
    },
    JP: {
      from: /^JP(\d{4,})([A-Z]+\d*)$/,
      to: 'JP-$1-$2'
    },
    KR: {
      from: /^KR(?:10)?(\d{4,})([A-Z]+\d*)$/,
      to: 'KR-$1-$2'
    },
    CN: {
      from: /^CN(?:10)?(\d{4,})([A-Z]+\d*)$/,
      to: 'CN-$1-$2'
    },
    DE: {
      from: /^DE(\d+)([A-Z]+\d*)$/,
      to: 'DE-$1-$2'
    },
    GB: {
      from: /^GB(\d+)([A-Z]+\d*)$/,
      to: 'GB-$1-$2'
    },
    FR: {
      from: /^FR(\d+)([A-Z]+\d*)$/,
      to: 'FR-$1-$2'
    }
  };

  // Get country code from the start of the ID
  const countryCode = cleanId.substring(0, 2);
  
  // If we have a pattern for this country code
  if (countryCode in patterns) {
    const { from, to } = patterns[countryCode as keyof typeof patterns];
    const corrected = cleanId.replace(from, to);
    
    console.log(`Processing ${countryCode} patent`);
    console.log('Pattern:', from);
    console.log('Replacement:', to);
    console.log('Result:', corrected);
    
    // Only return the corrected version if it's different from the input
    if (corrected !== cleanId) {
      return corrected;
    }
  }

  // Special case for Japanese era-based patents
  if (countryCode === 'JP' && /^JP[HSR]\d/.test(cleanId)) {
    console.log('Processing Japanese era-based patent');
    const eraLetter = cleanId[2];
    const restOfId = cleanId.substring(3);
    const year = parseInt(restOfId.substring(0, 2), 10);
    let westernYear = year;
    
    if (eraLetter === 'H') {
      westernYear += 1988;
    } else if (eraLetter === 'S') {
      westernYear += 1925;
    } else if (eraLetter === 'R') {
      westernYear += 2018;
    }
    
    const result = `JP-${westernYear}${restOfId}`;
    console.log('Japanese era conversion result:', result);
    return result;
  }

  console.log('No pattern matched, returning original:', patentId);
  return patentId;
};

export const variationCorrectionForSearch = (patentId: string): string => {
  // Remove any spaces and convert to uppercase
  const cleanId = patentId.replace(/\s+/g, '').toUpperCase();
  console.log('Clean ID for search:', cleanId);
  
  // Special handling for KR patents first
  if (cleanId.startsWith('KR')) {
    console.log('Processing KR patent for search');
    // Handle both formats: KR10-20130000660 and KR-1020130000660
    let processedId = cleanId;
    
    // Remove '10' after country code if present
    if (cleanId.startsWith('KR10')) {
      processedId = 'KR' + cleanId.substring(4);
    }
    
    // Remove '10' after hyphen if present
    if (processedId.includes('-10')) {
      processedId = processedId.replace('-10', '-');
    }
    
    // Add proper formatting if needed
    const match = processedId.match(/^KR-?(\d+)([A-Z]+\d*)?$/);
    if (match) {
      const number = match[1];
      const kindCode = match[2] || '';
      const formatted = `KR-${number}${kindCode ? '-' + kindCode : ''}`;
      console.log('KR patent formatted:', formatted);
      return formatted;
    }
  }
  
  // More flexible patterns for different patent formats
  const patterns = {
    US: {
      from: /^US(\d+)([A-Z]+\d*)$/,
      to: 'US-$1-$2'
    },
    EP: {
      from: /^EP(\d+)([A-Z]+\d*)$/,
      to: 'EP-$1-$2'
    },
    WO: {
      from: /^WO(\d{4})(\d+)([A-Z]+\d*)$/,
      to: 'WO-$1/$2-$3'
    },
    JP: {
      from: /^JP(\d{4,})([A-Z]+\d*)$/,
      to: 'JP-$1-$2'
    },
    CN: {
      from: /^CN(?:10)?(\d{4,})([A-Z]+\d*)$/,
      to: 'CN-$1-$2'
    },
    DE: {
      from: /^DE(\d+)([A-Z]+\d*)$/,
      to: 'DE-$1-$2'
    },
    GB: {
      from: /^GB(\d+)([A-Z]+\d*)$/,
      to: 'GB-$1-$2'
    },
    FR: {
      from: /^FR(\d+)([A-Z]+\d*)$/,
      to: 'FR-$1-$2'
    }
  };

  // Get country code from the start of the ID
  const countryCode = cleanId.substring(0, 2);
  
  // If we have a pattern for this country code
  if (countryCode in patterns) {
    const { from, to } = patterns[countryCode as keyof typeof patterns];
    const corrected = cleanId.replace(from, to);
    
    console.log(`Processing ${countryCode} patent for search`);
    console.log('Pattern:', from);
    console.log('Replacement:', to);
    console.log('Result:', corrected);
    
    // Only return the corrected version if it's different from the input
    if (corrected !== cleanId) {
      return corrected;
    }
  }

  // Special case for Japanese era-based patents
  if (countryCode === 'JP' && /^JP[HSR]\d/.test(cleanId)) {
    console.log('Processing Japanese era-based patent for search');
    const eraLetter = cleanId[2];
    const restOfId = cleanId.substring(3);
    const year = parseInt(restOfId.substring(0, 2), 10);
    let westernYear = year;
    
    if (eraLetter === 'H') {
      westernYear += 1988;
    } else if (eraLetter === 'S') {
      westernYear += 1925;
    } else if (eraLetter === 'R') {
      westernYear += 2018;
    }
    
    const result = `JP-${westernYear}${restOfId}`;
    console.log('Japanese era conversion result for search:', result);
    return result;
  }

  console.log('No pattern matched for search, returning original:', patentId);
  return patentId;
};
  