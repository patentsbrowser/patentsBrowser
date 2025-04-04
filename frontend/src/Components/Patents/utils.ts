import React, { useState, useEffect } from 'react';
import { ApiSource } from './types';

// Detect which API to use based on the patent ID format
export const detectApiType = (patentId: string, defaultApi: ApiSource = 'serpapi'): ApiSource => {
  // Pattern for Unified Patents API format that handles various international formats
  // Modified to support Korean patents (KR-1020120094549-A) with longer numeric sections
  const unifiedPattern = /^[A-Z]{2}-\d+-[A-Z]\d?$/i;
  
  // Pattern for SerpAPI format (e.g., US8125463B2)
  const serpapiPattern = /^[A-Z]{2}\d+[A-Z]\d$/i;
  
  // If it matches unified format, use unified API
  if (unifiedPattern.test(patentId.trim())) {
    return 'unified';
  }
  
  // If it matches serpapi format, use serpapi API
  if (serpapiPattern.test(patentId.trim())) {
    return 'serpapi';
  }
  
  // Default to the provided default API if no specific format is detected
  return defaultApi;
};

// Update the formatDate function to handle missing dates
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) {
    return 'Date not found';
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    
    // Subtract one day from the date
    date.setDate(date.getDate() - 1);
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Date processing error';
  }
};

// Utility hook for responsive design
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  
  return windowSize;
}; 