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
  
  // Get country code from the start of the ID
  const countryCode = cleanId.substring(0, 2);
  
  // Handle both formats: with and without hyphens
  if (['KR', 'CN'].includes(countryCode)) {
    // Remove hyphens first if present
    const withoutHyphens = cleanId.replace(/-/g, '');
    
    // Check if it starts with country code followed by 10 (with or without hyphens)
    if (withoutHyphens.startsWith(`${countryCode}10`)) {
      // Remove '10' after country code
      const correctedId = withoutHyphens.replace(/^([A-Z]{2})10/, '$1');
      console.log('Removed 10 prefix:', correctedId);
      return correctedId;
    }

    // Handle KR patents with full year format (e.g., KR-19950026291)
    if (countryCode === 'KR' && withoutHyphens.length >= 6) {
      const yearPart = withoutHyphens.substring(2, 6);
      // Check if the year part is a valid 4-digit year (1900-2099)
      if (/^(19|20)\d{2}$/.test(yearPart)) {
        // Remove first two digits of the year
        const correctedId = withoutHyphens.substring(0, 2) + withoutHyphens.substring(4);
        console.log('Removed first two digits of year:', correctedId);
        return correctedId;
      }
    }

    // Handle KR patents with 10 after hyphen (e.g., KR-1020120086963)
    if (countryCode === 'KR' && cleanId.includes('-')) {
      const parts = cleanId.split('-');
      if (parts.length >= 2 && parts[1].startsWith('10')) {
        // Remove '10' from the part after the hyphen
        parts[1] = parts[1].substring(2);
        const correctedId = parts.join('-');
        console.log('Removed 10 after hyphen:', correctedId);
        return correctedId;
      }
    }
  }

  // Return original ID if no transformation needed
  console.log('No transformation needed, returning original:', patentId);
  return patentId;
};
  