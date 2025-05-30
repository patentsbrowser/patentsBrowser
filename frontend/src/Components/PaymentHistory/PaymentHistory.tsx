import React, { useState, useEffect } from "react";
import { getUserPaymentHistory } from "../../services/SubscriptionService";
import "./PaymentHistory.scss";
import Loader from "../Common/Loader";

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  planName: string;
  planDuration: string;
  referenceNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  transactionDate: string;
  orderId: string;
  adminMessage?: string;
  parentSubscriptionId?: string; // Added to track stacked plans
  isStacked?: boolean; // Added to identify stacked plans
}

const PaymentHistory: React.FC = () => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getUserPaymentHistory();

      if (response.success) {
        setPaymentHistory(response.data || []);
      } else {
        setError("Failed to load payment history");
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setError("Error loading payment history. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "status-active";
      case "payment_pending":
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  const getDisplayStatus = (status: string) => {
    const statusText = (() => {
      switch (status.toLowerCase()) {
        case "active":
          return "Active";
        case "payment_pending":
        case "pending":
          return "Approval Pending";
        case "rejected":
          return "Rejected";
        case "cancelled":
          return "Cancelled";
        case "paid":
          return "Paid";
        case "inactive":
          return "Inactive";
        case "trial":
          return "Trial";
        default:
          return status.charAt(0).toUpperCase() + status.slice(1);
      }
    })();

    return <span className="status-badge">{statusText}</span>;
  };

  // Helper to determine if a plan is stacked
  const isStackedPlan = (payment: PaymentHistoryItem): boolean => {
    return !!payment.parentSubscriptionId || !!payment.isStacked;
  };

  // Open message modal
  const openMessageModal = (message: string) => {
    setModalMessage(message);
    setShowModal(true);
  };

  // Close message modal
  const closeMessageModal = () => {
    setShowModal(false);
    setModalMessage("");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = paymentHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(paymentHistory.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    // Function to generate page numbers with ellipsis for large numbers of pages
    const getPageNumbers = () => {
      let pages = [];
      const maxPagesToShow = 5;

      if (totalPages <= maxPagesToShow) {
        // If we have 5 or fewer pages, show all of them
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Always show first page
        pages.push(1);

        // Calculate start and end of current window
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        // Adjust window to always show 3 pages when possible
        if (currentPage <= 2) {
          end = 3;
        } else if (currentPage >= totalPages - 1) {
          start = totalPages - 2;
        }

        // Add ellipsis before current window if needed
        if (start > 2) {
          pages.push("...");
        }

        // Add pages in current window
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        // Add ellipsis after current window if needed
        if (end < totalPages - 1) {
          pages.push("...");
        }

        // Always show last page
        pages.push(totalPages);
      }

      return pages;
    };

    return (
      <div className="pagination">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-button"
        >
          &laquo; Prev
        </button>

        <div className="page-numbers">
          {getPageNumbers().map((number, index) =>
            typeof number === "number" ? (
              <button
                key={index}
                onClick={() => paginate(number)}
                className={`page-number ${
                  currentPage === number ? "active" : ""
                }`}
              >
                {number}
              </button>
            ) : (
              <span key={index} className="ellipsis">
                ...
              </span>
            )
          )}
        </div>

        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-button"
        >
          Next &raquo;
        </button>
      </div>
    );
  };

  return (
    <div className="payment-history-page">
      <div className="payment-history-container">
        <div className="payment-history-header">
          <h2>Payment History</h2>
        </div>

        {isLoading ? (
          <Loader fullScreen={true} text="Loading payment history..." />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : paymentHistory.length === 0 ? (
          <div className="empty-state">
            <div className="book-icon">
              <div className="book-cover">
                <div className="book-page"></div>
                <div className="book-page"></div>
                <div className="book-page"></div>
              </div>
            </div>
            <h3>No Payment Records Found</h3>
            <p>
              Your payment history is currently empty. Any payments you make
              will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="payment-list">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Sr No</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Admin Message</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems?.map((payment, index) => (
                    <tr
                      key={payment.id}
                      className={
                        isStackedPlan(payment) ? "stacked-plan-row" : ""
                      }
                    >
                      <td className="sr-no">{indexOfFirstItem + index + 1}</td>
                      <td className="plan-info">
                        <span className="plan-name">
                          {payment.planName}
                          {/* {isStackedPlan(payment) && <span className="stacked-badge">Stacked</span>} */}
                        </span>
                      </td>
                      <td className="amount">
                        {payment.currency} {payment.amount}
                      </td>
                      <td className="reference-number">
                        {payment.referenceNumber}
                      </td>
                      <td className="transaction-date">
                        {formatDate(payment.transactionDate)}
                      </td>
                      <td className="end-date">
                        {payment.status.toLowerCase() === "rejected"
                          ? "-"
                          : formatDate(payment.endDate)}
                      </td>
                      <td
                        className={`status ${getStatusClass(payment.status)}`}
                      >
                        {getDisplayStatus(payment.status)}
                      </td>
                      <td className="admin-message">
                        {payment.adminMessage ? (
                          <button
                            className="message-button"
                            onClick={() =>
                              openMessageModal(payment.adminMessage || "")
                            }
                          >
                            <span className="message-icon">ℹ️</span>
                          </button>
                        ) : (
                          <span className="no-message">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </>
        )}
      </div>

      {/* Admin Message Modal - Moved outside the container to avoid rendering issues */}
      {showModal && (
        <div
          className="admin-message-modal-overlay"
          onClick={closeMessageModal}
        >
          <div
            className="admin-message-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Admin Message</h3>
              <button className="close-button" onClick={closeMessageModal}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>{modalMessage}</p>
            </div>
            <div className="modal-footer">
              <button className="confirm-button" onClick={closeMessageModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
