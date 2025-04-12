import { useState, useEffect } from "react";
import { authApi } from "../../../api/auth";
import "./DashboardSidebar.scss";
// import RecentPatentIds from "./RecentPatentIds";
import CustomSearch from "./CustomSearch";
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

interface CustomPatentList {
  id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  isSubfolder?: boolean;
  parentFolderId?: string | null;
  source: string;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
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
      console.log('Refreshing custom folders from event');
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
    }
  }, [sidebarBehavior]);

  const fetchCustomPatentLists = async () => {
    try {
      if (isLoading) return; // Prevent duplicate calls
      setIsLoading(true);
      console.log("Fetching custom patent lists...");
      
      // Fetch both custom lists and imported lists
      const [customListsResponse, importedListsResponse] = await Promise.all([
        authApi.getCustomPatentList(),
        authApi.getImportedLists()
      ]);
      
      console.log("Custom patent lists fetched:", customListsResponse.data);
      console.log("Imported lists fetched:", importedListsResponse.data);
      
      // Transform the data to match the CustomPatentList interface
      const transformedCustomLists = (customListsResponse.data || []).map((list: any) => ({
        id: list._id,
        name: list.name,
        patentIds: list.patentIds,
        timestamp: list.timestamp,
        isSubfolder: list.isSubfolder || false,
        parentFolderId: list.parentFolderId || null,
        source: list.source || 'folderName'
      }));

      const transformedImportedLists = (importedListsResponse.data || []).map((list: any) => ({
        id: list._id,
        name: list.name,
        patentIds: list.patentIds,
        timestamp: list.timestamp,
        isSubfolder: list.isSubfolder || false,
        parentFolderId: list.parentFolderId || null,
        source: list.source || 'importedList'
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
      console.log(`Removing patent ${patentId} from folder ${folderId}`);
      const response = await authApi.removePatentFromFolder(folderId, patentId);
      
      // If the folder was automatically deleted (all patents removed)
      if (response.folderDeleted) {
        console.log(`Folder ${folderId} was automatically deleted as it's now empty`);
      }
      
      // Refresh the list after successful removal
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to remove patent from folder:', error);
    }
  }

  async function handleDeleteFolder(folderId: string): Promise<void> {
    try {
      console.log(`Deleting folder ${folderId}`);
      await authApi.deleteFolder(folderId);
      // Refresh the list after successful deletion
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }

  async function handleCreateSubfolder(name: string, parentFolderId: string, patentIds: string[]): Promise<void> {
    try {
      console.log(`Creating subfolder ${name} under folder ${parentFolderId}`);
      await authApi.createSubfolder(name, parentFolderId, patentIds);
      // Refresh the list after successful creation
      await refreshCustomPatentLists();
    } catch (error) {
      console.error('Failed to create subfolder:', error);
    }
  }

  async function handleAddPatentToSubfolder(subfolderId: string, patentId: string): Promise<void> {
    try {
      console.log(`Adding patent ${patentId} to subfolder ${subfolderId}`);
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

        <CustomSearch
          recentSearches={recentSearches}
          customPatentLists={customPatentLists
            .filter(list => list.source === 'folderName')
            .map(list => ({
              _id: list.id,
              name: list.name,
              patentIds: list.patentIds,
              isSubfolder: list.isSubfolder,
              parentFolderId: list.parentFolderId
            }))}
          onAddCustomFolder={async (name, patentIds) => {
            if (onAddCustomFolder) {
              await onAddCustomFolder(name, patentIds);
              await refreshCustomPatentLists();
            }
          }}
          onPatentClick={onPatentClick}
          onPatentWithFolderClick={handlePatentClickWithFolder}
          onRemovePatentFromFolder={handleRemovePatentFromFolder}
          onDeleteFolder={handleDeleteFolder}
          onCreateSubfolder={handleCreateSubfolder}
          onAddPatentToSubfolder={handleAddPatentToSubfolder}
        />

        <div className="patent-history-link-section">
          <Link to="/auth/patent-history" className="patent-history-link">
            <span className="history-icon">🕒</span>
            <span className="link-text">View Complete Patent History</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
