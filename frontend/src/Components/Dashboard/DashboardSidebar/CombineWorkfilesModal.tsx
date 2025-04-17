import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './DashboardSidebar.scss';

interface WorkFile {
  name: string;
  patentIds: string[];
  timestamp: number;
  isCombined?: boolean;
}

interface CombineWorkfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkFiles: WorkFile[];
  onCombine: (uniquePatentIds: string[], duplicateIds: string[], invalidIds: string[]) => void;
}

const CombineWorkfilesModal: React.FC<CombineWorkfilesModalProps> = ({
  isOpen,
  onClose,
  selectedWorkFiles,
  onCombine
}) => {
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [invalidPatentIds, setInvalidPatentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validPatentsByFamily, setValidPatentsByFamily] = useState<Map<string, string[]>>(new Map());
  const [finalPatentIds, setFinalPatentIds] = useState<string[]>([]);

  // Default patent authority preference with US first
  const preferredPatentAuthorities = ['US', 'WO', 'EP', 'GB', 'FR', 'DE', 'CH', 'JP', 'RU', 'SU'];

  useEffect(() => {
    if (isOpen) {
      validatePatentIds();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const getPatentPriority = (country: string): number => {
    const index = preferredPatentAuthorities.indexOf(country.toUpperCase());
    return index === -1 ? preferredPatentAuthorities.length : index;
  };

  const selectPreferredPatentFromFamily = (familyPatents: any[]): string => {
    // Sort patents by authority preference
    const sortedPatents = [...familyPatents].sort((a, b) => {
      const countryA = (a._source.country || '').toUpperCase();
      const countryB = (b._source.country || '').toUpperCase();
      return getPatentPriority(countryA) - getPatentPriority(countryB);
    });

    // Return the publication number of the highest priority patent
    return sortedPatents[0]._source.publication_number || sortedPatents[0]._id;
  };

  const validatePatentIds = async () => {
    setIsLoading(true);
    setError(null);
    const { uniqueIds } = processPatentIds();
    
    try {
      const response = await fetch('https://api.unifiedpatents.com/patents/v6/_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            terms: {
              patent_id: Array.from(uniqueIds)
            }
          },
          size: uniqueIds.size
        })
      });

      if (!response.ok) {
        throw new Error('Failed to validate patent IDs');
      }

      const data = await response.json();
      
      // Get all valid patent IDs from the response
      const validHits = data.hits.hits;
      const validPatentIds = new Set(validHits.map((hit: any) => hit._source.patent_id));
      
      // Find invalid patent IDs (those not found in the API response)
      const invalidIds = Array.from(uniqueIds).filter(id => !validPatentIds.has(id));
      setInvalidPatentIds(invalidIds);

      // Group patents by family_id
      const familyGroups = new Map<string, any[]>();
      validHits.forEach((hit: any) => {
        const familyId = hit._source.family_id;
        if (familyId) {
          if (!familyGroups.has(familyId)) {
            familyGroups.set(familyId, []);
          }
          familyGroups.get(familyId)?.push(hit);
        }
      });

      // Select preferred patent from each family
      const selectedPatents: string[] = [];
      familyGroups.forEach((patents, familyId) => {
        const preferredPatent = selectPreferredPatentFromFamily(patents);
        selectedPatents.push(preferredPatent);
      });

      // Add any valid patents that don't have a family_id
      validHits
        .filter((hit: any) => !hit._source.family_id)
        .forEach((hit: any) => {
          selectedPatents.push(hit._source.publication_number || hit._id);
        });

      setValidPatentsByFamily(familyGroups);
      setFinalPatentIds(selectedPatents);

      console.log('Invalid/Not found patent IDs:', invalidIds);
      console.log('Valid patents by family:', familyGroups);
      console.log('Final selected patents:', selectedPatents);

    } catch (error) {
      console.error('Error validating patent IDs:', error);
      setError('Failed to validate patent IDs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processPatentIds = () => {
    const allPatentIds = selectedWorkFiles.flatMap(workFile => workFile.patentIds);
    const uniqueIds = new Set<string>();
    const duplicates = new Set<string>();

    allPatentIds.forEach(id => {
      if (uniqueIds.has(id)) {
        duplicates.add(id);
      } else {
        uniqueIds.add(id);
      }
    });

    setDuplicateIds(Array.from(duplicates));
    return {
      uniqueIds,
      duplicateIds: Array.from(duplicates)
    };
  };

  const handleCombine = () => {
    onCombine(finalPatentIds, duplicateIds, invalidPatentIds);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="combine-workfiles-modal-overlay">
      <div className="combine-workfiles-modal fullscreen">
        <div className="modal-header">
          <h2>Combine Selected Workfiles</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="selected-files-info">
            <h3>Selected Workfiles ({selectedWorkFiles.length})</h3>
            <ul>
              {selectedWorkFiles.map((workFile, index) => (
                <li key={index}>
                  <span className="workfile-name">{workFile.name}</span>
                  <span className="patent-count">({workFile.patentIds.length} patents)</span>
                </li>
              ))}
            </ul>
          </div>

          {isLoading ? (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Validating patent IDs and checking families...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {duplicateIds.length > 0 && (
                <div className="duplicates-warning">
                  <h3>Duplicate Patent IDs Found</h3>
                  <p>The following patent IDs appear in multiple workfiles and will be included only once:</p>
                  <ul>
                    {duplicateIds.map((id, index) => (
                      <li key={index}>{id}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validPatentsByFamily.size > 0 && (
                <div className="family-info">
                  <h3>Patent Families</h3>
                  <p>Patents have been grouped by family. One patent per family will be selected (preferring US patents when available).</p>
                  <div className="family-list">
                    {Array.from(validPatentsByFamily).map(([familyId, patents], index) => (
                      <div key={index} className="family-group">
                        <div className="family-header">Family {familyId}</div>
                        <div className="family-patents">
                          {patents.map((patent: any, pIndex: number) => (
                            <div 
                              key={pIndex} 
                              className={`family-patent ${patent._source.publication_number === finalPatentIds.find(id => patents.some(p => p._source.publication_number === id)) ? 'selected' : ''}`}
                            >
                              {patent._source.publication_number}
                              {patent._source.country === 'US' && <span className="us-badge">US</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invalidPatentIds.length > 0 && (
                <div className="not-found-warning">
                  <h3>Invalid Patent IDs Found</h3>
                  <p>The following patent IDs are not valid and will be excluded:</p>
                  <ul>
                    {invalidPatentIds.map((id, index) => (
                      <li key={index}>{id}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="final-patents">
                <h3>Final Patent Selection ({finalPatentIds.length})</h3>
                <p>These patents will be included in the combined workfile:</p>
                <ul>
                  {finalPatentIds.map((id, index) => (
                    <li key={index}>{id}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button 
              className="combine-button" 
              onClick={handleCombine} 
              disabled={isLoading || !!error || finalPatentIds.length === 0}
            >
              Combine Workfiles
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CombineWorkfilesModal; 