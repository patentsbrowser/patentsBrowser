import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchFullPatentDetails } from '../features/patents/patentsSlice';

const PatentDetails: React.FC<PatentDetailsProps> = ({ patentId, onClose }) => {
  const dispatch = useAppDispatch();
  const { selectedPatent, loading, error } = useAppSelector((state) => state.patents);
  const [activeTab, setActiveTab] = useState('description');
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
  const [selectedFigure, setSelectedFigure] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (patentId) {
      dispatch(fetchFullPatentDetails({ patentId, apiType: 'unified' }));
    }
  }, [dispatch, patentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Patent Details</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <p className="mt-2">Please try again later or contact support if the problem persists.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedPatent) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No Patent Data Available</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Unable to load patent details. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasFigures = selectedPatent.figures && selectedPatent.figures.length > 0;

  return (
    <div className="patent-details">
      <div className="patent-header">
        <h2 className="text-xl font-bold">{selectedPatent.title || 'No Title Available'}</h2>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="patent-tabs">
        <button
          className={`tab ${activeTab === 'description' ? 'active' : ''}`}
          onClick={() => setActiveTab('description')}
        >
          Description
        </button>
        <button
          className={`tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Claims
        </button>
        {hasFigures && (
          <button
            className={`tab ${activeTab === 'figures' ? 'active' : ''}`}
            onClick={() => setActiveTab('figures')}
          >
            Figures
          </button>
        )}
      </div>

      <div className="patent-content">
        {activeTab === 'description' && (
          <div className="description-section">
            <h3 className="section-title">Abstract</h3>
            <p className="abstract">{selectedPatent.abstract || 'No abstract available'}</p>
            <h3 className="section-title">Description</h3>
            <div className="description-text">{selectedPatent.description || 'No description available'}</div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="claims-section">
            {selectedPatent.claims.map((claim, index) => (
              <div key={index} className="claim-item">
                <button
                  className="claim-header"
                  onClick={() => {
                    const newExpanded = new Set(expandedClaims);
                    if (expandedClaims.has(claim.ucid)) {
                      newExpanded.delete(claim.ucid);
                    } else {
                      newExpanded.add(claim.ucid);
                    }
                    setExpandedClaims(newExpanded);
                  }}
                >
                  <span className="claim-number">Claim {index + 1}</span>
                  <span className="expand-icon">
                    {expandedClaims.has(claim.ucid) ? '▼' : '▶'}
                  </span>
                </button>
                {expandedClaims.has(claim.ucid) && (
                  <div className="claim-content">{claim.text}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'figures' && hasFigures && (
          <div className="figures-section">
            {selectedPatent.figures.map((figure, index) => (
              <div key={index} className="figure-item">
                <img
                  src={figure.url}
                  alt={`Figure ${index + 1}`}
                  className="figure-image"
                  onClick={() => {
                    setSelectedFigure(figure.url);
                    setIsModalOpen(true);
                  }}
                />
                <p className="figure-caption">{figure.caption || `Figure ${index + 1}`}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'figures' && !hasFigures && (
          <div className="no-figures-message">
            <p>No figures available for this patent.</p>
          </div>
        )}
      </div>

      {isModalOpen && selectedFigure && (
        <div className="figure-modal">
          <div className="modal-content">
            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
            <img src={selectedFigure} alt="Selected Figure" className="modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PatentDetails; 