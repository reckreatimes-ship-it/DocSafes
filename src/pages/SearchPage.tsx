import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { getAllDocuments, Document } from '@/lib/storage';

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return documents.filter(doc =>
      doc.name.toLowerCase().includes(lowerQuery) ||
      doc.category.toLowerCase().includes(lowerQuery) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }, [query, documents]);

  const handleView = (doc: Document) => {
    navigate(`/document/${doc.id}`);
  };

  const handleShare = (doc: Document) => {
    navigate(`/share/${doc.id}`);
  };

  const handleDelete = async (doc: Document) => {
    console.log('Delete:', doc.id);
  };

  return (
    <Layout>
      <Header title="Recherche" />

      <div className="px-4 py-4">
        {/* Search Input */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un document..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-10 h-12 bg-secondary border-0 rounded-xl text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results */}
        {!query.trim() ? (
          <EmptyState
            icon={<SearchIcon className="w-10 h-10 text-muted-foreground" />}
            title="Recherche instantanée"
            description="Tapez pour rechercher parmi vos documents, par nom, catégorie ou tags."
          />
        ) : filteredDocuments.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground mb-4">
              {filteredDocuments.length} résultat{filteredDocuments.length !== 1 ? 's' : ''}
            </p>
            {filteredDocuments.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={handleView}
                onShare={handleShare}
                onDelete={handleDelete}
                delay={index}
              />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            title="Aucun résultat"
            description={`Aucun document ne correspond à "${query}"`}
          />
        )}
      </div>
    </Layout>
  );
}
