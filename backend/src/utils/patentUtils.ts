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