export type ApiSource = 'serpapi' | 'unified';

export interface PatentSummary {
  patentId: string;
  title?: string;
  abstract?: string;
  status: 'loading' | 'success' | 'error';
  error?: string;
  initialFetch?: boolean;
  details?: {
    assignee_current?: string[];
    priority_date?: string;
    publication_date?: string;
    description?: string;
    claims?: any[];
    figures?: any[];
    family_members?: any[];
    grant_number?: string;
    expiration_date?: string;
    type?: string;
    num_cit_pat?: number;
  };
}

// Type for the window global
declare global {
  interface Window {
    patentSearchPopulateCallback?: (patentId: string) => void;
  }
} 