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
}) => {
  const [searchTerms, setSearchTerms] = useState<TermColor[]>([]);
  const [proximitySearches, setProximitySearches] = useState<ProximityTerm[]>(
    []
  );
  const [formulaSearches, setFormulaSearches] = useState<
    { formula: string; color: string }[]
  >([]);
  const [inputTerm, setInputTerm] = useState("");
  const [showPredefinedSets, setShowPredefinedSets] = useState(false);
  const [showProximitySearch, setShowProximitySearch] = useState(false);
  const [showFormulaSearch, setShowFormulaSearch] = useState(false);
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
  const addSearchTerm = () => {
    if (!inputTerm.trim()) return;

    // Add the term with a color
    const newTerm: TermColor = {
      term: inputTerm.trim(),
      color: colorOptions[searchTerms.length % colorOptions.length],
    };

    setSearchTerms((prevTerms) => [...prevTerms, newTerm]);
    setInputTerm("");

    // Focus input for next term
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

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
    setShowPredefinedSets(false);
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
      element.closest(".claims-header") ||
      element.closest(".description-header")
    );
  };

  // Wrap clearHighlights in useCallback
  const clearHighlights = useCallback(() => {
    try {
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

        // Collect the original text content
        let originalText = "";
        element.childNodes.forEach((node) => {
          originalText += node.textContent || "";
        });

        // Safely reset the element content
        if (originalText) {
          element.textContent = originalText;
        }
      });

      setFoundMatches([]);
    } catch (err) {
      console.error("Error clearing highlights:", err);
    }
  }, [targetSelector]);

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
    clearHighlights();

    // Don't proceed if there are no search terms and no proximity searches
    if (searchTerms.length === 0 && proximitySearches.length === 0) {
      return;
    }

    try {
      // Get all elements matching the selector
      const elements = document.querySelectorAll(targetSelector);
      console.log("Elements to highlight:", elements.length);

      // Counter for matches
      const matchCounts: { term: string; count: number; color: string }[] = [];

      // Process each element
      elements.forEach((element) => {
        // Skip elements that are not safe to modify
        if (!isSafeToModify(element)) {
          console.log("Skipping unsafe element");
          return;
        }

        // Get the element's text content
        const originalText = element.textContent || "";
        if (!originalText.trim()) {
          console.log("Skipping empty element");
          return; // Skip empty elements
        }

        console.log(
          "Processing element text:",
          originalText.substring(0, 50) + "..."
        );

        // Create a document fragment to build the highlighted content
        const fragment = document.createDocumentFragment();

        // Track all matches (either simple term or proximity matches)
        type Match = {
          term: string;
          index: number;
          length: number;
          color: string;
        };
        const allMatches: Match[] = [];

        // Find all matches for all terms
        searchTerms.forEach(({ term, color }) => {
          if (!term.trim()) return;

          try {
            const regex = new RegExp(term, "gi");
            let match;

            while ((match = regex.exec(originalText)) !== null) {
              allMatches.push({
                term,
                index: match.index,
                length: match[0].length,
                color,
              });

              // Update match counts
              const existingCount = matchCounts.find((m) => m.term === term);
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

        // Process proximity searches
        proximitySearches.forEach((proximitySearch) => {
          // Create a display term for the proximity search
          const displayTerm =
            proximitySearch.terms.join(" + ") +
            ` (within ${proximitySearch.distance} words)`;

          try {
            console.log("Processing proximity search:", displayTerm);

            // Find all proximity matches for this search
            const matches = findProximityMatches(originalText, proximitySearch);
            console.log("Found proximity matches:", matches.length);

            // Add each match to the allMatches array
            matches.forEach(({ start, end }) => {
              allMatches.push({
                term: displayTerm,
                index: start,
                length: end - start,
                color: proximitySearch.color,
              });

              // Update match counts
              const existingCount = matchCounts.find(
                (m) => m.term === displayTerm
              );
              if (existingCount) {
                existingCount.count++;
              } else {
                matchCounts.push({
                  term: displayTerm,
                  count: 1,
                  color: proximitySearch.color,
                });
              }
            });
          } catch (err) {
            console.error(
              `Error processing proximity search '${displayTerm}':`,
              err
            );
          }
        });

        // If no matches found, leave the element as is
        if (allMatches.length === 0) {
          console.log("No matches found in this element");
          return;
        }

        // Sort matches by their position in the text
        allMatches.sort((a, b) => a.index - b.index);
        console.log("All matches:", allMatches);

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
          const span = document.createElement("span");
          span.className = "highlight-term";
          span.style.backgroundColor = match.color;
          span.textContent = originalText.slice(
            match.index,
            match.index + match.length
          );
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
          console.error("Error modifying DOM:", err);
          // If we can't modify the DOM, just reset to original
          element.textContent = originalText;
        }
      });

      // Update match counts in state
      setFoundMatches(matchCounts);
    } catch (err) {
      console.error("Error applying highlights:", err);
    }
  }, [searchTerms, proximitySearches, targetSelector, clearHighlights]);

  // Apply formula highlights
  const applyFormulaHighlights = useCallback(() => {
    if (formulaSearches.length === 0) {
      console.log("No formula searches to apply");
      return;
    }

    console.log("Applying formula highlights:", formulaSearches);

    try {
      const elements = document.querySelectorAll(targetSelector);
      const matchCounts: { term: string; count: number; color: string }[] = [];

      elements.forEach((element) => {
        if (!isSafeToModify(element)) return;

        const originalText = element.textContent || "";
        if (!originalText.trim()) return;

        console.log(
          "Processing element for formula highlights:",
          originalText.substring(0, 50) + "..."
        );

        const words = originalText.split(/\s+/);
        const cleaned = words.map((w) => w.toLowerCase().replace(/[^\w]/g, ""));
        const offsets: Offset[] = [];

        let cursor = 0;
        for (let word of words) {
          offsets.push({ word, start: cursor });
          cursor += word.length + 1;
        }

        formulaSearches.forEach(({ formula, color }) => {
          const config = parseFormula(formula);
          if (!config) {
            console.log("Invalid formula config:", formula);
            return;
          }

          console.log("Processing formula:", formula, "with config:", config);

          const matchesGroup = (word: string, group: RegExp[]) =>
            group.some((regex) => regex.test(word));

          let matchedIndexes: number[] = [];

          if (
            config.type === "proximity" &&
            config.group1 &&
            config.group2 &&
            config.distance
          ) {
            console.log("Processing proximity search");
            for (let i = 0; i < cleaned.length; i++) {
              const w1 = cleaned[i];
              const isA = matchesGroup(w1, config.group1);
              const isB = matchesGroup(w1, config.group2);

              if (isA) {
                for (
                  let j = i + 1;
                  j <= i + config.distance + 1 && j < cleaned.length;
                  j++
                ) {
                  if (matchesGroup(cleaned[j], config.group2)) {
                    matchedIndexes.push(i, j);
                  }
                }
              } else if (isB) {
                for (
                  let j = i + 1;
                  j <= i + config.distance + 1 && j < cleaned.length;
                  j++
                ) {
                  if (matchesGroup(cleaned[j], config.group1)) {
                    matchedIndexes.push(i, j);
                  }
                }
              }
            }
          } else if (config.type === "single" && config.group) {
            console.log("Processing single term search");
            for (let i = 0; i < cleaned.length; i++) {
              if (matchesGroup(cleaned[i], config.group)) {
                matchedIndexes.push(i);
              }
            }
          }

          console.log("Found matches for formula:", formula, matchedIndexes);

          if (matchedIndexes.length > 0) {
            [...new Set(matchedIndexes)]
              .sort((a, b) => b - a)
              .forEach((i) => {
                const start = offsets[i].start;
                const end = start + offsets[i].word.length;
                const range = document.createRange();
                range.setStart(element.firstChild!, start);
                range.setEnd(element.firstChild!, end);
                const span = document.createElement("span");
                span.className = "highlight-term";
                span.style.backgroundColor = color;
                span.appendChild(range.extractContents());
                range.insertNode(span);

                // Update match counts
                const existingCount = matchCounts.find(
                  (m) => m.term === formula
                );
                if (existingCount) {
                  existingCount.count++;
                } else {
                  matchCounts.push({ term: formula, count: 1, color });
                }
              });
          }
        });
      });

      setFoundMatches((prev) => [...prev, ...matchCounts]);
    } catch (err) {
      console.error("Error applying formula highlights:", err);
    }
  }, [formulaSearches, targetSelector]);

  // Update useLayoutEffect to include formula highlights
  useLayoutEffect(() => {
    if (
      searchTerms.length > 0 ||
      proximitySearches.length > 0 ||
      formulaSearches.length > 0
    ) {
      const timeoutId = setTimeout(() => {
        applyHighlights();
        applyFormulaHighlights();
      }, 0);

      return () => clearTimeout(timeoutId);
    } else {
      clearHighlights();
    }

    return () => {
      clearHighlights();
    };
  }, [
    searchTerms,
    proximitySearches,
    formulaSearches,
    targetSelector,
    highlightId,
    applyHighlights,
    applyFormulaHighlights,
    clearHighlights,
  ]);

  // Reapply highlights when DOM changes (expansion/collapse)
  useEffect(() => {
    const handleDomChanges = () => {
      if (searchTerms.length > 0 || proximitySearches.length > 0) {
        // Increment the highlight ID to trigger a refresh
        setHighlightId((prev) => prev + 1);
      }
    };

    // Create a mutation observer to detect when claims or description is expanded
    const observer = new MutationObserver(handleDomChanges);

    // Elements to observe - claims and description content
    const claimsContent = document.querySelector(".claims-content");
    const descriptionContent = document.querySelector(".description-content");

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
  }, [searchTerms, proximitySearches]);

  // Implement clearAllTerms function
  const clearAllTerms = () => {
    setSearchTerms([]);
    setProximitySearches([]);
    setFormulaSearches([]);
    setFoundMatches([]);
    clearHighlights();
  };

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
            onKeyDown={(e) => e.key === "Enter" && addSearchTerm()}
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
          <button
            className="proximity-btn"
            onClick={() => setShowProximitySearch(!showProximitySearch)}
            title="Create proximity search"
          >
            <FontAwesomeIcon icon={faSlidersH} />
          </button>
          <button
            className="formula-btn"
            onClick={() => setShowFormulaSearch(!showFormulaSearch)}
            title="Use formula search"
          >
            <FontAwesomeIcon icon={faCode} />
          </button>
          <button onClick={clearAllTerms} className="clear-btn">
            Clear All
          </button>
        </div>

        {showPredefinedSets && (
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

        {/* Proximity Search UI */}
        {showProximitySearch && (
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

        {/* Display active proximity searches */}
        {proximitySearches.length > 0 && (
          <div className="proximity-searches-list">
            <h5>Proximity Searches: ({proximitySearches.length})</h5>
            <div className="searches-container">
              {proximitySearches.map((search, index) => (
                <div
                  key={index}
                  className="proximity-search-badge"
                  style={{ backgroundColor: search.color }}
                >
                  <span>
                    {search.terms.join(" + ")} (within {search.distance} words)
                  </span>
                  <button onClick={() => removeProximitySearch(index)}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formula Search UI */}
        {showFormulaSearch && (
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
              <br />• Complex search: ((panel or touch) 5D (electric or
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

        {/* Display active formula searches */}
        {formulaSearches.length > 0 && (
          <div className="formula-searches-list">
            <h5>Formula Searches: ({formulaSearches.length})</h5>
            <div className="searches-container">
              {formulaSearches.map((search, index) => (
                <div
                  key={index}
                  className="formula-search-badge"
                  style={{ backgroundColor: search.color }}
                >
                  <span>{search.formula}</span>
                  <button onClick={() => removeFormulaSearch(index)}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ))}
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
  );
};

export default PatentHighlighter;
