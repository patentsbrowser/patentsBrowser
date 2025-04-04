import React from 'react';
import './DashboardSidebar.scss';

interface RecentSearch {
  patentId: string;
  timestamp: number;
  folderName?: string; // Optional folder name when patent is from a folder
}

interface RecentPatentIdsProps {
  recentSearches: RecentSearch[];
  onClearHistory: () => void;
  onPatentClick: (patentId: string) => void;
}

const RecentPatentIds: React.FC<RecentPatentIdsProps> = ({
  recentSearches,
  onClearHistory,
  onPatentClick,
}) => {
  return (
    <div className="recent-patent-ids-section">
      <div className="section-header">
        <h3>Recent Patent IDs</h3>
        {recentSearches?.length > 0 && (
          <button className="clear-history" onClick={onClearHistory}>
            Clear Recent IDs
          </button>
        )}
      </div>
      <div className="recent-searches">
        {recentSearches.length > 0 ? (
          recentSearches.map((search) => (
            <div
              key={search.timestamp}
              className={`recent-search-item ${search.folderName ? 'from-folder' : ''}`}
              onClick={() => onPatentClick(search.patentId)}
            >
              {/* <span className="patent-id">{search.patentId}</span> */}
              {search.folderName && (
                <span className="folder-origin">
                  <span className="folder-icon">📁</span>
                  {search.folderName}
                </span>
              )}
              <span className="search-time">
                {new Date(search.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        ) : (
          <div className="no-searches">No patent IDs added</div>
        )}
      </div>
    </div>
  );
};

export default RecentPatentIds; 