import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { CategoryCard } from '@/components/CategoryCard';
import { categories } from '@/lib/categories';
import { getAllDocuments, Document } from '@/lib/storage';

export function CategoriesPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await getAllDocuments();
    setDocuments(docs);
  };

  const getCategoryCount = (categoryId: string) => {
    return documents.filter(doc => doc.category === categoryId).length;
  };

  return (
    <Layout>
      <Header title="Toutes les catégories" showBack />

      <div className="px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              count={getCategoryCount(category.id)}
              onClick={() => navigate(`/category/${category.id}`)}
              delay={index}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}
