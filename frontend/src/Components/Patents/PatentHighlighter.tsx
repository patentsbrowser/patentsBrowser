import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faTimes,
  faChevronDown,
  faChevronUp,
  faLayerGroup,
  faListAlt,
  faPlus,
  faSlidersH,
  faCode,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import "./PatentHighlighter.scss";

interface TermColor {
  term: string;
  color: string;
}

interface ProximityTerm {
  terms: string[];
  distance: number;
  color: string;
}

interface PatentHighlighterProps {
  targetSelector: string; // CSS selector for elements to highlight within
  isOpen?: boolean; // New prop for modal state
  onClose?: () => void; // New prop for closing modal
}

interface PredefinedSet {
  name: string;
  color: string;
  terms: string[];
}

interface PredefinedSets {
  [key: string]: PredefinedSet;
}

interface Offset {
  word: string;
  start: number;
}

// Track all matches (either simple term or proximity matches)
type Match = {
  term: string;
  index: number;
  length: number;
  color: string;
};

// Predefined term sets (similar to Excel table ranges)
const PREDEFINED_SETS: PredefinedSets = {
  technical: {
    name: "Technical Terms",
    color: "#3357FF", // Blue
    terms: [
      "processor",
      "memory",
      "software",
      "hardware",
      "module",
      "algorithm",
      "network",
      "interface",
      "circuit",
      "sensor",
    ],
  },
  legal: {
    name: "Legal Terms",
    color: "#FF5733", // Red-Orange
    terms: [
      "claim",
      "embodiment",
      "prior art",
      "comprising",
      "wherein",
      "method",
      "apparatus",
      "system",
      "configured to",
      "patent",
    ],
  },
  chemical: {
    name: "Chemical Compounds",
    color: "#33FF57", // Green
    terms: [
      "compound",
      "polymer",
      "solution",
      "molecule",
      "acid",
      "base",
      "oxide",
      "metal",
      "catalyst",
      "reaction",
    ],
  },
  mechanical: {
    name: "Mechanical Components",
    color: "#FF33F5", // Pink
    terms: [
      "gear",
      "shaft",
      "bearing",
      "housing",
      "fastener",
      "spring",
      "valve",
      "motor",
      "actuator",
      "mechanism",
    ],
  },
};

/**
 * PatentHighlighter component - highlights search terms in patent details
 */
