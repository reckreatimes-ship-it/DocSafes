import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search as SearchIcon, 
  X, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Star,
  Calendar,
  FileText,
  Tag,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Header } from '@/components/Header';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { getAllDocuments, Document } from '@/lib/storage';
import { categories, getCategoryById } from '@/lib/categories';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
type FilterType = 'all' | 'pdf' | 'image' | 'favorites';

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

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

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach(doc => {
      doc.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [documents]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];
    
    // Text search
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(doc =>
        doc.name.toLowerCase().includes(lowerQuery) ||
        doc.category.toLowerCase().includes(lowerQuery) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Type filter
    if (filterType === 'pdf') {
      result = result.filter(doc => doc.type === 'pdf');
    } else if (filterType === 'image') {
      result = result.filter(doc => doc.type === 'image');
    } else if (filterType === 'favorites') {
      result = result.filter(doc => doc.isFavorite);
    }
    
    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(doc => doc.category === filterCategory);
    }
    
    // Tag filter
    if (filterTag) {
      result = result.filter(doc => doc.tags?.includes(filterTag));
    }
    
    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'date-asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        default:
          return 0;
      }
    });
    
    return result;
  }, [query, documents, filterType, filterCategory, filterTag, sortBy]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterTag) count++;
    return count;
  }, [filterType, filterCategory, filterTag]);

  const clearFilters = () => {
    setFilterType('all');
    setFilterCategory('all');
    setFilterTag('');
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

  return (
    <Layout>
      <Header title="Recherche" />

      <div className="px-4 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
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

        {/* Filter and Sort Bar */}
        <div className="flex gap-2 flex-wrap">
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Effacer tout
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                {/* Type filter */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Type de document
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'Tous', icon: FileText },
                      { value: 'pdf', label: 'PDF', icon: FileText },
                      { value: 'image', label: 'Images', icon: FileText },
                      { value: 'favorites', label: 'Favoris', icon: Star }
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={filterType === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterType(value as FilterType)}
                        className="gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Category filter */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Catégorie
                  </label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tag filter */}
                {allTags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={filterTag === tag ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-auto h-9 gap-2">
              {sortBy.includes('desc') ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Plus récent</SelectItem>
              <SelectItem value="date-asc">Plus ancien</SelectItem>
              <SelectItem value="name-asc">Nom A-Z</SelectItem>
              <SelectItem value="name-desc">Nom Z-A</SelectItem>
              <SelectItem value="size-desc">Taille ↓</SelectItem>
              <SelectItem value="size-asc">Taille ↑</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filters badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterType !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {filterType === 'favorites' ? 'Favoris' : filterType.toUpperCase()}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterType('all')} />
              </Badge>
            )}
            {filterCategory !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {getCategoryById(filterCategory)?.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCategory('all')} />
              </Badge>
            )}
            {filterTag && (
              <Badge variant="secondary" className="gap-1">
                {filterTag}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterTag('')} />
              </Badge>
            )}
          </div>
        )}

        {/* Results */}
        {!query.trim() && activeFiltersCount === 0 ? (
          <EmptyState
            icon={<SearchIcon className="w-10 h-10 text-muted-foreground" />}
            title="Recherche avancée"
            description="Tapez pour rechercher ou utilisez les filtres pour trouver vos documents."
          />
        ) : filteredDocuments.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground">
              {filteredDocuments.length} résultat{filteredDocuments.length !== 1 ? 's' : ''}
            </p>
            <AnimatePresence mode="popLayout">
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
            </AnimatePresence>
          </motion.div>
        ) : (
          <EmptyState
            title="Aucun résultat"
            description={query ? `Aucun document ne correspond à "${query}"` : 'Aucun document avec ces filtres'}
          />
        )}
      </div>
    </Layout>
  );
}
