import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "./Admin.scss";
import UserProfileModal from "./UserProfileModal";
import UserSubscriptionModal from "./UserSubscriptionModal";

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus?: string;
  referenceNumber?: string;
  timeSpent?: number; // Time spent in minutes
  createdAt?: string;
  lastLogin?: string;
}

// Default pagination options
const PAGINATION_OPTIONS = [10, 25, 50, 100];

// Subscription filter options
const SUBSCRIPTION_FILTERS = [
  { value: "all", label: "All Subscriptions" },
  { value: "active", label: "Active/Paid" },
  { value: "trial", label: "Free Trial" },
  { value: "expired", label: "Expired" },
];

const UsersList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | null>(
    null
  );
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    // Try to get the default pagination limit from settings
    const savedLimit = localStorage.getItem("adminDefaultPaginationLimit");
    return savedLimit ? Number(savedLimit) : 10; // Default to 10 if not set
  });

  // Listen for settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.defaultPaginationLimit) {
        setItemsPerPage(event.detail.defaultPaginationLimit);
        setCurrentPage(1); // Reset to first page
      }
    };

    // Add event listener
    window.addEventListener(
      "adminSettingsUpdated",
      handleSettingsUpdate as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "adminSettingsUpdated",
        handleSettingsUpdate as EventListener
      );
    };
  }, []);

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data.users;
    },
  });

  const filteredUsers = users.filter((user: User) => {
    // Filter by search term
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by subscription status
    let matchesSubscription = true;
    if (subscriptionFilter !== "all") {
      const status = user.subscriptionStatus?.toLowerCase() || "";

      if (subscriptionFilter === "active") {
        matchesSubscription = status === "active" || status === "paid";
      } else if (subscriptionFilter === "trial") {
        matchesSubscription = status === "trial";
      } else if (subscriptionFilter === "expired") {
        matchesSubscription = status === "expired";
      }
    }

    return matchesSearch && matchesSubscription;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to first page when search term, subscription filter, or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, subscriptionFilter, itemsPerPage]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getSubscriptionStatusClass = (status?: string) => {
    if (!status) return "status-unknown";

    switch (status.toLowerCase()) {
      case "active":
      case "paid":
        return "status-active";
      case "trial":
        return "status-trial";
      case "expired":
        return "status-expired";
      default:
        return "status-unknown";
    }
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileModalOpen(true);
  };

  const handleEditSubscription = (user: User) => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setIsSubscriptionModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const handleCloseSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
  };

  const handleSubscriptionSuccess = () => {
    // Refetch the users data to update the UI with new subscription status
    refetch();
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleExportToExcel = () => {
    setIsExporting(true);
    setExportFormat("excel");

    try {
      // Prepare data for export
      const data = filteredUsers
        .map(
          (user: User, index: number) =>
            `${index + 1},${user.name || ""},${user.email || ""},${
              user.subscriptionStatus || "Unknown"
            },${user.referenceNumber || "N/A"},${formatTimeSpent(
              user.timeSpent
            )},${
              user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"
            },${
              user.lastLogin
                ? new Date(user.lastLogin).toLocaleDateString()
                : "N/A"
            }`
        )
        .join("\n");

      // Add headers
      const headers =
        "S.No,Name,Email,Subscription,Reference Number,Time Spent,Joined Date,Last Login";
      const csvContent = `${headers}\n${data}`;

      // Create a blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "users_list.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      setExportFormat(null);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleExportToPDF = () => {
    setIsExporting(true);
    setExportFormat("pdf");

    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow pop-ups to export PDF");
        setIsExporting(false);
        setExportFormat(null);
        return;
      }

      // Style the document
      printWindow.document.write(`
        <html>
          <head>
            <title>Users List</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
              }
              h1 {
                text-align: center;
                margin-bottom: 20px;
                color: #2563eb;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f8f9fa;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f2f2f2;
              }
              .subscription {
                padding: 5px 10px;
                border-radius: 20px;
                font-weight: 500;
                display: inline-block;
              }
              .active {
                background-color: rgba(76, 175, 80, 0.2);
                color: #4caf50;
              }
              .trial {
                background-color: rgba(255, 152, 0, 0.2);
                color: #ff9800;
              }
              .expired {
                background-color: rgba(244, 67, 54, 0.2);
                color: #f44336;
              }
              .unknown {
                background-color: rgba(158, 158, 158, 0.2);
                color: #9e9e9e;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 14px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <h1>Users List</h1>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Reference Number</th>
                  <th>Time Spent</th>
                  <th>Joined Date</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                ${filteredUsers
                  .map((user: User, index: number) => {
                    const statusClass = getSubscriptionStatusForPDF(
                      user.subscriptionStatus
                    );
                    return `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${user.name || ""}</td>
                      <td>${user.email || ""}</td>
                      <td><span class="subscription ${statusClass}">${
                      user.subscriptionStatus || "Unknown"
                    }</span></td>
                      <td>${user.referenceNumber || "N/A"}</td>
                      <td>${formatTimeSpent(user.timeSpent)}</td>
                      <td>${
                        user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"
                      }</td>
                      <td>${
                        user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : "N/A"
                      }</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
            <div class="footer">
              Generated on ${new Date().toLocaleString()} | Total Users: ${
        filteredUsers.length
      }
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for resources to load then print
      printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
          setIsExporting(false);
          setExportFormat(null);
        };
      };
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const getSubscriptionStatusForPDF = (status?: string) => {
    if (!status) return "unknown";

    switch (status.toLowerCase()) {
      case "active":
      case "paid":
        return "active";
      case "trial":
        return "trial";
      case "expired":
        return "expired";
      default:
        return "unknown";
    }
  };

  const handleExport = (format: "excel" | "pdf") => {
    if (format === "excel") {
      handleExportToExcel();
    } else {
      handleExportToPDF();
    }
    setExportDropdownOpen(false);
  };

  // Helper function to format time spent
  const formatTimeSpent = (minutes?: number): string => {
    if (!minutes) return "N/A";

    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes < 1440) {
      // less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else {
      // days
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    }
  };

  // Get CSS class based on time spent
  const getTimeSpentClass = (minutes?: number): string => {
    if (!minutes) return "";

    if (minutes < 60) {
      // Less than 1 hour
      return "time-spent-low";
    } else if (minutes < 300) {
      // 1-5 hours
      return "time-spent-medium";
    } else if (minutes < 1200) {
      // 5-20 hours
      return "time-spent-high";
    } else {
      // More than 20 hours
      return "time-spent-power";
    }
  };

  return (
    <div className="admin-users-container">
      <div className="admin-header">
        <h1>Users Management</h1>
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="subscription-filter">
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value)}
            >
              {SUBSCRIPTION_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
          <div className="export-dropdown" ref={exportDropdownRef}>
            <button
              className="export-btn"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              disabled={isExporting || filteredUsers.length === 0}
            >
              Export Data
            </button>
            {exportDropdownOpen && (
              <div className="export-dropdown-menu">
                <button
                  onClick={() => handleExport("excel")}
                  disabled={isExporting}
                >
                  Export as Excel/CSV
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={isExporting}
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading users...</div>
      ) : error ? (
        <div className="error-state">
          Error loading users. Please try again.
        </div>
      ) : (
        <>
          <div className="users-stats">
            <div className="stat-box">
              <h3>Total Users</h3>
              <p>{users.length}</p>
            </div>
            <div className="stat-box">
              <h3>Active Subscriptions</h3>
              <p>
                {
                  users.filter(
                    (user: User) =>
                      user.subscriptionStatus?.toLowerCase() === "active" ||
                      user.subscriptionStatus?.toLowerCase() === "paid"
                  ).length
                }
              </p>
            </div>
            <div className="stat-box">
              <h3>Trial Users</h3>
              <p>
                {
                  users.filter(
                    (user: User) =>
                      user.subscriptionStatus?.toLowerCase() === "trial"
                  ).length
                }
              </p>
            </div>
          </div>

          {filteredUsers.length > 0 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                Showing {Math.min(filteredUsers.length, 1 + indexOfFirstItem)}-
                {Math.min(indexOfLastItem, filteredUsers.length)} of{" "}
                {filteredUsers.length} users
              </div>
            </div>
          )}

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Reference Number</th>
                  <th>Time Spent</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map((user: User, index: number) => (
                    <tr key={user.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`subscription-status ${getSubscriptionStatusClass(
                            user.subscriptionStatus
                          )}`}
                        >
                          {user.subscriptionStatus || "Unknown"}
                        </span>
                      </td>
                      <td>{user.referenceNumber || "N/A"}</td>
                      <td className={getTimeSpentClass(user.timeSpent)}>
                        {formatTimeSpent(user.timeSpent)}
                      </td>
                      <td>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleViewUser(user.id)}
                        >
                          View
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditSubscription(user)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="no-users-message">
                      {searchTerm
                        ? "No users match your search."
                        : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &laquo;
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                &lsaquo;
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-btn ${
                      currentPage === pageNum ? "active" : ""
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                &rsaquo;
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                &raquo;
              </button>
              
              <div className="items-per-page-control">
                <span>Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  {PAGINATION_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          isOpen={isProfileModalOpen}
          onClose={handleCloseProfileModal}
        />
      )}

      {selectedUser && (
        <UserSubscriptionModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          userEmail={selectedUser.email}
          currentSubscription={selectedUser.subscriptionStatus}
          isOpen={isSubscriptionModalOpen}
          onClose={handleCloseSubscriptionModal}
          onSuccess={handleSubscriptionSuccess}
        />
      )}
    </div>
  );
};

export default UsersList;