const PatentHighlighter: React.FC<PatentHighlighterProps> = ({
  targetSelector,
  isOpen = false, // Default to false for backward compatibility
  onClose,
}) => {
  const [searchTerms, setSearchTerms] = useState<TermColor[]>([]);
  const [proximitySearches, setProximitySearches] = useState<ProximityTerm[]>(
    []
  );
  const [formulaSearches, setFormulaSearches] = useState<
    { formula: string; color: string }[]
  >([]);
  const [inputTerm, setInputTerm] = useState("");
  const [activeSearchType, setActiveSearchType] = useState<'predefined' | 'proximity' | 'formula' | null>(null);
  const [foundMatches, setFoundMatches] = useState<
    { term: string; count: number; color: string }[]
  >([]);
  const [customTermSet, setCustomTermSet] = useState("");
  const [highlightId, setHighlightId] = useState(0); // For tracking highlight operations

  // Proximity search state
  const [proximityFirstTerm, setProximityFirstTerm] = useState("");
  const [proximityDistance, setProximityDistance] = useState(5);
  const [proximityTerms, setProximityTerms] = useState<string[]>([]);

  const [formulaInput, setFormulaInput] = useState("");

  const colorOptions = [
    "#FF5733", // Red-Orange
    "#33FF57", // Green
    "#3357FF", // Blue
    "#FF33F5", // Pink
    "#F5FF33", // Yellow
    "#33FFF5", // Cyan
    "#7D33FF", // Purple
    "#FF7D33", // Orange
  ];
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const proximityFirstTermRef = useRef<HTMLInputElement>(null);

  // Add a new term to search
  // const addSearchTerm = () => {
  //   if (!inputTerm.trim()) return;

  //   // Add the term with a color
  //   const newTerm: TermColor = {
  //     term: inputTerm.trim(),
  //     color: colorOptions[searchTerms.length % colorOptions.length],
  //   };

  //   setSearchTerms((prevTerms) => [...prevTerms, newTerm]);
  //   setInputTerm("");

  //   // Focus input for next term
  //   if (inputRef.current) {
  //     inputRef.current.focus();
  //   }
  // };

  // Add a term to the proximity search list
  const addTermToProximitySearch = () => {
    if (!proximityFirstTerm.trim()) return;

    setProximityTerms((prev) => [...prev, proximityFirstTerm.trim()]);
    setProximityFirstTerm("");

    // Focus the input again for next term
    if (proximityFirstTermRef.current) {
      proximityFirstTermRef.current.focus();
    }
  };

  // Create and add a proximity search
  const createProximitySearch = () => {
    if (proximityTerms.length < 2) return;

    const newProximitySearch: ProximityTerm = {
      terms: [...proximityTerms],
      distance: proximityDistance,
      color: colorOptions[proximitySearches.length % colorOptions.length],
    };

    setProximitySearches((prev) => [...prev, newProximitySearch]);

    // Clear the state for the next proximity search
    setProximityTerms([]);
    setProximityDistance(5);
  };

  // Remove a search term
  const removeSearchTerm = (index: number) => {
    const updatedTerms = [...searchTerms];
    updatedTerms.splice(index, 1);
    setSearchTerms(updatedTerms);
  };

  // Remove a proximity search
  const removeProximitySearch = (index: number) => {
    const updatedSearches = [...proximitySearches];
    updatedSearches.splice(index, 1);
    setProximitySearches(updatedSearches);
  };

  // Remove a term from proximity search list
  const removeProximityTerm = (index: number) => {
    const updatedTerms = [...proximityTerms];
    updatedTerms.splice(index, 1);
    setProximityTerms(updatedTerms);
  };

  // Add a predefined set of terms to the search
  const addPredefinedSet = (setKey: string) => {
    const setData = PREDEFINED_SETS[setKey];

    // Add each term from the set with the set's color
    const newTerms = setData.terms.map((term) => ({
      term,
      color: setData.color,
    }));

    setSearchTerms((prevTerms) => [...prevTerms, ...newTerms]);
    setActiveSearchType(null);
  };

  // Add all terms from the custom term set (comma separated)
  const addCustomTermSet = () => {
    if (!customTermSet.trim()) return;

    const terms = customTermSet
      .split(",")
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    // Assign a color to the entire custom set
    const setColor = colorOptions[searchTerms.length % colorOptions.length];

    // Add each term from the custom set
    const newTerms = terms.map((term) => ({
      term,
      color: setColor,
    }));

    setSearchTerms((prevTerms) => [...prevTerms, ...newTerms]);
    setCustomTermSet("");
  };

  // Add formula search
  const addFormulaSearch = () => {
    if (!formulaInput.trim()) return;

    console.log("Adding formula search:", formulaInput.trim());

    const newFormulaSearch = {
      formula: formulaInput.trim(),
      color: colorOptions[formulaSearches.length % colorOptions.length],
    };

    setFormulaSearches((prev) => [...prev, newFormulaSearch]);
    setFormulaInput("");

    // Force a highlight update
    setHighlightId((prev) => prev + 1);
  };

  // Remove formula search
  const removeFormulaSearch = (index: number) => {
    const updatedSearches = [...formulaSearches];
    updatedSearches.splice(index, 1);
    setFormulaSearches(updatedSearches);
  };

  // Parse formula input
  const parseFormula = (input: string) => {
    console.log("Parsing formula:", input);

    const escapeRegex = (str: string) =>
      str
        .replace(/([.*+?^${}()|\[\]\\])/g, "\\$1")
        .replace(/\\\?/g, ".")
        .replace(/\\\+/g, ".+")
        .replace(/\\\*/g, ".*");

    // Try proximity match first
    const proximityMatch = input.match(/\(\((.*?)\)\s+(\d+)D\s+\((.*?)\)\)/i);
    if (proximityMatch) {
      console.log("Found proximity match:", proximityMatch);
      const group1 = proximityMatch[1]
        .split(/\s+or\s+/i)
        .map((w) => new RegExp(`^${escapeRegex(w.trim())}$`, "i"));
      const group2 = proximityMatch[3]
        .split(/\s+or\s+/i)
        .map((w) => new RegExp(`^${escapeRegex(w.trim())}$`, "i"));
      const distance = parseInt(proximityMatch[2]);
      return { type: "proximity", group1, group2, distance };
    }

    // Try single term match
    const groupMatch = input.match(/^\((.*?)\)$/);
    if (groupMatch) {
      console.log("Found single term match:", groupMatch);
      const group = groupMatch[1]
        .split(/\s+or\s+/i)
        .map((w) => new RegExp(`^${escapeRegex(w.trim())}$`, "i"));
      return { type: "single", group };
    }

    console.log("No valid formula pattern found");
    return null;
  };

  // Function to safely check if an element is owned by React and is safe to modify
  const isSafeToModify = (element: Element): boolean => {
    // Skip modifying elements that are interactive or controlled by React handlers
    return !(
      element.closest(".clickable") ||
      // Only check headers, not the content sections
      element.closest(".claims-header") ||
      element.closest(".description-header")
    );
  };

  // Improved function to handle text content in elements with nested children
  const getTextWithOffsets = (element: Element): { text: string; nodes: Array<Node | Text> } => {
    // Get all text nodes recursively
    const nodes: Array<Node | Text> = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }

    // Combine text from all nodes
    const text = nodes.map(node => node.textContent).join('');
    
    return { text, nodes };
  };

  // Wrap clearHighlights in useCallback
  const clearHighlights = useCallback(() => {
    // Don't clear if there's nothing to clear
    if (foundMatches.length === 0) {
      return;
    }
    
    try {
      // Keep track if we actually cleared anything
      let anyCleared = false;
      const elements = document.querySelectorAll(targetSelector);

      elements.forEach((element) => {
        // Skip elements that are not safe to modify
        if (!isSafeToModify(element)) {
          return;
        }

        // Get all highlighted spans in this element
        const highlightSpans = element.querySelectorAll(".highlight-term");

        if (highlightSpans.length === 0) {
          // No highlights to clear
          return;
        }

        // If we get here, we have spans to clear
        anyCleared = true;

        // Instead of replacing content, unwrap each highlighted span
        // This preserves the original DOM structure better
        highlightSpans.forEach(span => {
          try {
            // Create a text node with the span's content
            const textNode = document.createTextNode(span.textContent || "");
            // Replace the span with its text content
            span.parentNode?.replaceChild(textNode, span);
          } catch (spanErr) {
            console.error(`Error unwrapping highlight span: ${spanErr.message}`);
          }
        });
      });

      // Only reset state if we actually cleared something
      if (anyCleared) {
        setFoundMatches([]);
      }
    } catch (err) {
      console.error(`Error clearing highlights: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Target selector: ${targetSelector}`);
    }
  }, [targetSelector, foundMatches]);

  // Add a custom function to check if highlights need to be reapplied
  const needsHighlighting = useCallback((): boolean => {
    // If we have search terms but no highlights, we need to highlight
    if ((searchTerms.length > 0 || proximitySearches.length > 0 || formulaSearches.length > 0) && 
        foundMatches.length === 0) {
      return true;
    }
    
    // Check if any highlights are missing from the DOM
    const elements = document.querySelectorAll(targetSelector);
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (!isSafeToModify(element)) continue;
      
      const text = element.textContent || "";
      if (!text.trim()) continue;
      
      // Check for any search term in the text
      for (const { term } of searchTerms) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(text)) {
          // If we found a term but no highlight spans, we need to rehighlight
          if (element.querySelectorAll('.highlight-term').length === 0) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [searchTerms, proximitySearches, formulaSearches, foundMatches, targetSelector]);

  // Helper function to find proximity matches in text
  const findProximityMatches = (
    text: string,
    proximitySearch: ProximityTerm
  ): { start: number; end: number }[] => {
    const matches: { start: number; end: number }[] = [];

    // Split the text into words
    const words = text.split(/\s+/);

    // For debugging
    console.log("Proximity search terms:", proximitySearch.terms);
    console.log("Text to search in:", text);
    console.log("Words array:", words);

    // Create arrays of positions for each term
    const termPositions: number[][] = [];

    // Find all occurrences of each term in the text
    proximitySearch.terms.forEach((term) => {
      const termLower = term.toLowerCase();
      const positions: number[] = [];

      words.forEach((word, index) => {
        if (word.toLowerCase().includes(termLower)) {
          positions.push(index);
        }
      });

      console.log(`Positions for term "${term}":`, positions);
      termPositions.push(positions);
    });

    // If any term has no occurrences, return empty matches
    if (termPositions.some((positions) => positions.length === 0)) {
      console.log("Some terms not found in text");
      return matches;
    }

    // Find all combinations of positions that are within the distance
    const findValidCombinations = (
      currentIndex: number,
      currentCombination: number[]
    ): void => {
      // If we've processed all terms, check if the combination is valid
      if (currentIndex >= termPositions.length) {
        // Check if all positions are within the distance
        const min = Math.min(...currentCombination);
        const max = Math.max(...currentCombination);

        if (max - min <= proximitySearch.distance) {
          // This is a valid combination - find the exact text span
          let startWordIndex = min;
          let endWordIndex = max;

          // Determine the start position (character index) in the original text
          let startCharIndex = 0;
          let endCharIndex = text.length;

          // Find the start character index
          if (startWordIndex > 0) {
            let wordStartIndex = 0;
            for (let i = 0; i < startWordIndex; i++) {
              const wordLength = words[i].length;
              wordStartIndex =
                text.indexOf(words[i], wordStartIndex) + wordLength;
              if (wordStartIndex === -1 + wordLength) break;
            }
            startCharIndex = text.indexOf(
              words[startWordIndex],
              wordStartIndex
            );
          } else {
            startCharIndex = text.indexOf(words[0]);
          }

          // Find the end character index
          let wordEndIndex = 0;
          for (let i = 0; i <= endWordIndex; i++) {
            const nextIndex = text.indexOf(words[i], wordEndIndex);
            if (nextIndex === -1) break;
            wordEndIndex = nextIndex + words[i].length;
            if (i === endWordIndex) {
              endCharIndex = wordEndIndex;
            }
          }

          console.log("Found valid match span:", startCharIndex, endCharIndex);
          console.log(
            "Match text:",
            text.substring(startCharIndex, endCharIndex)
          );

          matches.push({ start: startCharIndex, end: endCharIndex });
        }
        return;
      }

      // Try each position for the current term
      for (const position of termPositions[currentIndex]) {
        // Skip this position if it's already in the combination
        if (currentCombination.includes(position)) continue;

        // Add this position to the combination and recurse
        findValidCombinations(currentIndex + 1, [
          ...currentCombination,
          position,
        ]);
      }
    };

    // Start with the first term
    for (const position of termPositions[0]) {
      findValidCombinations(1, [position]);
    }

    console.log("Final matches:", matches);
    return matches;
  };

  // Wrap applyHighlights in useCallback
  const applyHighlights = useCallback(() => {
    // First clear any existing highlights
    try {
      clearHighlights();
    } catch (clearErr) {
      console.error(`Error while clearing highlights before applying new ones: ${clearErr instanceof Error ? clearErr.message : String(clearErr)}`);
    }

    // Don't proceed if there are no search terms and no proximity searches
    if (searchTerms.length === 0 && proximitySearches.length === 0) {
      return;
    }

    try {
      // Get all elements matching the selector
      const elements = document.querySelectorAll(targetSelector);
      console.log("Elements to highlight:", elements.length);

      // Counter for matches - collect all matches before updating state
      const matchCounts: { term: string; count: number; color: string }[] = [];

      // Process each element
      elements.forEach((element) => {
        try {
          // Skip elements that are not safe to modify
          if (!isSafeToModify(element)) {
            console.log("Skipping unsafe element");
            return;
          }

          // Get the element's text and nodes using our improved function
          const { text: elementText, nodes } = getTextWithOffsets(element);
          if (!elementText.trim()) {
            console.log("Skipping empty element");
            return; // Skip empty elements
          }

          console.log(
            "Processing element text:",
            elementText.substring(0, 50) + "..."
          );

          // Process each search term
          let matches: Match[] = [];

          // Add simple term matches
          searchTerms.forEach(({ term, color }) => {
            // Use a proper regex for word boundaries
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            let match;
            
            // Find all matches
            while ((match = regex.exec(elementText)) !== null) {
              matches.push({
                term,
                index: match.index,
                length: match[0].length,
                color,
              });
              
              // Add to match counts
              const existingMatch = matchCounts.find((m) => m.term === term);
              if (existingMatch) {
                existingMatch.count++;
              } else {
                matchCounts.push({ term, count: 1, color });
              }
            }
          });

          // Add proximity matches
          proximitySearches.forEach((proxSearch) => {
            const proxMatches = findProximityMatches(elementText, proxSearch);
            proxMatches.forEach(({ start, end }) => {
              const matchText = elementText.substring(start, end);
              matches.push({
                term: proxSearch.terms.join(" near "),
                index: start,
                length: end - start,
                color: proxSearch.color,
              });
              
              // Add to match counts
              const termKey = proxSearch.terms.join(" near ");
              const existingMatch = matchCounts.find((m) => m.term === termKey);
              if (existingMatch) {
                existingMatch.count++;
              } else {
                matchCounts.push({
                  term: termKey,
                  count: 1,
                  color: proxSearch.color,
                });
              }
            });
          });

          // Sort matches by index (ascending)
          matches.sort((a, b) => a.index - b.index);

          // Apply highlights
          if (matches.length > 0) {
            // Create a document fragment to build the highlighted content
            const tempDiv = document.createElement('div');
            let currentIndex = 0;

            // Build the highlighted content
            matches.forEach((match) => {
              // Add text before this match
              if (match.index > currentIndex) {
                tempDiv.appendChild(
                  document.createTextNode(
                    elementText.substring(currentIndex, match.index)
                  )
                );
              }

              // Add the highlighted span
              const span = document.createElement('span');
              span.className = 'highlight-term';
              span.style.backgroundColor = match.color;
              span.textContent = elementText.substring(
                match.index,
                match.index + match.length
              );
              tempDiv.appendChild(span);

              // Update current index
              currentIndex = match.index + match.length;
            });

            // Add any remaining text
            if (currentIndex < elementText.length) {
              tempDiv.appendChild(
                document.createTextNode(elementText.substring(currentIndex))
              );
            }

            // Replace the element's content with the highlighted version
            element.innerHTML = '';
            Array.from(tempDiv.childNodes).forEach(node => {
              element.appendChild(node.cloneNode(true));
            });
          }
        } catch (elementErr) {
          console.error(`Error processing element for highlighting: ${elementErr instanceof Error ? elementErr.message : String(elementErr)}`, element);
        }
      });

      // Update state once with all matches after processing all elements
      if (matchCounts.length > 0) {
        setFoundMatches(matchCounts);
      }
    } catch (err) {
      console.error(`Error applying highlights: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Target selector: ${targetSelector}, Search terms: ${searchTerms.length}, Proximity searches: ${proximitySearches.length}`);
    }
  }, [searchTerms, proximitySearches, targetSelector, clearHighlights, findProximityMatches]);

  // Apply formula highlights
  const applyFormulaHighlights = useCallback(() => {
    if (formulaSearches.length === 0) return;

    try {
      // Get all elements matching the selector
      const elements = document.querySelectorAll(targetSelector);
      const matchCounts: { term: string; count: number; color: string }[] = [];

      // Process each element
      elements.forEach((element) => {
        try {
          if (!isSafeToModify(element)) return;

          // Get the element text using our improved function
          const { text: elementText } = getTextWithOffsets(element);
          if (!elementText.trim()) return;

          // Create array to track all matches
          const formulaMatches: Match[] = [];

          // Process each formula
          formulaSearches.forEach(({ formula, color }) => {
            try {
              const parsedFormula = parseFormula(formula);
              if (!parsedFormula) return;

              // Handle different formula types
              if (parsedFormula.type === "single") {
                // Handle single term matches (e.g., "(term1 OR term2)")
                const words = elementText.split(/\s+/);
                const matchesGroup = (word: string, group: RegExp[]) =>
                  group.some((regex) => regex.test(word));

                // Find all matches for this group
                words.forEach((word, index) => {
                  if (matchesGroup(word, parsedFormula.group)) {
                    // Find position of this word in the original text
                    let position = 0;
                    for (let i = 0; i < index; i++) {
                      position = elementText.indexOf(words[i], position) + words[i].length;
                      if (position === -1 + words[i].length) break;
                    }
                    
                    const wordPosition = elementText.indexOf(word, position);
                    if (wordPosition !== -1) {
                      formulaMatches.push({
                        term: formula,
                        index: wordPosition,
                        length: word.length,
                        color
                      });
                      
                      // Update match counts
                      const existingCount = matchCounts.find((m) => m.term === formula);
                      if (existingCount) {
                        existingCount.count++;
                      } else {
                        matchCounts.push({ term: formula, count: 1, color });
                      }
                    }
                  }
                });
              } else if (parsedFormula.type === "proximity") {
                // Handle proximity matches (e.g., "((term1) 5D (term2))")
                const words = elementText.split(/\s+/);
                
                // Find positions where group1 and group2 terms appear
                const group1Positions: number[] = [];
                const group2Positions: number[] = [];
                
                words.forEach((word, index) => {
                  if (parsedFormula.group1.some(regex => regex.test(word))) {
                    group1Positions.push(index);
                  }
                  if (parsedFormula.group2.some(regex => regex.test(word))) {
                    group2Positions.push(index);
                  }
                });
                
                // Find valid matches within distance
                group1Positions.forEach(pos1 => {
                  group2Positions.forEach(pos2 => {
                    if (Math.abs(pos1 - pos2) <= parsedFormula.distance) {
                      // Define match range
                      const startPos = Math.min(pos1, pos2);
                      const endPos = Math.max(pos1, pos2);
                      
                      // Calculate character positions
                      let startCharPos = 0;
                      for (let i = 0; i < startPos; i++) {
                        startCharPos = elementText.indexOf(words[i], startCharPos) + words[i].length;
                        if (startCharPos === -1 + words[i].length) break;
                      }
                      
                      let endCharPos = startCharPos;
                      for (let i = startPos; i <= endPos; i++) {
                        endCharPos = elementText.indexOf(words[i], endCharPos) + words[i].length;
                        if (endCharPos === -1 + words[i].length) break;
                      }
                      
                      // Add match
                      if (startCharPos < endCharPos) {
                        formulaMatches.push({
                          term: formula,
                          index: startCharPos,
                          length: endCharPos - startCharPos,
                          color
                        });
                        
                        // Update match counts
                        const existingCount = matchCounts.find((m) => m.term === formula);
                        if (existingCount) {
                          existingCount.count++;
                        } else {
                          matchCounts.push({ term: formula, count: 1, color });
                        }
                      }
                    }
                  });
                });
              }
            } catch (formulaError) {
              console.error(`Error processing formula "${formula}": ${formulaError instanceof Error ? formulaError.message : String(formulaError)}`);
            }
          });

          // Apply highlights if there are matches
          if (formulaMatches.length > 0) {
            try {
              // Sort matches by position
              formulaMatches.sort((a, b) => a.index - b.index);

              // Create temporary div to build highlighted content
              const tempDiv = document.createElement('div');
              let currentIndex = 0;

              // Build the highlighted content
              formulaMatches.forEach((match) => {
                // Add text before this match
                if (match.index > currentIndex) {
                  tempDiv.appendChild(
                    document.createTextNode(
                      elementText.substring(currentIndex, match.index)
                    )
                  );
                }

                // Add the highlighted span
                const span = document.createElement('span');
                span.className = 'highlight-term';
                span.style.backgroundColor = match.color;
                span.textContent = elementText.substring(
                  match.index,
                  match.index + match.length
                );
                tempDiv.appendChild(span);

                // Update current index
                currentIndex = match.index + match.length;
              });

              // Add any remaining text
              if (currentIndex < elementText.length) {
                tempDiv.appendChild(
                  document.createTextNode(elementText.substring(currentIndex))
                );
              }

              // Replace the element's content with the highlighted version
              element.innerHTML = '';
              Array.from(tempDiv.childNodes).forEach(node => {
                element.appendChild(node.cloneNode(true));
              });
            } catch (highlightError) {
              console.error(`Error applying formula highlights to element: ${highlightError instanceof Error ? highlightError.message : String(highlightError)}`);
            }
          }
        } catch (elementError) {
          console.error(`Error processing element for formula highlighting: ${elementError instanceof Error ? elementError.message : String(elementError)}`);
        }
      });

      // Update state once after processing all elements
      if (matchCounts.length > 0) {
        // Merge with existing matches instead of adding to the array
        setFoundMatches(prevMatches => {
          // Create a new array with merged results
          const mergedMatches = [...prevMatches];
          
          // Add new matches from this highlighting pass
          matchCounts.forEach(newMatch => {
            const existingMatch = mergedMatches.find(m => m.term === newMatch.term);
            if (existingMatch) {
              existingMatch.count += newMatch.count;
            } else {
              mergedMatches.push(newMatch);
            }
          });
          
          return mergedMatches;
        });
      }
    } catch (err) {
      console.error(`Error applying formula highlights: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Target selector: ${targetSelector}, Formula searches: ${formulaSearches.length}`);
    }
  }, [formulaSearches, targetSelector, parseFormula]);

  // Update useLayoutEffect to include formula highlights
  useLayoutEffect(() => {
    // Check if we need to highlight or clear
    const hasTerms = searchTerms.length > 0 || 
                     proximitySearches.length > 0 ||
                     formulaSearches.length > 0;
                     
    if (hasTerms) {
      // Only apply highlights if needed (performance optimization)
      if (needsHighlighting()) {
        const timeoutId = setTimeout(() => {
          applyHighlights();
          applyFormulaHighlights();
        }, 0);
  
        return () => clearTimeout(timeoutId);
      }
    } else if (foundMatches.length > 0) {
      // Clear highlights if we had terms before but not anymore
      clearHighlights();
    }

    // No cleanup needed if we didn't do anything
    return undefined;
  }, [
    searchTerms,
    proximitySearches,
    formulaSearches,
    targetSelector,
    highlightId,
    applyHighlights,
    applyFormulaHighlights,
    clearHighlights,
    needsHighlighting,
    foundMatches,
  ]);
  
  // Also fix the MutationObserver setup to avoid triggering too many updates
  useEffect(() => {
    // Only setup observer if we have terms to highlight
    if (searchTerms.length === 0 && proximitySearches.length === 0 && formulaSearches.length === 0) {
      return;
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    let skipNextUpdate = false;
    
    const handleDomChanges = () => {
      // Skip if we're already processing an update
      if (skipNextUpdate) {
        return;
      }
      
      // Debounce the updates to prevent multiple rapid changes
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        // Check if we actually need to reapply highlights
        if (needsHighlighting()) {
          console.log("DOM changed, reapplying highlights");
          
          // Set flag to skip next mutation (our highlight changes will trigger mutations)
          skipNextUpdate = true;
          
          // Increment the highlight ID to trigger a refresh
          setHighlightId((prev) => prev + 1);
          
          // Reset skip flag after a short delay
          setTimeout(() => {
            skipNextUpdate = false;
          }, 200);
        }
      }, 150); // Increased debounce timeout
    };

    // Create a mutation observer to detect when claims or description elements change
    const observer = new MutationObserver(handleDomChanges);

    // Get parent container that contains all highlightable sections
    const patentDetailsContainer = document.querySelector(".patent-details");
    
    if (patentDetailsContainer) {
      // Observe the entire patent details container for changes
      observer.observe(patentDetailsContainer, { 
        childList: true,      // Watch for added/removed nodes
        subtree: true,        // Watch all descendants
        characterData: true,  // Watch for text changes
        attributes: false     // Don't need to watch attributes
      });
      
      console.log("MutationObserver attached to patent details container");
    } else {
      // Fallback to observing individual sections
      const highlightableElements = document.querySelectorAll(targetSelector);
      highlightableElements.forEach(element => {
        observer.observe(element, { 
          childList: true, 
          subtree: true,
          characterData: true 
        });
      });
      
      console.log("MutationObserver attached to individual highlightable elements");
    }

    // Clean up observer and any pending timeouts
    return () => {
      observer.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [searchTerms, proximitySearches, formulaSearches, targetSelector, needsHighlighting]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const modal = document.querySelector('.patent-highlighter-modal');
      if (modal && !modal.contains(event.target as Node) && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Implement clearAllTerms function
  const clearAllTerms = () => {
    setSearchTerms([]);
    setProximitySearches([]);
    setFormulaSearches([]);
    setFoundMatches([]);
    clearHighlights();
  };

  // Toggle search type
  const toggleSearchType = (type: 'predefined' | 'proximity' | 'formula') => {
    setActiveSearchType(prev => prev === type ? null : type);
  };

  // If not in modal mode, render as before
  if (!isOpen) {
    return (
      <button 
        className="highlighter-settings-button"
        onClick={onClose}
        title="Open Patent Highlighter"
      >
        <FontAwesomeIcon icon={faCog} />
      </button>
    );
  }

  return (
    <div className="patent-highlighter-modal-overlay">
      <div className="patent-highlighter-modal">
        <div className="modal-header">
          <h3>
            <FontAwesomeIcon icon={faSearch} /> Patent Highlighter
          </h3>
          <button className="close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="modal-body">
          <div className="patent-highlighter">
            <div className="highlighter-content">
              <div className="search-input-container">
                <button
                  className="predefined-btn"
                  onClick={() => toggleSearchType('predefined')}
                  title="Use predefined term sets"
                >
                  <FontAwesomeIcon icon={faLayerGroup} />
                </button>
                <button
                  className="proximity-btn"
                  onClick={() => toggleSearchType('proximity')}
                  title="Create proximity search"
                >
                  <FontAwesomeIcon icon={faSlidersH} />
                </button>
                <button
                  className="formula-btn"
                  onClick={() => toggleSearchType('formula')}
                  title="Use formula search"
                >
                  <FontAwesomeIcon icon={faCode} />
                </button>
                <button onClick={clearAllTerms} className="clear-btn">
                  Clear All
                </button>
              </div>

              {activeSearchType === 'predefined' && (
                <div className="predefined-sets">
                  <h5>Predefined Term Sets:</h5>
                  <div className="sets-container">
                    {Object.entries(PREDEFINED_SETS).map(([key, set]) => (
                      <button
                        key={key}
                        className="set-button"
                        onClick={() => addPredefinedSet(key)}
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

              {activeSearchType === 'proximity' && (
                <div className="proximity-search">
                  <h5>
                    <FontAwesomeIcon icon={faSlidersH} /> Proximity Search:
                  </h5>
                  <p className="proximity-description">
                    Find and highlight text where multiple terms appear within a
                    specified word range of each other.
                  </p>

                  <div className="proximity-terms">
                    <h6>Add terms to search for:</h6>
                    <div className="proximity-input-row">
                      <input
                        type="text"
                        value={proximityFirstTerm}
                        onChange={(e) => setProximityFirstTerm(e.target.value)}
                        placeholder="Enter a term..."
                        ref={proximityFirstTermRef}
                        onKeyDown={(e) =>
                          e.key === "Enter" && addTermToProximitySearch()
                        }
                      />
                      <button onClick={addTermToProximitySearch}>
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>

                    {proximityTerms.length > 0 && (
                      <div className="proximity-terms-list">
                        {proximityTerms.map((term, index) => (
                          <div key={index} className="proximity-term-item">
                            <span>{term}</span>
                            <button onClick={() => removeProximityTerm(index)}>
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="proximity-distance">
                      <label>Maximum distance between terms (in words):</label>
                      <div className="distance-input">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={proximityDistance}
                          onChange={(e) =>
                            setProximityDistance(parseInt(e.target.value) || 5)
                          }
                        />
                      </div>
                    </div>

                    <button
                      className="create-proximity-btn"
                      onClick={createProximitySearch}
                      disabled={proximityTerms.length < 2}
                    >
                      Create Proximity Search
                    </button>
                  </div>
                </div>
              )}

              {activeSearchType === 'formula' && (
                <div className="formula-search">
                  <h5>
                    <FontAwesomeIcon icon={faCode} /> Formula Search:
                  </h5>
                  <p className="formula-description">
                    Enter a formula to search for terms. Examples:
                    <br />
                    • Single term: (panel)
                    <br />
                    • OR search: (panel or touch)
                    <br />
                    • Proximity search: ((panel) 5D (touch))
                    <br/>• Complex search: ((panel or touch) 5D (electric or
                    touchscreen))
                  </p>

                  <div className="formula-input">
                    <textarea
                      value={formulaInput}
                      onChange={(e) => setFormulaInput(e.target.value)}
                      placeholder="Enter your formula..."
                      rows={3}
                    ></textarea>
                    <button onClick={addFormulaSearch}>Add Formula</button>
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
                  <h5>
                    Found Matches: (
                    {foundMatches.reduce((sum, match) => sum + match.count, 0)} total)
                  </h5>
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
        </div>
      </div>
    </div>
  );
};

export default PatentHighlighter;
