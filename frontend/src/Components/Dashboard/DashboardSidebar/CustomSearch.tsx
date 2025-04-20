import React, { useState, useRef } from "react";
import "./DashboardSidebar.scss";
import { toast } from "react-hot-toast";

interface CustomPatentList {
  _id: string;
  name: string;
  patentIds: string[];
  isSubfolder?: boolean;
  parentFolderId?: string | null;
}

interface RecentSearch {
  patentId: string;
  timestamp: number;
}

interface CustomSearchProps {
  recentSearches: RecentSearch[];
  customPatentLists: CustomPatentList[];
  onAddCustomFolder: (name: string, patentIds: string[]) => void;
  onPatentClick: (patentId: string) => void;
  onPatentWithFolderClick?: (patentId: string, folderName: string) => void;
  onRemovePatentFromFolder?: (folderId: string, patentId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onCreateSubfolder?: (
    name: string,
    parentFolderId: string,
    patentIds: string[]
  ) => void;
  onAddPatentToSubfolder?: (subfolderId: string, patentId: string) => void;
}

const CustomSearch: React.FC<CustomSearchProps> = ({
  recentSearches,
  customPatentLists,
  onAddCustomFolder,
  onPatentClick,
  onPatentWithFolderClick,
  onRemovePatentFromFolder,
  onDeleteFolder,
  onCreateSubfolder,
  onAddPatentToSubfolder,
}) => {
  const [isAddingCustomFolder, setIsAddingCustomFolder] = useState(false);
  const [isAddingSubfolder, setIsAddingSubfolder] = useState(false);
  const [isAddingPatentsToSubfolder, setIsAddingPatentsToSubfolder] =
    useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [newPatentId, setNewPatentId] = useState("");
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  const [selectedSubfolderPatentIds, setSelectedSubfolderPatentIds] = useState<
    string[]
  >([]);
  const [selectedParentFolderId, setSelectedParentFolderId] = useState<
    string | null
  >(null);
  const [selectedSubfolderId, setSelectedSubfolderId] = useState<string | null>(
    null
  );
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Map<string, boolean>>(
    new Map()
  );
  const [selectedPatentId, setSelectedPatentId] = useState<string | null>(null);
  const [showDeleteIcon, setShowDeleteIcon] = useState<{
    folderId: string;
    patentId: string;
  } | null>(null);
  const [showFolderDeleteIcon, setShowFolderDeleteIcon] = useState<
    string | null
  >(null);
  const [showFolderActions, setShowFolderActions] = useState<string | null>(
    null
  );
  const [patentToAdd, setPatentToAdd] = useState<{
    patentId: string;
    subfolderId: string;
  } | null>(null);

  // New state for manual patent ID addition
  const [isAddingPatentToFolder, setIsAddingPatentToFolder] = useState(false);
  const [folderForNewPatent, setFolderForNewPatent] = useState<string | null>(null);
  const [manualPatentId, setManualPatentId] = useState("");
  
  // State for drag and drop
  const draggedPatentRef = useRef<{ patentId: string, folderId: string } | null>(null);
  const dragOverFolderRef = useRef<string | null>(null);

  // Get parent folders and subfolders
  const parentFolders = customPatentLists.filter(
    (folder) => !folder.parentFolderId && !folder.isSubfolder
  );
  const getSubfolders = (parentId: string) => {
    return customPatentLists.filter(
      (folder) => folder.isSubfolder && folder.parentFolderId === parentId
    );
  };

  const toggleCustomFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newMap = new Map(prev);
      newMap.set(folderId, !prev.get(folderId));
      return newMap;
    });
  };

  const isFolderExpanded = (folderId: string): boolean => {
    return expandedFolders.get(folderId) || false;
  };

  const handleSelectAllPatentIds = () => {
    if (selectedPatentIds.length === recentSearches.length) {
      setSelectedPatentIds([]);
    } else {
      setSelectedPatentIds(recentSearches?.map((search) => search.patentId));
    }
  };

  const handleTogglePatentId = (patentId: string) => {
    if (selectedPatentIds.includes(patentId)) {
      setSelectedPatentIds(selectedPatentIds.filter((id) => id !== patentId));
    } else {
      setSelectedPatentIds([...selectedPatentIds, patentId]);
    }
  };

  const handleToggleSubfolderPatentId = (patentId: string) => {
    if (selectedSubfolderPatentIds.includes(patentId)) {
      setSelectedSubfolderPatentIds(
        selectedSubfolderPatentIds.filter((id) => id !== patentId)
      );
    } else {
      setSelectedSubfolderPatentIds([...selectedSubfolderPatentIds, patentId]);
    }
  };

  const handleAddCustomFolder = async () => {
    if (!isAddingCustomFolder) {
      setIsAddingCustomFolder(true);
      return;
    }

    if (newFolderName.trim() === "" || selectedPatentIds.length === 0) {
      return;
    }

    try {
      await onAddCustomFolder(newFolderName, selectedPatentIds);
      setIsAddingCustomFolder(false);
      setNewFolderName("");
      setSelectedPatentIds([]);
    } catch (error) {
      console.error("Failed to create custom folder:", error);
    }
  };

  const handleCreateSubfolder = async () => {
    if (
      !newSubfolderName.trim() ||
      !selectedParentFolderId ||
      !onCreateSubfolder
    ) {
      return;
    }

    try {
      await onCreateSubfolder(newSubfolderName, selectedParentFolderId, []);
      setIsAddingSubfolder(false);
      setNewSubfolderName("");
      setSelectedParentFolderId(null);
    } catch (error) {
      console.error("Failed to create subfolder:", error);
    }
  };

  const handleAddPatentToSubfolder = async () => {
    if (!patentToAdd || !onAddPatentToSubfolder) return;

    try {
      await onAddPatentToSubfolder(
        patentToAdd.subfolderId,
        patentToAdd.patentId
      );
      setPatentToAdd(null);
    } catch (error) {
      console.error("Failed to add patent to subfolder:", error);
    }
  };

  const handleAddPatentsToSubfolder = async () => {
    if (!selectedSubfolderId || !onAddPatentToSubfolder) return;

    // Add manual patent ID if provided
    if (newPatentId.trim()) {
      try {
        await onAddPatentToSubfolder(selectedSubfolderId, newPatentId.trim());
      } catch (error) {
        console.error("Failed to add manual patent to subfolder:", error);
      }
    }

    // Add selected patent IDs
    for (const patentId of selectedSubfolderPatentIds) {
      try {
        await onAddPatentToSubfolder(selectedSubfolderId, patentId);
      } catch (error) {
        console.error(`Failed to add patent ${patentId} to subfolder:`, error);
      }
    }

    // Reset state
    setIsAddingPatentsToSubfolder(false);
    setSelectedSubfolderId(null);
    setSelectedSubfolderPatentIds([]);
    setNewPatentId("");
  };

  const handlePatentSelect = (patentId: string, folderName: string) => {
    setSelectedPatentId(patentId);
    
    // Try to use the extended function with folder support if available
    if (onPatentWithFolderClick) {
      onPatentWithFolderClick(patentId, folderName);
    } else {
      // Fallback to regular patent click
      onPatentClick(patentId);
    }
  };

  const handleRemovePatent = (
    e: React.MouseEvent,
    folderId: string,
    patentId: string
  ) => {
    e.stopPropagation();
    if (onRemovePatentFromFolder) {
      onRemovePatentFromFolder(folderId, patentId);
    }
    setShowDeleteIcon(null);
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation(); // Prevent folder expansion when clicking delete icon
    if (onDeleteFolder) {
      onDeleteFolder(folderId);
    }
    setShowFolderDeleteIcon(null);
  };

  const handleAddSubfolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setSelectedParentFolderId(folderId);
    setIsAddingSubfolder(true);
    setShowFolderActions(null);
  };

  const handleOpenAddPatentsToSubfolder = (
    subfolderId: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setSelectedSubfolderId(subfolderId);
    setIsAddingPatentsToSubfolder(true);
  };

  // Update the patent folder functions to refresh data
  const handleAddPatentToFolder = async () => {
    if (!manualPatentId.trim() || !folderForNewPatent) {
      return;
    }

    // Find the folder
    const folder = customPatentLists.find(f => f._id === folderForNewPatent);
    if (!folder) return;

    try {
      const patentIdToAdd = manualPatentId.trim();
      
      // For subfolder
      if (folder.isSubfolder && folder.parentFolderId && onAddPatentToSubfolder) {
        await onAddPatentToSubfolder(folder._id, patentIdToAdd);
      } 
      // For regular folder - use workaround with saveCustomPatentList
      else if (onAddCustomFolder) {
        // Create a new array with the added patent ID
        const updatedPatentIds = [...folder.patentIds, patentIdToAdd];
        
        // Call API to update the folder with new patent IDs using existing APIs
        // First delete the existing folder
        if (onDeleteFolder) {
          await onDeleteFolder(folder._id);
          // Then recreate with updated patent IDs
          await onAddCustomFolder(folder.name, updatedPatentIds);
        }
      }

      // Reset state
      setIsAddingPatentToFolder(false);
      setFolderForNewPatent(null);
      setManualPatentId("");
    } catch (error) {
      console.error("Failed to add patent to folder:", error);
    }
  };

  const filteredCustomFolders = parentFolders.filter((folder) =>
    folder.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
  );

  // Update the drag and drop handler to make proper API calls
  const handleDragStart = (e: React.DragEvent, patentId: string, folderId: string) => {
    draggedPatentRef.current = { patentId, folderId };
    e.dataTransfer.setData("text/plain", patentId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't allow dropping in the same folder
    if (draggedPatentRef.current && draggedPatentRef.current.folderId !== folderId) {
      dragOverFolderRef.current = folderId;
      
      // Add visual feedback
      const element = e.currentTarget as HTMLElement;
      element.classList.add("drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragOverFolderRef.current = null;
    
    // Remove visual feedback
    const element = e.currentTarget as HTMLElement;
    element.classList.remove("drag-over");
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string, isSubfolder: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    const element = e.currentTarget as HTMLElement;
    element.classList.remove("drag-over");
    
    if (!draggedPatentRef.current) return;
    
    const { patentId, folderId } = draggedPatentRef.current;
    
    // Don't do anything if dropping in the same folder
    if (folderId === targetFolderId) return;
    
    try {
      // Handle subfolder drops
      if (isSubfolder && onAddPatentToSubfolder) {
        // Add to target subfolder
        await onAddPatentToSubfolder(targetFolderId, patentId);
        
        // Remove from source folder
        if (onRemovePatentFromFolder) {
          await onRemovePatentFromFolder(folderId, patentId);
        }
      } 
      // Handle folder-to-folder move using existing APIs
      else if (onAddCustomFolder && onDeleteFolder && onRemovePatentFromFolder) {
        // First, remove the patent from the source folder
        await onRemovePatentFromFolder(folderId, patentId);
        
        // Find target folder
        const targetFolder = customPatentLists.find(f => f._id === targetFolderId);
        if (!targetFolder) {
          console.error("Target folder not found");
          return;
        }
        
        // Add patent to target folder by recreating it
        const updatedTargetPatentIds = [...targetFolder.patentIds, patentId];
        
        // Delete and recreate target folder with the updated patent IDs
        await onDeleteFolder(targetFolderId);
        await onAddCustomFolder(targetFolder.name, updatedTargetPatentIds);
      }
    } catch (error) {
      console.error("Error moving patent:", error);
      alert("There was an error moving the patent. Please try again.");
    } finally {
      // Reset drag state
      draggedPatentRef.current = null;
      dragOverFolderRef.current = null;
    }
  };

  // Update the folder header to add a "Search All" button
  const handleSearchAllPatents = (folderName: string, patentIds: string[]) => {
    if (patentIds.length === 0) return;
    
    // Create a custom event to trigger a patent search
    const event = new CustomEvent('search-patents', {
      detail: {
        patentIds,
        source: folderName
      }
    });
    
    window.dispatchEvent(event);
    toast.success(`Searching for ${patentIds.length} patents from folder "${folderName}"`);
  };

  return (
    <div className="custom-search-section">
      <div className="section-header">
        <h3>Customized folder</h3>
        <button
          className="add-folder-btn"
          onClick={handleAddCustomFolder}
          title="Add Custom Folder"
        >
          <span>+</span>
        </button>
      </div>

      {isAddingCustomFolder && (
        <div className="add-folder-form">
          <input
            type="text"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="folder-name-input"
          />
          <div className="recent-patents-list">
            <h4>Select Patents</h4>
            <div className="manual-patent-input">
              <input
                type="text"
                placeholder="Enter patent ID manually (separate multiple IDs with commas)"
                value={newPatentId}
                onChange={(e) => setNewPatentId(e.target.value)}
                className="patent-id-input"
              />
              <button 
                className="add-manual-btn"
                onClick={() => {
                  const ids = newPatentId.split(',').map(id => id.trim()).filter(id => id);
                  if (ids.length > 0) {
                    setSelectedPatentIds(prev => [...prev, ...ids]);
                    setNewPatentId("");
                  }
                }}
                disabled={!newPatentId.trim()}
              >
                Add Manual Patent(s)
              </button>
            </div>
            <div className="patent-checkboxes">
              <div key="select-all" className="patent-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPatentIds.length === recentSearches.length}
                  onChange={handleSelectAllPatentIds}
                />
                <span>Select All</span>
              </div>
              {recentSearches.map((search) => (
                <div
                  key={`patent-${search.patentId}`}
                  className="patent-checkbox"
                >
                  <input
                    type="checkbox"
                    checked={selectedPatentIds.includes(search.patentId)}
                    onChange={() => handleTogglePatentId(search.patentId)}
                  />
                  <span>{search.patentId}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="selected-count">
            {selectedPatentIds.length} patent(s) selected
          </div>
          <div className="form-actions">
            <button
              className="save-btn"
              onClick={handleAddCustomFolder}
              disabled={!newFolderName.trim() || selectedPatentIds.length === 0}
            >
              Save Folder
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                setIsAddingCustomFolder(false);
                setNewFolderName("");
                setSelectedPatentIds([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isAddingSubfolder && (
        <div className="add-subfolder-form">
          <h4>Create Subfolder</h4>
          <input
            type="text"
            placeholder="Enter subfolder name"
            value={newSubfolderName}
            onChange={(e) => setNewSubfolderName(e.target.value)}
            className="folder-name-input"
          />
          <div className="form-actions">
            <button
              className="save-btn"
              onClick={handleCreateSubfolder}
              disabled={!newSubfolderName.trim() || !selectedParentFolderId}
            >
              Create Subfolder
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                setIsAddingSubfolder(false);
                setNewSubfolderName("");
                setSelectedParentFolderId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isAddingPatentsToSubfolder && (
        <div className="add-patents-to-subfolder-form">
          <h4>Add Patents to Subfolder</h4>

          {/* Manual patent ID input */}
          <div className="manual-patent-input">
            <input
              type="text"
              placeholder="Enter patent ID manually"
              value={newPatentId}
              onChange={(e) => setNewPatentId(e.target.value)}
              className="patent-id-input"
            />
          </div>

          {/* Select from recent patents */}
          <div className="recent-patents-list">
            <h4>Or select from recent patents</h4>
            <div className="patent-checkboxes">
              {recentSearches.map((search) => (
                <div
                  key={`subfolder-patent-${search.patentId}`}
                  className="patent-checkbox"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubfolderPatentIds.includes(
                      search.patentId
                    )}
                    onChange={() =>
                      handleToggleSubfolderPatentId(search.patentId)
                    }
                  />
                  <span>{search.patentId}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="selected-count">
            {selectedSubfolderPatentIds.length} patent(s) selected, plus{" "}
            {newPatentId.trim() ? "1 manually entered" : "0 manually entered"}
          </div>

          <div className="form-actions">
            <button
              className="save-btn"
              onClick={handleAddPatentsToSubfolder}
              disabled={
                selectedSubfolderPatentIds.length === 0 && !newPatentId.trim()
              }
            >
              Add to Subfolder
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                setIsAddingPatentsToSubfolder(false);
                setSelectedSubfolderId(null);
                setSelectedSubfolderPatentIds([]);
                setNewPatentId("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {patentToAdd && (
        <div className="add-patent-to-subfolder-form">
          <h4>Add Patent to Subfolder</h4>
          <p>Patent ID: {patentToAdd.patentId}</p>
          <div className="form-actions">
            <button className="save-btn" onClick={handleAddPatentToSubfolder}>
              Add to Subfolder
            </button>
            <button className="cancel-btn" onClick={() => setPatentToAdd(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {isAddingPatentToFolder && (
        <div className="add-patent-to-folder-form">
          <h4>Add Patent to Folder</h4>
          <input
            type="text"
            placeholder="Enter patent ID"
            value={manualPatentId}
            onChange={(e) => setManualPatentId(e.target.value)}
            className="patent-id-input"
          />
          <div className="form-actions">
            <button
              className="save-btn"
              onClick={handleAddPatentToFolder}
              disabled={!manualPatentId.trim() || !folderForNewPatent}
            >
              Add to Folder
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                setIsAddingPatentToFolder(false);
                setFolderForNewPatent(null);
                setManualPatentId("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {customPatentLists.length > 0 && (
        <>
          <div className="folder-search-container">
            <input
              type="text"
              placeholder="Search folders..."
              value={folderSearchQuery}
              onChange={(e) => setFolderSearchQuery(e.target.value)}
              className="folder-search-input"
            />
          </div>
          <div className="custom-folders-list">
            {filteredCustomFolders.map((folder) => (
              <div
                key={folder._id}
                className="patent-folder"
                onMouseEnter={() => setShowFolderActions(folder._id)}
                onMouseLeave={() => setShowFolderActions(null)}
                onDragOver={(e) => handleDragOver(e, folder._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder._id)}
              >
                <div
                  className="folder-header"
                  onClick={() => toggleCustomFolder(folder._id)}
                >
                  <div className="folder-info">
                    <span className="folder-icon">
                      {isFolderExpanded(folder._id) ? "📂" : "📁"}
                    </span>
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-count">
                      ({folder.patentIds.length})
                    </span>
                  </div>

                  {showFolderActions === folder._id && (
                    <div className="folder-actions">
                      <span
                        className="search-all-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSearchAllPatents(folder.name, folder.patentIds);
                        }}
                        title="Search all patents in folder"
                      >
                        🔍
                      </span>
                      <span
                        className="add-patent-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddingPatentToFolder(true);
                          setFolderForNewPatent(folder._id);
                        }}
                        title="Add patent to folder"
                      >
                        📄+
                      </span>
                      <span
                        className="add-subfolder-icon"
                        onClick={(e) => handleAddSubfolder(e, folder._id)}
                        title="Add subfolder"
                      >
                        📁+
                      </span>
                      <span
                        className="delete-folder-icon"
                        onClick={(e) => handleDeleteFolder(e, folder._id)}
                        title="Delete folder"
                      >
                        🗑️
                      </span>
                    </div>
                  )}
                </div>

                {isFolderExpanded(folder._id) && (
                  <>
                    {/* Display patents in folder - add draggable */}
                    <div className="folder-content">
                      {folder.patentIds.map((patentId) => (
                        <div
                          key={patentId}
                          className={`folder-patent-item ${
                            selectedPatentId === patentId ? "selected" : ""
                          }`}
                          onClick={(e) => handlePatentSelect(patentId, folder.name)}
                          onMouseEnter={() =>
                            setShowDeleteIcon({
                              folderId: folder._id,
                              patentId,
                            })
                          }
                          onMouseLeave={() => setShowDeleteIcon(null)}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, patentId, folder._id)}
                        >
                          <span>{patentId}</span>
                          {showDeleteIcon &&
                            showDeleteIcon.folderId === folder._id &&
                            showDeleteIcon.patentId === patentId && (
                              <div className="patent-actions">
                                <span
                                  className="add-to-subfolder-icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const subfolders = getSubfolders(
                                      folder._id
                                    );
                                    if (subfolders.length > 0) {
                                      setPatentToAdd({
                                        patentId,
                                        subfolderId: subfolders[0]._id, // Default to first subfolder
                                      });
                                    } else {
                                      // Prompt user to create a subfolder first
                                      setSelectedParentFolderId(folder._id);
                                      setIsAddingSubfolder(true);
                                    }
                                  }}
                                  title="Add to subfolder"
                                >
                                  📁
                                </span>
                                <span
                                  className="delete-patent-icon"
                                  onClick={(e) =>
                                    handleRemovePatent(e, folder._id, patentId)
                                  }
                                  title="Remove patent from folder"
                                >
                                  🗑️
                                </span>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>

                    {/* Display subfolders */}
                    {getSubfolders(folder._id).length > 0 && (
                      <div className="subfolders-container">
                        <div className="subfolders-title">
                          <div className="title-container">
                            <span className="title-text">Subfolders</span>
                          </div>
                          <div className="subfolders-actions">
                            <span
                              className="add-subfolder-icon"
                              onClick={(e) => handleAddSubfolder(e, folder._id)}
                              title="Add subfolder"
                            >
                              +
                            </span>
                            <span
                              className="delete-subfolder-icon"
                              onClick={(e) => handleDeleteFolder(e, folder._id)}
                              title="Delete all subfolders"
                            >
                              🗑️
                            </span>
                          </div>
                        </div>
                        {getSubfolders(folder._id).map((subfolder) => (
                          <div
                            key={subfolder._id}
                            className="subfolder"
                            onMouseEnter={() =>
                              setShowFolderDeleteIcon(subfolder._id)
                            }
                            onMouseLeave={() => setShowFolderDeleteIcon(null)}
                            onDragOver={(e) => handleDragOver(e, subfolder._id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, subfolder._id, true)}
                          >
                            <div
                              className="subfolder-header"
                              onClick={() => toggleCustomFolder(subfolder._id)}
                            >
                              <div className="folder-info">
                                <span className="folder-icon subfolder-icon">
                                  {isFolderExpanded(subfolder._id)
                                    ? "📂"
                                    : "📁"}
                                </span>
                                <span className="folder-name">
                                  {subfolder.name}
                                </span>
                                <span className="folder-count">
                                  ({subfolder.patentIds.length})
                                </span>
                              </div>

                              {showFolderDeleteIcon === subfolder._id && (
                                <div className="subfolder-actions">
                                  <span
                                    className="search-all-icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSearchAllPatents(subfolder.name, subfolder.patentIds);
                                    }}
                                    title="Search all patents in subfolder"
                                  >
                                    🔍
                                  </span>
                                  <span
                                    className="add-patent-icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsAddingPatentToFolder(true);
                                      setFolderForNewPatent(subfolder._id);
                                    }}
                                    title="Add patent to subfolder"
                                  >
                                    📄+
                                  </span>
                                  <span
                                    className="add-patents-icon"
                                    onClick={(e) =>
                                      handleOpenAddPatentsToSubfolder(
                                        subfolder._id,
                                        e
                                      )
                                    }
                                    title="Add patents to subfolder"
                                  >
                                    +
                                  </span>
                                  <span
                                    className="delete-folder-icon"
                                    onClick={(e) =>
                                      handleDeleteFolder(e, subfolder._id)
                                    }
                                    title="Delete subfolder"
                                  >
                                    🗑️
                                  </span>
                                </div>
                              )}
                            </div>

                            {isFolderExpanded(subfolder._id) && (
                              <div className="folder-content subfolder-content">
                                {subfolder.patentIds.length > 0 ? (
                                  subfolder.patentIds.map((patentId) => (
                                    <div
                                      key={patentId}
                                      className={`folder-patent-item ${
                                        selectedPatentId === patentId
                                          ? "selected"
                                          : ""
                                      }`}
                                      onClick={(e) => handlePatentSelect(patentId, subfolder.name)}
                                      onMouseEnter={() =>
                                        setShowDeleteIcon({
                                          folderId: subfolder._id,
                                          patentId,
                                        })
                                      }
                                      onMouseLeave={() =>
                                        setShowDeleteIcon(null)
                                      }
                                      draggable={true}
                                      onDragStart={(e) => handleDragStart(e, patentId, subfolder._id)}
                                    >
                                      <span>{patentId}</span>
                                      {showDeleteIcon &&
                                        showDeleteIcon.folderId ===
                                          subfolder._id &&
                                        showDeleteIcon.patentId ===
                                          patentId && (
                                          <span
                                            className="delete-patent-icon"
                                            onClick={(e) =>
                                              handleRemovePatent(
                                                e,
                                                subfolder._id,
                                                patentId
                                              )
                                            }
                                            title="Remove patent from subfolder"
                                          >
                                            🗑️
                                          </span>
                                        )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="empty-subfolder">
                                    <span>No patents in this subfolder</span>
                                    <button
                                      className="add-patents-btn"
                                      onClick={() =>
                                        handleOpenAddPatentsToSubfolder(
                                          subfolder._id
                                        )
                                      }
                                    >
                                      Add Patents
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {filteredCustomFolders.length === 0 && (
              <div className="no-folders-message">
                No folders found matching your search.
              </div>
            )}
          </div>
        </>
      )}
      {customPatentLists.length === 0 && (
        <div className="no-folders-message">
          No custom folders found. Click the "+" button to create one.
        </div>
      )}
    </div>
  );
};

export default CustomSearch;
