import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SmartSearchDB extends DBSchema {
  'smart-search-results': {
    key: string;
    value: {
      results: any;
      timestamp: number;
    };
  };
}

class IndexedDBService {
  private db: Promise<IDBPDatabase<SmartSearchDB>>;

  constructor() {
    this.db = openDB<SmartSearchDB>('patents-browser', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('smart-search-results')) {
          db.createObjectStore('smart-search-results');
        }
      },
    });
  }

  async saveSmartSearchResults(key: string, results: any) {
    const db = await this.db;
    await db.put('smart-search-results', {
      results,
      timestamp: Date.now()
    }, key);
  }

  async getSmartSearchResults(key: string) {
    const db = await this.db;
    const data = await db.get('smart-search-results', key);
    return data?.results;
  }

  async clearSmartSearchResults(key: string) {
    const db = await this.db;
    await db.delete('smart-search-results', key);
  }

  async clearAllSmartSearchResults() {
    const db = await this.db;
    await db.clear('smart-search-results');
  }
}

export const indexedDBService = new IndexedDBService(); 