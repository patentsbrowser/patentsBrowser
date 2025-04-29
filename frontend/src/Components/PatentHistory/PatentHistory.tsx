import React, { useState, useEffect, useRef } from 'react';
import { authApi } from '../../api/auth';
import './PatentHistory.scss';
import Loader from '../Common/Loader';

interface PatentHistoryItem {
  patentId: string;
  timestamp: number;
  source?: string;
}

interface GroupedPatents {
  [date: string]: PatentHistoryItem[][];
}

const PatentHistory: React.FC = () => {
  const [searchHistory, setSearchHistory] = useState<PatentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const apiCallInProgress = useRef(false);
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    fetchSearchHistory();
    
    // Set up an interval to refresh the data every minute
    const intervalId = setInterval(() => {
      fetchSearchHistory();
    }, 60000);
    
    // Listen for patent-searched events
    const handlePatentSearched = () => {
      fetchSearchHistory();
    };
    
    // Add event listener
    window.addEventListener('patent-searched', handlePatentSearched);
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('patent-searched', handlePatentSearched);
    };
  }, []);

  const fetchSearchHistory = async () => {
    if (apiCallInProgress.current) return;
    
    try {
      apiCallInProgress.current = true;
      setIsLoading(true);
      const response = await authApi.getSearchHistory();
      setSearchHistory(response.data?.results || []);
      lastUpdateTime.current = Date.now();
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    } finally {
      setIsLoading(false);
      apiCallInProgress.current = false;
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

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prevDates => 
      prevDates.includes(date)
        ? prevDates.filter(d => d !== date)
        : [...prevDates, date]
    );
  };

  // Group patents by date and search session
  const groupPatentsByDate = (): GroupedPatents => {
    const grouped: GroupedPatents = {};
    
    // Sort search history by timestamp
    const sortedHistory = [...searchHistory].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedHistory.forEach(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      
      // Check if this patent was searched within 5 seconds of the previous one
      const lastGroup = grouped[date][grouped[date].length - 1];
      if (lastGroup && 
          Math.abs(lastGroup[0].timestamp - item.timestamp) < 5000 && 
          lastGroup[0].source === item.source) {
        // Add to existing group
        lastGroup.push(item);
      } else {
        // Create new group
        grouped[date].push([item]);
      }
    });
    
    return grouped;
  };

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupPatentsByDate()).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="patent-history-container">
      <div className="patent-history-header">
        <h2>Patent Search History</h2>
        {searchHistory?.length > 0 && (
          <button onClick={clearSearchHistory} className="clear-button">
            Delete All History
          </button>
        )}
      </div>

      {isLoading ? (
        <Loader fullScreen={true} text="Loading search history..." />
      ) : searchHistory.length === 0 ? (
        <div className="empty-message">No search history available.</div>
      ) : (
        <div className="history-list">
          {sortedDates?.map(date => {
            const patentGroups = groupPatentsByDate()[date];
            const isExpanded = expandedDates.includes(date);
            
            return (
              <div key={date} className="date-group">
                <div 
                  className="date-header" 
                  onClick={() => toggleDateExpansion(date)}
                >
                  <span className="date-label">{date}</span>
                  <span className="patent-count">
                    ({patentGroups?.reduce((sum, group) => sum + group.length, 0)} patent{patentGroups.reduce((sum, group) => sum + group.length, 0) !== 1 ? 's' : ''})
                  </span>
                  <span className="expansion-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="patent-items">
                    {patentGroups?.map((group, groupIndex) => (
                      <div key={`group-${groupIndex}`} className="patent-group">
                        {group.length > 1 ? (
                          <div className="group-header">
                            <span className="group-count">{group.length} patents</span>
                            {group[0].source && (
                              <span className="source-tag">{group[0].source}</span>
                            )}
                            <span className="timestamp">
                              {new Date(group[0].timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ) : null}
                        <div className="patent-items-in-group">
                          {group?.map((item, index) => (
                            <div 
                              key={`${item.patentId}-${index}`}
                              className="patent-item"
                            >
                              <span className="patent-id">{item.patentId}</span>
                              {group.length === 1 && (
                                <>
                                  <span className="timestamp">
                                    {new Date(item.timestamp).toLocaleTimeString()}
                                  </span>
                                  {item.source && (
                                    <span className="source-tag">{item.source}</span>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
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