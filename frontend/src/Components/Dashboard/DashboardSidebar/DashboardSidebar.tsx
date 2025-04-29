import { useState, useEffect } from "react";
import { authApi } from "../../../api/auth";
import "./DashboardSidebar.scss";
import ImportedFolders from "./ImportedFolders";
import { Link } from "react-router-dom";

interface PatentFolder {
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
}

interface RecentSearch {
  patentId: string;
  timestamp: number;
}

interface WorkFile {
  _id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  isCombined?: boolean;
}

interface CustomPatentList {
  _id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  workFiles: WorkFile[];
  createdAt: string;
  source: string;
  userId: string;
  __v: number;
}

interface DashboardSidebarProps {
  recentSearches: RecentSearch[];
  patentFolders: PatentFolder[];
  onClearHistory: () => void;
  onManageFolders: () => void;
  onPatentClick: (patentId: string) => void;
  onPatentWithFolderClick?: (patentId: string, folderName: string) => void;
  onExpandChange?: (expanded: boolean) => void;
  onAddCustomFolder?: (name: string, patentIds: string[]) => void;
  sidebarBehavior?: 'auto' | 'manual';
}

const DashboardSidebar = ({
  recentSearches,
  patentFolders,
  onClearHistory,
  onManageFolders,
  onPatentClick,
  onPatentWithFolderClick,
  onExpandChange,
  onAddCustomFolder,
  sidebarBehavior = 'auto',
}: DashboardSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved ? JSON.parse(saved) : false;
  });
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved ? JSON.parse(saved) : false;
  });
  const [customPatentLists, setCustomPatentLists] = useState<CustomPatentList[]>([]);
  const [importedLists, setImportedLists] = useState<CustomPatentList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedLists, setHasLoadedLists] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle mouse enter based on sidebar behavior
  const handleMouseEnter = () => {
    if (sidebarBehavior === 'auto') {
      setIsExpanded(true);
      if (onExpandChange) {
        onExpandChange(true);
      }
      // Fetch lists when sidebar expands and hasn't loaded yet
      if (!hasLoadedLists) {
        fetchCustomPatentLists();
      }
    }
  };

  // Handle mouse leave based on sidebar behavior, pin state, and modal state
  const handleMouseLeave = () => {
    // Don't close sidebar if a modal is open
    if (isModalOpen) {
      return;
    }
    
    if (sidebarBehavior === 'auto' || (sidebarBehavior === 'manual' && !isPinned)) {
      setIsExpanded(false);
      if (onExpandChange) {
        onExpandChange(false);
      }
    }
  };

  // Handle toggle pin for manual mode
  const handleTogglePin = () => {
    if (sidebarBehavior === 'manual') {
      const newPinnedState = !isPinned;
      setIsPinned(newPinnedState);
      setIsExpanded(newPinnedState);
      localStorage.setItem('sidebarPinned', JSON.stringify(newPinnedState));
      
      if (onExpandChange) {
        onExpandChange(newPinnedState);
      }
      
      // When pinning, ensure the data is loaded
      if (newPinnedState && !hasLoadedLists) {
        fetchCustomPatentLists();
      }
    }
  };

  // Handle click on the collapsed sidebar in manual mode
  const handleSidebarClick = () => {
    if (sidebarBehavior === 'manual' && !isExpanded) {
      setIsExpanded(true);
      localStorage.setItem('sidebarExpanded', JSON.stringify(true));
      if (onExpandChange) {
        onExpandChange(true);
      }
      // Fetch lists when sidebar expands and hasn't loaded yet
      if (!hasLoadedLists) {
        fetchCustomPatentLists();
      }
    }
  };

  // For any update actions that need to refresh the lists (like adding a new folder)
  const refreshCustomPatentLists = async () => {
    await fetchCustomPatentLists();
  };

  // Don't fetch on component mount, only when expanded
  useEffect(() => {
    if (isExpanded && !hasLoadedLists) {
      fetchCustomPatentLists();
    }
  }, [isExpanded, hasLoadedLists]);

  // Add event listener for refreshing custom folders
  useEffect(() => {
    const handleRefreshCustomFolders = () => {
      fetchCustomPatentLists();
    };

    window.addEventListener('refresh-custom-folders', handleRefreshCustomFolders);
    
    return () => {
      window.removeEventListener('refresh-custom-folders', handleRefreshCustomFolders);
    };
  }, []);

  // Reset pin state when behavior changes
  useEffect(() => {
    if (sidebarBehavior === 'auto') {
      setIsPinned(false);
      localStorage.setItem('sidebarPinned', JSON.stringify(false));
    }
  }, [sidebarBehavior]);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  const fetchCustomPatentLists = async () => {
    try {
      if (isLoading) return; // Prevent duplicate calls
      setIsLoading(true);
      
      // Fetch both custom lists and imported lists
      const [customListsResponse, importedListsResponse] = await Promise.all([
        authApi.getCustomPatentList(),
        authApi.getImportedLists()
      ]);
      
      // Transform the data to match the CustomPatentList interface
      const transformedCustomLists = (customListsResponse.data || []).map((list: any) => ({
        _id: list._id,
        name: list.name,
        patentIds: list.patentIds,
        timestamp: list.timestamp,
        workFiles: list.workFiles || [],
        createdAt: list.createdAt,
        source: list.source || 'folderName',
        userId: list.userId,
        __v: list.__v
      }));

      const transformedImportedLists = (importedListsResponse.data || []).map((list: any) => ({
        _id: list._id,
        name: list.name,
        patentIds: list.patentIds,
        timestamp: list.timestamp,
        workFiles: list.workFiles || [],
        createdAt: list.createdAt,
        source: list.source || 'importedList',
        userId: list.userId,
        __v: list.__v
      }));
      
      setCustomPatentLists(transformedCustomLists);
      setImportedLists(transformedImportedLists);
      setHasLoadedLists(true);
    } catch (error) {
      console.error('Failed to fetch patent lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  async function handleRemovePatentFromFolder(folderId: string, patentId: string): Promise<void> {
    try {
      const response = await authApi.removePatentFromFolder(folderId, patentId);
      
      // If the folder was automatically deleted (all patents removed)
      if (response.folderDeleted) {
        // Folder was automatically deleted
      }
      
      // Refresh the list after successful removal
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to remove patent from folder:', error);
    }
  }

  async function handleDeleteFolder(folderId: string): Promise<void> {
    try {
      await authApi.deleteFolder(folderId);
      // Refresh the list after successful deletion
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }

  async function handleCreateSubfolder(name: string, parentFolderId: string, patentIds: string[]): Promise<void> {
    try {
      await authApi.createSubfolder(name, parentFolderId, patentIds);
      // Refresh the list after successful creation
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to create subfolder:', error);
    }
  }

  async function handleAddPatentToSubfolder(subfolderId: string, patentId: string): Promise<void> {
    try {
      await authApi.addPatentToSubfolder(subfolderId, patentId);
      // Refresh the list after successful addition
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to add patent to subfolder:', error);
    }
  }

  // Support for folder info in patent clicks
  const handlePatentClickWithFolder = (patentId: string, folderName: string) => {
    if (onPatentWithFolderClick) {
      onPatentWithFolderClick(patentId, folderName);
    } else {
      // Fallback to regular patent click
      onPatentClick(patentId);
    }
  };

  // Handle ImportedFolders modal state changes
  const handleModalStateChange = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
    
    // Ensure sidebar stays expanded when modal is open
    if (isOpen && !isExpanded) {
      setIsExpanded(true);
      if (onExpandChange) {
        onExpandChange(true);
      }
    }
  };

  const sidebarClasses = [
    "dashboard-sidebar",
    isExpanded ? "expanded" : "collapsed",
    sidebarBehavior === 'manual' ? "manual-mode" : "auto-mode",
    isPinned ? "pinned" : ""
  ].join(" ");

  return (
    <div
      className={sidebarClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={!isExpanded && sidebarBehavior === 'manual' ? handleSidebarClick : undefined}
    >
      <div className="sidebar-toggle">
        {sidebarBehavior === 'auto' ? (
          <span className="toggle-icon">{isExpanded ? "◀" : "▶"}</span>
        ) : (
          <span 
            className="pin-icon" 
            onClick={handleTogglePin}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? "📌" : "📍"}
          </span>
        )}
      </div>

      <div className="sidebar-content">
        {/* <RecentPatentIds
          recentSearches={recentSearches}
          onClearHistory={onClearHistory}
          onPatentClick={onPatentClick}
        /> */}

        <ImportedFolders 
          onPatentClick={onPatentClick}
          onPatentWithFolderClick={handlePatentClickWithFolder}
          customPatentLists={importedLists}
          isLoading={isLoading}
          onModalStateChange={handleModalStateChange}
        />
      </div>
    </div>
  );
};

export default DashboardSidebar;
