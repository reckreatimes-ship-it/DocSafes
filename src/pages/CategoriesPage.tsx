import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { CategoryCard } from '@/components/CategoryCard';
import { CategoryManager } from '@/components/CategoryManager';
import { Category, categories as defaultCategories } from '@/lib/categories';
import { getAllCategoriesWithSettings } from '@/lib/categorySettings';
import { getAllDocuments, Document } from '@/lib/storage';

export function CategoriesPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Array<Category & { hidden: boolean; originalName: string }>>([]);

  const loadData = useCallback(async () => {
    const [docs, cats] = await Promise.all([
      getAllDocuments(),
      getAllCategoriesWithSettings()
    ]);
    setDocuments(docs);
    // Filter out hidden categories for display
    setCategories(cats.filter(c => !c.hidden));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCategoryCount = (categoryId: string) => {
    return documents.filter(doc => doc.category === categoryId).length;
  };

  return (
    <Layout>
      <Header 
        title="Toutes les catégories" 
        showBack
        action={<CategoryManager onCategoriesChanged={loadData} />}
      />

      <div className="px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              count={getCategoryCount(category.id)}
              onClick={() => navigate(`/category/${category.id}`)}
              onUpdate={loadData}
              delay={index}
              originalName={category.originalName}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
}
