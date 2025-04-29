import { useState, useEffect } from 'react';
import './Dashboard.scss';
import PatentSearch from '../Patents/PatentSearch';
import ClearHistoryModal from './ClearHistoryModal';
import ManageFoldersModal from './ManageFoldersModal';
import DashboardSidebar from './DashboardSidebar/DashboardSidebar';
import { authApi } from '../../api/auth';

interface PatentFolder {
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
}

interface RecentSearch {
  patentId: string;
  timestamp: number;
  folderName?: string;
}

const STORAGE_KEYS = {
  PATENT_FOLDERS: 'patent_folders',
  RECENT_SEARCHES: 'recent_searches',
  SIDEBAR_BEHAVIOR: 'sidebarBehavior',
  SIDEBAR_EXPANDED: 'sidebarExpanded'
};

const Dashboard = () => {
  // Initialize state from localStorage
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    return saved ? JSON.parse(saved) : [];
  });

  const [patentFolders, setPatentFolders] = useState<PatentFolder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PATENT_FOLDERS);
    return saved ? JSON.parse(saved) : [];
  });

  // Get sidebar behavior preference from localStorage
  const [sidebarBehavior, setSidebarBehavior] = useState<'auto' | 'manual'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_BEHAVIOR);
    return (saved === 'auto' || saved === 'manual') ? saved : 'auto';
  });

  const [showClearModal, setShowClearModal] = useState(false);
  const [showFoldersModal, setShowFoldersModal] = useState(false);

  // Add this state to store the currently selected patent ID
  const [currentPatentId, setCurrentPatentId] = useState<string>("");
  
  // Track sidebar expanded state
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_EXPANDED);
    return saved ? JSON.parse(saved) : false;
  });

  // Track the selected folder for current patent IDs
  const [currentFolderInfo, setCurrentFolderInfo] = useState<{folderName: string, patentIds: string[]} | null>(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PATENT_FOLDERS, JSON.stringify(patentFolders));
  }, [patentFolders]);

  // Listen for changes to sidebar behavior from Settings component
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SIDEBAR_BEHAVIOR && e.newValue) {
        if (e.newValue === 'auto' || e.newValue === 'manual') {
          setSidebarBehavior(e.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Add this to provide the populate callback with folder support
  useEffect(() => {
    // Update the callback for regular patent IDs
    window.patentSearchPopulateCallback = (patentId: string) => {
      if (patentId) {
        setCurrentPatentId(patentId);
        setCurrentFolderInfo(null); // Reset folder info when populating without folder
      }
    };
    
    // Add the new callback for patents with folder information
    window.patentSearchPopulateWithFolderCallback = (patentIds: string, folderName: string) => {
      if (patentIds) {
        // Store the folder information for the search
        setCurrentFolderInfo({
          folderName,
          patentIds: patentIds.split(',').map(id => id.trim())
        });
        
        // Call our handler to populate the search field but not add to recent searches
        handleSidebarPatentsWithFolderClick(patentIds, folderName);
      }
    };
    
    return () => {
      window.patentSearchPopulateCallback = undefined;
      window.patentSearchPopulateWithFolderCallback = undefined;
    };
  }, []);

  // Save sidebar expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_EXPANDED, JSON.stringify(sidebarExpanded));
  }, [sidebarExpanded]);

  const handlePatentSearch = (patentIds: string[]) => {
    // Create a new folder for the batch of patent IDs
    const newFolder: PatentFolder = {
      id: Date.now().toString(),
      name: `Patent Search ${new Date().toLocaleString()}`,
      patentIds,
      timestamp: Date.now()
    };

    // Add to folders list
    setPatentFolders(prev => [newFolder, ...prev]);

    // Update recent searches with the searched patent IDs
    if (patentIds.length > 0) {
      // Add each patent ID to recent searches, avoiding duplicates
      const now = Date.now();
      const newRecentSearches = [...recentSearches];
      
      patentIds.forEach((patentId, index) => {
        // Check if the patent ID already exists in recent searches
        const existingIndex = newRecentSearches.findIndex(search => search.patentId === patentId);
        
        // If it exists, remove it so we can add it at the top
        if (existingIndex !== -1) {
          newRecentSearches.splice(existingIndex, 1);
        }
        
        // Check if this patent ID is from a folder (exists in currentFolderInfo)
        const isFromFolder = currentFolderInfo && currentFolderInfo.patentIds.includes(patentId);
        
        // Add the patent ID to the beginning of the array
        // Add folder info if it came from a folder
        newRecentSearches.unshift({
          patentId,
          timestamp: now - index,
          folderName: isFromFolder ? currentFolderInfo.folderName : undefined
        });
      });
      
      // Keep only the most recent 10 searches
      setRecentSearches(newRecentSearches.slice(0, 10));
      
      // Reset folder info after adding to recent searches
      setCurrentFolderInfo(null);
    }
  };

  const handleSidebarPatentClick = (patentId: string) => {
    // Set the current patent ID but don't add to recent searches
    // Patents will only be added to recent searches when the user clicks the search button
    setCurrentPatentId(patentId);
    
    // Populate the search field
    if (window.patentSearchPopulateCallback) {
      window.patentSearchPopulateCallback(patentId);
    }
  };

  // New handler for patents with folder information
  const handleSidebarPatentWithFolderClick = (patentId: string, folderName: string) => {
    // Set the current patent ID but don't add to recent searches
    // Patents will only be added to recent searches when the user clicks the search button
    setCurrentPatentId(patentId);
    
    // Populate the search field
    if (window.patentSearchPopulateCallback) {
      window.patentSearchPopulateCallback(patentId);
    }
  };

  // Support batch patents from folder
  const handleSidebarPatentsWithFolderClick = (patentIds: string, folderName: string) => {
    // Split the comma-separated patent IDs
    const patentIdArray = patentIds.split(',').map(id => id.trim());
    
    // Set the first patent ID as current but DON'T add to recent searches
    // Patents will only be added to recent searches when the user clicks the search button
    if (patentIdArray.length > 0) {
      setCurrentPatentId(patentIdArray[0]);
    }
    
    // Populate the search field
    if (window.patentSearchPopulateCallback) {
      window.patentSearchPopulateCallback(patentIds);
    }
  };

  const handleAddCustomFolder = async (name: string, patentIds: string[]) => {
    try {
      // Call the API to save custom patent list with source='folderName'
      await authApi.saveCustomPatentList(name, patentIds, 'folderName');
      
      // No need to update local state as the sidebar will fetch lists from API
      
      return true;
    } catch (error) {
      console.error('Error adding custom folder:', error);
      return false;
    }
  };

  const handleSidebarExpand = (expanded: boolean) => {
    setSidebarExpanded(expanded);
  };

  const handleClearHistory = (selectedIds: string[]) => {
    setRecentSearches(prev => 
      prev.filter(search => !selectedIds.includes(search.patentId))
    );
  };

  const handleDeleteFolders = (folderIds: string[]) => {
    setPatentFolders(prev => prev.filter(folder => !folderIds.includes(folder.id)));
  };

  const handleRemovePatents = (folderId: string, patentIds: string[]) => {
    setPatentFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          patentIds: folder.patentIds.filter(id => !patentIds.includes(id))
        };
      }
      return folder;
    }));
  };

  return (
    <div className="dashboard">
      <DashboardSidebar
        recentSearches={recentSearches}
        patentFolders={patentFolders}
        onClearHistory={() => setShowClearModal(true)}
        onManageFolders={() => setShowFoldersModal(true)}
        onPatentClick={handleSidebarPatentClick}
        onPatentWithFolderClick={handleSidebarPatentWithFolderClick}
        onExpandChange={handleSidebarExpand}
        onAddCustomFolder={handleAddCustomFolder}
        sidebarBehavior={sidebarBehavior}
      />
      <div className={`dashboard-content ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="dashboard-section">
          <PatentSearch 
            onSearch={handlePatentSearch}
            initialPatentId={currentPatentId} 
          />
        </div>
      </div>

      {showClearModal && (
        <ClearHistoryModal
          recentSearches={recentSearches}
          onClose={() => setShowClearModal(false)}
          onClear={handleClearHistory}
        />
      )}

      {showFoldersModal && (
        <ManageFoldersModal
          folders={patentFolders}
          onClose={() => setShowFoldersModal(false)}
          onDeleteFolders={handleDeleteFolders}
          onRemovePatents={handleRemovePatents}
        />
      )}
    </div>
  );
};

// Update the global type declaration
declare global {
  interface Window {
    patentSearchCallback?: (patentId: string) => void;
    patentSearchPopulateCallback?: (patentId: string) => void;
    patentSearchPopulateWithFolderCallback?: (patentIds: string, folderName: string) => void;
  }
}

export default Dashboard;
