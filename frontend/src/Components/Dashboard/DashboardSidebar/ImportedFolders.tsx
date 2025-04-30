import React, { useState } from "react";
import "./DashboardSidebar.scss";
import CombineWorkfilesModal from "./CombineWorkfilesModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faSearch,
  faEllipsisVertical,
  faFolder,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { authApi } from "../../../api/auth";
import Loader from "../../Common/Loader";

interface WorkFile {
  _id: string;
  name: string;
  patentIds: string[];
  timestamp: number;
  isCombined?: boolean;
}

interface CustomFolder {
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

interface ImportedFoldersProps {
  onPatentClick: (patentId: string) => void;
  onPatentWithFolderClick?: (patentId: string, folderName: string) => void;
  customPatentLists: CustomFolder[];
  isLoading: boolean;
  onModalStateChange?: (isOpen: boolean) => void;
}

const ImportedFolders: React.FC<ImportedFoldersProps> = ({
  onPatentClick,
  onPatentWithFolderClick,
  customPatentLists,
  isLoading,
  onModalStateChange,
}) => {
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [expandedWorkFiles, setExpandedWorkFiles] = useState<Set<string>>(
    new Set()
  );
  const [selectedWorkFiles, setSelectedWorkFiles] = useState<
    Map<string, Set<number>>
  >(new Map());
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedFolderForCombine, setSelectedFolderForCombine] =
    useState<CustomFolder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Add new state variables for menu functionality
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "folder" | "workfile" | "patent";
    id: string;
    parentId?: string;
    name?: string;
  } | null>(null);

  const [folderName, setFolderName] = useState("");
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      // First create the folder with source as 'importedList' to ensure it appears in the sidebar
      const folderResponse = await authApi.saveCustomPatentList(
        folderName,
        selectedPatentIds,
        "importedList"
      );

      if (!folderResponse.data || !folderResponse.data._id) {
        throw new Error("Failed to create folder: No folder ID returned");
      }

      // Create a default workfile in the new folder
      const workFileName = "Workfile 1";
      await authApi.addPatentsToWorkFile(
        folderResponse.data._id,
        workFileName,
        selectedPatentIds
      );

      toast.success(
        `Created folder "${folderName}" with ${selectedPatentIds.length} patents`
      );

      // Dispatch a custom event to notify the DashboardSidebar to refresh
      const refreshEvent = new CustomEvent("refresh-custom-folders");
      window.dispatchEvent(refreshEvent);

      setShowNewFolderModal(false);
      setFolderName("");
      setSelectedPatentIds([]);
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder. Please try again.");
    }
  };

  const handleFolderClick = (folderId: string) => {
    setExpandedFolder(expandedFolder === folderId ? null : folderId);
    if (expandedFolder === folderId) {
      setExpandedWorkFiles(new Set());
      setSelectedWorkFiles(new Map());
    }
  };

  const handleWorkFileClick = (workfileId: string) => {
    setExpandedWorkFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(workfileId)) {
        newSet.delete(workfileId);
      } else {
        newSet.add(workfileId);
      }
      return newSet;
    });
  };

  const handleWorkFileSelect = (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
    folderId: string,
    workFileIndex: number
  ) => {
    e.stopPropagation();
    setSelectedWorkFiles((prev) => {
      const newMap = new Map(prev);
      const selectedForFolder = new Set<number>(
        newMap.get(folderId) || new Set()
      );

      if (selectedForFolder.has(workFileIndex)) {
        selectedForFolder.delete(workFileIndex);
      } else {
        selectedForFolder.add(workFileIndex);
      }

      if (selectedForFolder.size === 0) {
        newMap.delete(folderId);
      } else {
        newMap.set(folderId, selectedForFolder);
      }

      return newMap;
    });
  };

  const handleCombineWorkFiles = (
    folder: CustomFolder,
    selectedIndices: Set<number>
  ) => {
    // Get selected workfiles
    const selectedWorkFiles = Array.from(selectedIndices).map(
      (index) => folder.workFiles[index]
    );

    // Process patent IDs to find duplicates
    const allPatentIds = selectedWorkFiles.flatMap(
      (workFile) => workFile.patentIds
    );
    const uniqueIds = new Set<string>();
    const duplicates = new Set<string>();

    allPatentIds.forEach((id) => {
      if (uniqueIds.has(id)) {
        duplicates.add(id);
      } else {
        uniqueIds.add(id);
      }
    });

    setSelectedFolderForCombine(folder);
    setShowCombineModal(true);
    if (onModalStateChange) {
      onModalStateChange(true);
    }
  };

  const handleModalClose = () => {
    setShowCombineModal(false);
    setSelectedFolderForCombine(null);
    if (onModalStateChange) {
      onModalStateChange(false);
    }
  };

  const handleCombineConfirm = async (uniquePatentIds: string[]) => {
    if (!selectedFolderForCombine) return;

    try {
      // Create new workfile name based on existing workfiles count
      const newWorkFileName = `Workfile ${
        selectedFolderForCombine.workFiles.length + 1
      }`;

      // Save the new workfile to the backend
      await authApi.addPatentsToWorkFile(
        selectedFolderForCombine._id,
        newWorkFileName,
        uniquePatentIds
      );

      // Dispatch event to refresh the folder list
      const refreshEvent = new CustomEvent("refresh-custom-folders");
      window.dispatchEvent(refreshEvent);

      toast.success("Workfiles combined successfully");

      // Clear selections and close modal
      setSelectedWorkFiles(new Map());
      handleModalClose();
    } catch (error) {
      console.error("Error combining workfiles:", error);
      toast.error("Failed to combine workfiles");
    }
  };

  const handlePatentClick = (patentId: string, folderName: string) => {
    if (onPatentWithFolderClick) {
      onPatentWithFolderClick(patentId, folderName);
    } else if (window.patentSearchPopulateCallback) {
      if (window.patentSearchPopulateWithFolderCallback) {
        window.patentSearchPopulateWithFolderCallback(patentId, folderName);
      } else {
        window.patentSearchPopulateCallback(patentId);
      }
    } else {
      onPatentClick(patentId);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      switch (itemToDelete.type) {
        case "folder":
          await authApi.deleteItem({
            itemType: "folder",
            folderId: itemToDelete.id,
          });
          toast.success("Folder deleted successfully");
          break;
        case "workfile":
          await authApi.deleteItem({
            itemType: "workfile",
            folderId: itemToDelete.parentId!,
            workFileId: itemToDelete.id,
          });
          toast.success(`Workfile "${itemToDelete.name}" deleted successfully`);
          break;
        case "patent":
          await authApi.deleteItem({
            itemType: "patent",
            folderId: itemToDelete.parentId!,
            patentId: itemToDelete.id,
          });
          toast.success("Patent removed successfully");
          break;
      }

      const refreshEvent = new CustomEvent("refresh-custom-folders");
      window.dispatchEvent(refreshEvent);

      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add workfile delete button handler
  const handleWorkfileDelete = (
    e: React.MouseEvent,
    folderId: string,
    workFile: WorkFile
  ) => {
    e.stopPropagation();
    setItemToDelete({
      type: "workfile",
      id: workFile._id,
      parentId: folderId,
      name: workFile.name,
    });
    setShowDeleteModal(true);
  };

  // Add search handlers
  const handleSearch = (
    type: "folder" | "workfile" | "patent",
    id: string,
    parentId?: string,
    name?: string
  ) => {
    switch (type) {
      case "folder":
        // Search all patents in the folder
        const folder = customPatentLists.find((f) => f._id === id);
        if (folder) {
          const event = new CustomEvent("search-patents", {
            detail: {
              patentIds: folder.patentIds,
              source: `folder/${folder.name}`,
            },
          });
          window.dispatchEvent(event);
        }
        break;
      case "workfile":
        // Search patents in the workfile
        const parentFolder = customPatentLists.find((f) => f._id === parentId);
        if (parentFolder) {
          const workfile = parentFolder.workFiles.find((w) => w.name === name);
          if (workfile) {
            const event = new CustomEvent("search-patents", {
              detail: {
                patentIds: workfile.patentIds,
                source: `workfile/${name}`,
              },
            });
            window.dispatchEvent(event);
          }
        }
        break;
      case "patent":
        // Search single patent
        const event = new CustomEvent("search-patents", {
          detail: {
            patentIds: [id],
            source: "patent",
          },
        });
        window.dispatchEvent(event);
        break;
    }
  };

  // Add search filter function
  const filteredFolders = customPatentLists.filter((folder) => {
    const folderMatch = folder.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const workfileMatch = folder.workFiles.some((workfile) =>
      workfile.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return folderMatch || workfileMatch;
  });

  return (
    <div className="imported-folders-section">
      {isDeleting && <Loader fullScreen text="Deleting item..." />}
      <div className="folders-header">
        <h3 className="folders-title">Files</h3>
      </div>

      {isLoading ? (
        <div className="loading-message">Loading folders...</div>
      ) : !customPatentLists || customPatentLists.length === 0 ? (
        <div className="no-folders-message">No imported lists available.</div>
      ) : (
        <div className="imported-folders-list">
          {customPatentLists?.map((folder) => {
            const selectedWorkFileIndices =
              selectedWorkFiles.get(folder._id) || new Set();
            const canCompare = selectedWorkFileIndices.size >= 2;
            const isExpanded = expandedFolder === folder._id;

            return (
              <div
                key={folder._id}
                className={`imported-folder ${isExpanded ? "expanded" : ""}`}
              >
                <div
                  className="folder-header"
                  onClick={() => handleFolderClick(folder._id)}
                >
                  <div className="folder-info">
                    <FontAwesomeIcon
                      icon={isExpanded ? faFolderOpen : faFolder}
                      className="folder-icon"
                    />
                    <span className="folder-name">{folder.name}</span>
                    <div className="folder-actions">
                      <button
                        className="action-button search-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSearch(
                            "folder",
                            folder._id,
                            undefined,
                            folder.name
                          );
                        }}
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({
                            type: "folder",
                            id: folder._id,
                            name: folder.name,
                          });
                          setShowDeleteModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                </div>

                {isExpanded && (
                  <div className="folder-content">
                    {folder.workFiles && folder.workFiles.length > 0 ? (
                      <>
                        <div className="workfiles-header">
                          <div className="selection-info">
                            {selectedWorkFileIndices.size > 0 && (
                              <span>
                                {selectedWorkFileIndices.size} workfiles
                                selected
                              </span>
                            )}
                          </div>
                          {canCompare && (
                            <button
                              className="combine-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCombineWorkFiles(
                                  folder,
                                  selectedWorkFileIndices
                                );
                              }}
                            >
                              Combine Selected
                            </button>
                          )}
                        </div>
                        <div className="workfiles-list">
                          {folder.workFiles.map((workfile, index) => {
                            const workfileId = `${folder._id}-${index}`;
                            const isWorkFileExpanded =
                              expandedWorkFiles.has(workfileId);
                            const isSelected =
                              selectedWorkFileIndices.has(index);

                            return (
                              <div
                                key={workfileId}
                                className={`workfile-item ${
                                  isSelected ? "selected" : ""
                                } ${workfile.isCombined ? "combined" : ""}`}
                              >
                                <div className="workfile-header">
                                  <div className="workfile-select">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) =>
                                        handleWorkFileSelect(
                                          e,
                                          folder._id,
                                          index
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div
                                    className="workfile-info"
                                    onClick={() =>
                                      handleWorkFileClick(workfileId)
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        isWorkFileExpanded
                                          ? faFolderOpen
                                          : faFolder
                                      }
                                      className="workfile-icon"
                                    />
                                    <span className="workfile-name">
                                      {workfile.name}
                                    </span>
                                    <span className="workfile-count">
                                      {workfile.patentIds.length}
                                    </span>
                                    <div className="workfile-actions">
                                      <button
                                        className="action-button search-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSearch(
                                            "workfile",
                                            workfile.name,
                                            folder._id,
                                            workfile.name
                                          );
                                        }}
                                      >
                                        <FontAwesomeIcon icon={faSearch} />
                                      </button>
                                      <button
                                        className="action-button delete-button"
                                        onClick={(e) =>
                                          handleWorkfileDelete(
                                            e,
                                            folder._id,
                                            workfile
                                          )
                                        }
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {isWorkFileExpanded &&
                                  workfile.patentIds &&
                                  workfile.patentIds.length > 0 && (
                                    <div className="patents-list">
                                      {workfile.patentIds.map(
                                        (patentId, idx) => (
                                          <div
                                            key={idx}
                                            className="patent-item"
                                            onClick={() =>
                                              handlePatentClick(
                                                patentId,
                                                folder.name
                                              )
                                            }
                                          >
                                            <span className="patent-id">
                                              {patentId}
                                            </span>
                                            <div className="patent-actions">
                                              <button
                                                className="action-button delete-button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setItemToDelete({
                                                    type: "patent",
                                                    id: patentId,
                                                    parentId: folder._id,
                                                  });
                                                  setShowDeleteModal(true);
                                                }}
                                              >
                                                <FontAwesomeIcon
                                                  icon={faTrash}
                                                />
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="no-workfiles-message">
                        No workfiles in this folder.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="delete-modal">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this {itemToDelete.type}?</p>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </button>
              <button className="delete-button" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCombineModal && selectedFolderForCombine && (
        <CombineWorkfilesModal
          isOpen={showCombineModal}
          onClose={handleModalClose}
          selectedWorkFiles={(() => {
            const indices = selectedWorkFiles.get(selectedFolderForCombine._id);
            if (!indices) return [];
            return Array.from(indices).map(
              (index) => selectedFolderForCombine.workFiles[index]
            );
          })()}
          onCombine={handleCombineConfirm}
        />
      )}
    </div>
  );
};

declare global {
  interface Window {
    patentSearchPopulateCallback?: (patentIds: string) => void;
    patentSearchPopulateWithFolderCallback?: (
      patentIds: string,
      folderName: string
    ) => void;
  }
}

export default ImportedFolders;
