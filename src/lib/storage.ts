import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Document {
  id: string;
  name: string;
  category: string;
  type: 'pdf' | 'image';
  mimeType: string;
  size: number;
  encryptedData: string;
  iv: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: Date;
}

export interface Settings {
  key: string;
  value: string;
}

interface DocWalletDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: {
      'by-category': string;
      'by-folder': string;
      'by-date': Date;
    };
  };
  folders: {
    key: string;
    value: Folder;
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let db: IDBPDatabase<DocWalletDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<DocWalletDB>> {
  if (db) return db;
  
  db = await openDB<DocWalletDB>('docwallet', 1, {
    upgrade(database) {
      // Documents store
      const docStore = database.createObjectStore('documents', { keyPath: 'id' });
      docStore.createIndex('by-category', 'category');
      docStore.createIndex('by-folder', 'folderId');
      docStore.createIndex('by-date', 'createdAt');
      
      // Folders store
      database.createObjectStore('folders', { keyPath: 'id' });
      
      // Settings store
      database.createObjectStore('settings', { keyPath: 'key' });
    },
  });
  
  return db;
}

// Document operations
export async function saveDocument(doc: Document): Promise<void> {
  const database = await initDB();
  await database.put('documents', doc);
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const database = await initDB();
  return await database.get('documents', id);
}

export async function getAllDocuments(): Promise<Document[]> {
  const database = await initDB();
  return await database.getAll('documents');
}

export async function getDocumentsByCategory(category: string): Promise<Document[]> {
  const database = await initDB();
  return await database.getAllFromIndex('documents', 'by-category', category);
}

export async function getDocumentsByFolder(folderId: string): Promise<Document[]> {
  const database = await initDB();
  return await database.getAllFromIndex('documents', 'by-folder', folderId);
}

export async function deleteDocument(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('documents', id);
}

export async function searchDocuments(query: string): Promise<Document[]> {
  const all = await getAllDocuments();
  const lowerQuery = query.toLowerCase();
  return all.filter(doc => 
    doc.name.toLowerCase().includes(lowerQuery) ||
    doc.category.toLowerCase().includes(lowerQuery) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Folder operations
export async function saveFolder(folder: Folder): Promise<void> {
  const database = await initDB();
  await database.put('folders', folder);
}

export async function getAllFolders(): Promise<Folder[]> {
  const database = await initDB();
  return await database.getAll('folders');
}

export async function deleteFolder(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('folders', id);
}

// Settings operations
export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await initDB();
  await database.put('settings', { key, value });
}

export async function getSetting(key: string): Promise<string | undefined> {
  const database = await initDB();
  const setting = await database.get('settings', key);
  return setting?.value;
}

// Wipe all data
export async function wipeAllData(): Promise<void> {
  const database = await initDB();
  await database.clear('documents');
  await database.clear('folders');
  await database.clear('settings');
}

// Get storage stats
export async function getStorageStats(): Promise<{ count: number; totalSize: number }> {
  const docs = await getAllDocuments();
  return {
    count: docs.length,
    totalSize: docs.reduce((sum, doc) => sum + doc.size, 0)
  };
}
