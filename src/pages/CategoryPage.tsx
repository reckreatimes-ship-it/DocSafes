import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { getCategoryById } from '@/lib/categories';
import { getDocumentsByCategory, Document } from '@/lib/storage';

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const category = categoryId ? getCategoryById(categoryId) : undefined;

  useEffect(() => {
    if (categoryId) {
      loadDocuments();
    }
  }, [categoryId]);

  const loadDocuments = async () => {
    if (!categoryId) return;
    
    try {
      const docs = await getDocumentsByCategory(categoryId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (doc: Document) => {
    navigate(`/document/${doc.id}`);
  };

  const handleShare = (doc: Document) => {
    navigate(`/share/${doc.id}`);
  };

  const handleDelete = async (doc: Document) => {
    console.log('Delete:', doc.id);
  };

  if (!category) {
    return (
      <Layout>
        <Header title="Catégorie" showBack />
        <EmptyState
          title="Catégorie introuvable"
          description="Cette catégorie n'existe pas."
        />
      </Layout>
    );
  }

  const Icon = category.icon;

  return (
    <Layout>
      <Header title={category.name} showBack />

      <div className="px-4 py-6 space-y-6">
        {/* Category header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{category.name}</h1>
            <p className="text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>

        {/* Documents */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={handleView}
                onShare={handleShare}
                onDelete={handleDelete}
                delay={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<div style={{ color: category.color }}><Icon className="w-10 h-10" /></div>}
            title="Aucun document"
            description={`Ajoutez votre premier document dans ${category.name}`}
            action={
              <Button onClick={() => navigate('/add')} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            }
          />
        )}
      </div>
    </Layout>
  );
}
