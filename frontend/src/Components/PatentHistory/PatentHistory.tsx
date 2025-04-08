import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/auth';
import './PatentHistory.scss';

interface PatentHistoryItem {
  patentId: string;
  timestamp: number;
  source?: string;
}

interface GroupedPatents {
  [date: string]: PatentHistoryItem[];
}

const PatentHistory: React.FC = () => {
  const [searchHistory, setSearchHistory] = useState<PatentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getSearchHistory();
      setSearchHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearchHistory = async () => {
    try {
      await authApi.clearSearchHistory();
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const handlePatentClick = (patentId: string) => {
    // Navigate to patent search page with this ID
    window.location.href = `/auth/patents?id=${patentId}`;
  };

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prevDates => 
      prevDates.includes(date)
        ? prevDates.filter(d => d !== date)
        : [...prevDates, date]
    );
  };

  // Group patents by date
  const groupPatentsByDate = (): GroupedPatents => {
    const grouped: GroupedPatents = {};
    
    searchHistory.forEach(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      
      grouped[date].push(item);
    });
    
    return grouped;
  };

  // Filter patents based on search query
  const filteredGroupedPatents = (): GroupedPatents => {
    if (!searchQuery.trim()) {
      return groupPatentsByDate();
    }
    
    const grouped: GroupedPatents = {};
    const query = searchQuery.toLowerCase();
    
    searchHistory.forEach(item => {
      if (item.patentId.toLowerCase().includes(query)) {
        const date = new Date(item.timestamp).toLocaleDateString();
        
        if (!grouped[date]) {
          grouped[date] = [];
        }
        
        grouped[date].push(item);
      }
    });
    
    return grouped;
  };

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(filteredGroupedPatents()).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="patent-history-container">
      <div className="patent-history-header">
        <h2>Patent Search History</h2>
        {searchHistory.length > 0 && (
          <button onClick={clearSearchHistory} className="clear-button">
            Clear History
          </button>
        )}
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search patents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="patent-search-input"
        />
      </div>

      {isLoading ? (
        <div className="loading-message">Loading search history...</div>
      ) : searchHistory.length === 0 ? (
        <div className="empty-message">No search history available.</div>
      ) : (
        <div className="history-list">
          {sortedDates.map(date => {
            const patents = filteredGroupedPatents()[date];
            const isExpanded = expandedDates.includes(date);
            
            return (
              <div key={date} className="date-group">
                <div 
                  className="date-header" 
                  onClick={() => toggleDateExpansion(date)}
                >
                  <span className="date-label">{date}</span>
                  <span className="patent-count">
                    ({patents.length} patent{patents.length !== 1 ? 's' : ''})
                  </span>
                  <span className="expansion-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="patent-items">
                    {patents.map((item, index) => (
                      <div 
                        key={`${item.patentId}-${index}`}
                        className="patent-item"
                        onClick={() => handlePatentClick(item.patentId)}
                      >
                        <span className="patent-id">{item.patentId}</span>
                        <span className="timestamp">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                        {item.source && (
                          <span className="source-tag">{item.source}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatentHistory; 