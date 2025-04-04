import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faChevronDown, faChevronUp, faLayerGroup, faListAlt } from '@fortawesome/free-solid-svg-icons';
import './PatentHighlighter.scss';

interface TermColor {
  term: string;
  color: string;
}

interface PatentHighlighterProps {
  targetSelector: string; // CSS selector for elements to highlight within
}

// Predefined term sets (similar to Excel table ranges)
const PREDEFINED_SETS = {
  technical: {
    name: 'Technical Terms',
    color: '#3357FF', // Blue
    terms: ['processor', 'memory', 'software', 'hardware', 'module', 'algorithm', 'network', 'interface', 'circuit', 'sensor']
  },
  legal: {
    name: 'Legal Terms',
    color: '#FF5733', // Red-Orange
    terms: ['claim', 'embodiment', 'prior art', 'comprising', 'wherein', 'method', 'apparatus', 'system', 'configured to', 'patent']
  },
  chemical: {
    name: 'Chemical Compounds',
    color: '#33FF57', // Green
    terms: ['compound', 'polymer', 'solution', 'molecule', 'acid', 'base', 'oxide', 'metal', 'catalyst', 'reaction']
  },
  mechanical: {
    name: 'Mechanical Components',
    color: '#FF33F5', // Pink
    terms: ['gear', 'shaft', 'bearing', 'housing', 'fastener', 'spring', 'valve', 'motor', 'actuator', 'mechanism']
  }
};

/**
 * PatentHighlighter component - highlights search terms in patent details
 */
