import React, { useRef, useEffect } from "react";
import { ApiSource } from "./types";
import toast from "react-hot-toast";
import PatentFigureSearch from "./PatentFigureSearch";
import { patentApi } from "../../api/patents";
import "./PatentSearchForm.scss";
import { Button } from "../Common";

interface PatentSearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  patentIds: string[];
  setPatentIds: (ids: string[]) => void;
  isLoading: boolean;
  selectedApi: ApiSource;
  setSelectedApi: (api: ApiSource) => void;
  searchType: "full" | "smart";
  setSearchType: (type: "full" | "smart") => void;
  setShowSmartSearchModal: (show: boolean) => void;
  onSearch: (ids: string[]) => void;
  formatPatentId: (id: string, apiType: ApiSource) => string;
  selectedFilter?: "grant" | "application";
  setSelectedFilter?: (filter: "grant" | "application") => void;
  setIsLoading: (loading: boolean) => void;
}

const PatentSearchForm: React.FC<PatentSearchFormProps> = ({
  searchQuery,
  setSearchQuery,
  patentIds,
  setPatentIds,
  isLoading,
  selectedApi,
  searchType,
  setSearchType,
  setShowSmartSearchModal,
  onSearch,
  formatPatentId,
  setIsLoading,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);
  // Detect theme changes and update select element
  useEffect(() => {
    const isDarkTheme =
      document.documentElement.getAttribute("data-theme") === "dark";
    if (selectRef.current) {
      selectRef.current.setAttribute(
        "data-theme",
        isDarkTheme ? "dark" : "light"
      );
    }

    // Optional: Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";
          if (selectRef.current) {
            selectRef.current.setAttribute(
              "data-theme",
              isDark ? "dark" : "light"
            );
          }
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Process patent IDs using the same function as PatentSearch
    const processPatentIds = (input: string): string[] => {
      // First split by newlines
      const lines = input.split(/\n/);

      // Process each line - split by commas or spaces if present
      const processedIds = lines.flatMap((line) =>
        line
          .split(/[,\s]+/)
          .map((id) => id.trim())
          .filter((id) => id)
      );

      // Remove duplicates and empty strings
      return [...new Set(processedIds)].filter(Boolean);
    };

    const inputPatentIds = processPatentIds(value);
    if (inputPatentIds.length > 0) {
      setPatentIds(inputPatentIds);
    } else {
      setPatentIds([]);
    }
  };

  const handleSearchTypeChange = (type: "full" | "smart") => {
    setSearchType(type);
    // Clear the search query and patent IDs when switching search types
    setSearchQuery("");
    setPatentIds([]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter a patent ID");
      return;
    }

    // For patentIds list (multiple IDs detected) or single unified patent
    const idsToSearch = patentIds.length > 0 ? patentIds : [searchQuery];

    // Format the patent IDs
    const formattedIds = idsToSearch.map((id) =>
      formatPatentId(id, selectedApi)
    );

    // If smart search is selected, transform IDs and search
    if (searchType === "smart" && selectedApi === "unified") {
      try {
        // Show loader before starting API calls
        setIsLoading(true);

        // First transform the patent IDs
        const transformedResponse = await patentApi.transformPatentIds(
          formattedIds
        );

        if (Array.isArray(transformedResponse)) {
          // Show the modal after successful transformation
          setShowSmartSearchModal(true);
          // Search with transformed IDs
          await patentApi.searchMultiplePatentsUnified(
            transformedResponse
            // "smart"
          );
          // Call onSearch with the transformed IDs
          onSearch(transformedResponse);

          // Don't hide loader here - it will be hidden when results are received in the modal
        } else {
          toast.error("Failed to transform patent IDs");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in smart search:", error);
        toast.error("Smart search failed. Please try again.");
        setIsLoading(false);
      }
      return;
    }

    // For direct search, just call onSearch
    onSearch(formattedIds);
  };

  return (
    <form onSubmit={handleSearch} className="search-form">
      <div className="search-controls">
        <div className="api-select-container">
          <div className="search-type-selector">
            <label>
              <input
                type="radio"
                name="searchType"
                checked={searchType === "full"}
                onChange={() => handleSearchTypeChange("full")}
              />
              Full Search
            </label>
            <label>
              <input
                type="radio"
                name="searchType"
                checked={searchType === "smart"}
                onChange={() => handleSearchTypeChange("smart")}
              />
              Smart Search
            </label>
          </div>
        </div>
        <div className="input-buttons-container">
          <div className="input-field-container">
            <textarea
              value={searchQuery}
              onChange={handleInputChange}
              placeholder={
                searchType === "full"
                  ? "Enter patent numbers (separated by commas, spaces, or new lines)"
                  : "Enter keywords, inventor name, assignee, or other search terms"
              }
              className="search-input patent-textarea"
              rows={5}
            />

            {searchType === "smart" && (
              <small className="helper-text">
                Smart search enables you to find patents using keywords,
                inventors, assignees, and more.
              </small>
            )}
          </div>
          <div className="buttons-column">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading || !searchQuery.trim()}
              loading={isLoading}
              className="search-button"
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
            {searchType === "full" && (
              <div className="figures-button-container">
                <PatentFigureSearch patentIds={patentIds} />
              </div>
            )}
          </div>
        </div>
      </div>
      {searchType === "full" && patentIds.length > 0 && (
        <small className="helper-text">
          {patentIds.length} patent ID{patentIds.length > 1 ? "s" : ""}{" "}
          detected. Click Search to view results or use the View Figures button
          below.
        </small>
      )}
    </form>
  );
};

export default PatentSearchForm;
