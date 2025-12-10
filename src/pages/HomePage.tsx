import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Shield, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { CategoryCard } from '@/components/CategoryCard';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { categories } from '@/lib/categories';
import { getAllDocuments, Document } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

export function HomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
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

  const getCategoryCount = (categoryId: string) => {
    return documents.filter(doc => doc.category === categoryId).length;
  };

  const recentDocuments = documents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleView = (doc: Document) => {
    navigate(`/document/${doc.id}`);
  };

  const handleShare = (doc: Document) => {
    navigate(`/share/${doc.id}`);
  };

  const handleDelete = async (doc: Document) => {
    // Will implement confirmation dialog
    console.log('Delete:', doc.id);
  };

  return (
    <Layout>
      <Header 
        title="DocWallet" 
        showLogo
        action={
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Lock className="w-5 h-5 text-muted-foreground" />
          </button>
        }
      />

      <div className="px-4 py-6 space-y-8">
        {/* Security Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl p-5 text-primary-foreground"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-1">Stockage 100% local</h2>
              <p className="text-sm opacity-90">
                Vos documents sont chiffrés et stockés uniquement sur votre appareil. Aucune donnée n'est envoyée vers le cloud.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Catégories</h2>
            <span className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.slice(0, 6).map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                count={getCategoryCount(category.id)}
                onClick={() => navigate(`/category/${category.id}`)}
                delay={index}
              />
            ))}
          </div>

          <button
            onClick={() => navigate('/categories')}
            className="w-full mt-3 py-3 text-sm text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors"
          >
            Voir toutes les catégories
          </button>
        </section>

        {/* Recent Documents */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Documents récents</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentDocuments.length > 0 ? (
            <div className="space-y-3">
              {recentDocuments.map((doc, index) => (
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
              title="Aucun document"
              description="Commencez par ajouter votre premier document en toute sécurité."
              action={
                <Button onClick={() => navigate('/add')} className="gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un document
                </Button>
              }
            />
          )}
        </section>
      </div>
    </Layout>
  );
}