const PatentHighlighter: React.FC<PatentHighlighterProps> = ({ targetSelector }) => {
  const [searchTerms, setSearchTerms] = useState<TermColor[]>([]);
  const [inputTerm, setInputTerm] = useState('');
  const [showPredefinedSets, setShowPredefinedSets] = useState(false);
  const [foundMatches, setFoundMatches] = useState<{term: string, count: number, color: string}[]>([]);
  const [customTermSet, setCustomTermSet] = useState('');
  const [highlightId, setHighlightId] = useState(0); // For tracking highlight operations
  
  const colorOptions = [
    '#FF5733', // Red-Orange
    '#33FF57', // Green
    '#3357FF', // Blue
    '#FF33F5', // Pink
    '#F5FF33', // Yellow
    '#33FFF5', // Cyan
    '#7D33FF', // Purple
    '#FF7D33', // Orange
  ];
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add a new term to search
  const addSearchTerm = () => {
    if (!inputTerm.trim()) return;
    
    // Add the term with a color
    const newTerm: TermColor = {
      term: inputTerm.trim(),
      color: colorOptions[searchTerms.length % colorOptions.length]
    };
    
    setSearchTerms(prevTerms => [...prevTerms, newTerm]);
    setInputTerm('');
    
    // Focus input for next term
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Remove a search term
  const removeSearchTerm = (index: number) => {
    const updatedTerms = [...searchTerms];
    updatedTerms.splice(index, 1);
    setSearchTerms(updatedTerms);
  };
  
  // Add a predefined set of terms to the search
  const addPredefinedSet = (setKey: keyof typeof PREDEFINED_SETS) => {
    const setData = PREDEFINED_SETS[setKey];
    
    // Add each term from the set with the set's color
    const newTerms = setData.terms.map(term => ({
      term,
      color: setData.color
    }));
    
    setSearchTerms(prevTerms => [...prevTerms, ...newTerms]);
    setShowPredefinedSets(false);
  };
  
  // Add all terms from the custom term set (comma separated)
  const addCustomTermSet = () => {
    if (!customTermSet.trim()) return;
    
    const terms = customTermSet
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0);
    
    // Assign a color to the entire custom set
    const setColor = colorOptions[searchTerms.length % colorOptions.length];
    
    // Add each term from the custom set
    const newTerms = terms.map(term => ({
      term,
      color: setColor
    }));
    
    setSearchTerms(prevTerms => [...prevTerms, ...newTerms]);
    setCustomTermSet('');
  };

  // Function to safely check if an element is owned by React and is safe to modify
  const isSafeToModify = (element: Element): boolean => {
    // Skip modifying elements that are interactive or controlled by React handlers
    return !(
      element.closest('.clickable') || 
      element.closest('.claims-header') || 
      element.closest('.description-header')
    );
  };

  // Function to clear all highlights safely
  const clearHighlights = () => {
    try {
      const elements = document.querySelectorAll(targetSelector);
      
      elements.forEach(element => {
        // Skip elements that are not safe to modify
        if (!isSafeToModify(element)) {
          return;
        }
        
        // Get all highlighted spans in this element
        const highlightSpans = element.querySelectorAll('.highlight-term');
        
        if (highlightSpans.length === 0) {
          // No highlights to clear
          return;
        }
        
        // Collect the original text content
        let originalText = '';
        element.childNodes.forEach(node => {
          originalText += node.textContent || '';
        });
        
        // Safely reset the element content
        if (originalText) {
          element.textContent = originalText;
        }
      });
      
      setFoundMatches([]);
    } catch (err) {
      console.error('Error clearing highlights:', err);
    }
  };

  // Function to highlight text in the DOM with safety checks
  const applyHighlights = () => {
    // First clear any existing highlights
    clearHighlights();
    
    // Don't proceed if there are no search terms
    if (searchTerms.length === 0) {
      return;
    }
    
    try {
      // Get all elements matching the selector
      const elements = document.querySelectorAll(targetSelector);
      
      // Counter for matches
      const matchCounts: {term: string, count: number, color: string}[] = [];
      
      // Process each element
      elements.forEach(element => {
        // Skip elements that are not safe to modify
        if (!isSafeToModify(element)) {
          return;
        }
        
        // Clone the element to work with its content safely
        const originalText = element.textContent || '';
        if (!originalText.trim()) {
          return; // Skip empty elements
        }
        
        // Create a document fragment to build the highlighted content
        const fragment = document.createDocumentFragment();
        
        // Track all matches
        type Match = { term: string; index: number; length: number; color: string };
        const allMatches: Match[] = [];
        
        // Find all matches for all terms
        searchTerms.forEach(({ term, color }) => {
          if (!term.trim()) return;
          
          try {
            const regex = new RegExp(term, 'gi');
            let match;
            
            while ((match = regex.exec(originalText)) !== null) {
              allMatches.push({
                term,
                index: match.index,
                length: match[0].length,
                color
              });
              
              // Update match counts
              const existingCount = matchCounts.find(m => m.term === term);
              if (existingCount) {
                existingCount.count++;
              } else {
                matchCounts.push({ term, count: 1, color });
              }
            }
          } catch (err) {
            console.error(`Error processing regex for term '${term}':`, err);
          }
        });
        
        // If no matches found, leave the element as is
        if (allMatches.length === 0) {
          return;
        }
        
        // Sort matches by their position in the text
        allMatches.sort((a, b) => a.index - b.index);
        
        // Process non-overlapping matches
        let currentPosition = 0;
        
        for (const match of allMatches) {
          // Skip this match if it overlaps with already processed text
          if (match.index < currentPosition) {
            continue;
          }
          
          // Add text before the match
          if (match.index > currentPosition) {
            const textNode = document.createTextNode(
              originalText.slice(currentPosition, match.index)
            );
            fragment.appendChild(textNode);
          }
          
          // Create highlighted span for the match
          const span = document.createElement('span');
          span.className = 'highlight-term';
          span.style.backgroundColor = match.color;
          span.textContent = originalText.slice(match.index, match.index + match.length);
          fragment.appendChild(span);
          
          // Update current position
          currentPosition = match.index + match.length;
        }
        
        // Add any remaining text
        if (currentPosition < originalText.length) {
          const textNode = document.createTextNode(
            originalText.slice(currentPosition)
          );
          fragment.appendChild(textNode);
        }
        
        // Clear the element and append the new content
        // This needs to be done carefully to not conflict with React
        try {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          element.appendChild(fragment);
        } catch (err) {
          console.error('Error modifying DOM:', err);
          // If we can't modify the DOM, just reset to original
          element.textContent = originalText;
        }
      });
      
      // Update match counts in state
      setFoundMatches(matchCounts);
    } catch (err) {
      console.error('Error applying highlights:', err);
    }
  };
  
  // Clear all search terms
  const clearAllTerms = () => {
    clearHighlights();
    setSearchTerms([]);
  };

  // Apply highlighting when search terms change
  useLayoutEffect(() => {
    if (searchTerms.length > 0) {
      // Use a small timeout to let React finish its rendering cycle
      const timeoutId = setTimeout(() => {
        applyHighlights();
      }, 0);
      
      // Cleanup timeout
      return () => clearTimeout(timeoutId);
    } else {
      clearHighlights();
    }
    
    // Cleanup when component unmounts
    return () => {
      clearHighlights();
    };
  }, [searchTerms, targetSelector, highlightId]);

  // Reapply highlights when DOM changes (expansion/collapse)
  useEffect(() => {
    const handleDomChanges = () => {
      if (searchTerms.length > 0) {
        // Increment the highlight ID to trigger a refresh
        setHighlightId(prev => prev + 1);
      }
    };

    // Create a mutation observer to detect when claims or description is expanded
    const observer = new MutationObserver(handleDomChanges);
    
    // Elements to observe - claims and description content
    const claimsContent = document.querySelector('.claims-content');
    const descriptionContent = document.querySelector('.description-content');
    
    // Start observing with subtree option to catch deeper changes
    if (claimsContent) {
      observer.observe(claimsContent, { childList: true, subtree: true });
    }
    if (descriptionContent) {
      observer.observe(descriptionContent, { childList: true, subtree: true });
    }
    
    // Clean up observer
    return () => {
      observer.disconnect();
    };
  }, [searchTerms]);

  return (
    <div className="patent-highlighter">
      <div className="highlighter-header">
        <h4>
          <FontAwesomeIcon icon={faSearch} /> Patent Highlighter
        </h4>
      </div>
      
      <div className="highlighter-content">
        <div className="search-input-container">
          <input
            type="text"
            value={inputTerm}
            onChange={(e) => setInputTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSearchTerm()}
            placeholder="Enter a term to highlight..."
            ref={inputRef}
          />
          <button onClick={addSearchTerm}>Add</button>
          <button 
            className="predefined-btn"
            onClick={() => setShowPredefinedSets(!showPredefinedSets)}
            title="Use predefined term sets"
          >
            <FontAwesomeIcon icon={faLayerGroup} />
          </button>
          <button onClick={clearAllTerms} className="clear-btn">Clear All</button>
        </div>
        
        {showPredefinedSets && (
          <div className="predefined-sets">
            <h5>Predefined Term Sets:</h5>
            <div className="sets-container">
              {Object.entries(PREDEFINED_SETS).map(([key, set]) => (
                <button 
                  key={key} 
                  className="set-button"
                  onClick={() => addPredefinedSet(key as keyof typeof PREDEFINED_SETS)}
                  style={{ borderColor: set.color }}
                >
                  <span className="set-name">{set.name}</span>
                  <span className="set-count">{set.terms.length} terms</span>
                </button>
              ))}
            </div>
            
            <div className="custom-set">
              <h5>
                <FontAwesomeIcon icon={faListAlt} /> Custom Term Set:
              </h5>
              <textarea
                value={customTermSet}
                onChange={(e) => setCustomTermSet(e.target.value)}
                placeholder="Enter terms separated by commas..."
                rows={3}
                ref={textareaRef}
              ></textarea>
              <button onClick={addCustomTermSet}>Add Custom Set</button>
            </div>
          </div>
        )}
        
        {searchTerms.length > 0 && (
          <div className="search-terms-list">
            <h5>Search Terms: ({searchTerms.length})</h5>
            <div className="terms-container">
              {searchTerms.map((term, index) => (
                <div 
                  key={index} 
                  className="term-badge"
                  style={{ backgroundColor: term.color }}
                >
                  <span>{term.term}</span>
                  <button onClick={() => removeSearchTerm(index)}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {foundMatches.length > 0 && (
          <div className="matches-summary">
            <h5>Found Matches: ({foundMatches.reduce((sum, match) => sum + match.count, 0)} total)</h5>
            <div className="matches-container">
              {foundMatches.map((match, index) => (
                <div key={index} className="match-item">
                  <span 
                    className="match-term"
                    style={{ backgroundColor: match.color }}
                  >
                    {match.term}
                  </span>
                  <span className="match-count">{match.count} matches</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatentHighlighter; 