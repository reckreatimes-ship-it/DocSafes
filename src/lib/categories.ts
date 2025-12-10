import { 
  CreditCard, 
  Plane, 
  Car, 
  Receipt, 
  FileText, 
  GraduationCap, 
  Building2, 
  FolderOpen,
  Zap,
  Droplets,
  Wifi,
  Flame
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

export const categories: Category[] = [
  {
    id: 'identity',
    name: "Carte d'identité",
    icon: CreditCard,
    color: 'hsl(168 76% 36%)',
    description: 'CNI, pièces d\'identité'
  },
  {
    id: 'passport',
    name: 'Passeport',
    icon: Plane,
    color: 'hsl(220 70% 50%)',
    description: 'Passeports, visas'
  },
  {
    id: 'driving',
    name: 'Permis de conduire',
    icon: Car,
    color: 'hsl(280 65% 50%)',
    description: 'Permis, cartes grises'
  },
  {
    id: 'taxes',
    name: 'Impôts',
    icon: Receipt,
    color: 'hsl(35 90% 50%)',
    description: 'Avis d\'imposition, déclarations'
  },
  {
    id: 'electricity',
    name: 'Électricité',
    icon: Zap,
    color: 'hsl(45 95% 50%)',
    description: 'Factures EDF, Engie'
  },
  {
    id: 'gas',
    name: 'Gaz',
    icon: Flame,
    color: 'hsl(15 85% 55%)',
    description: 'Factures de gaz'
  },
  {
    id: 'water',
    name: 'Eau',
    icon: Droplets,
    color: 'hsl(200 80% 50%)',
    description: 'Factures d\'eau'
  },
  {
    id: 'internet',
    name: 'Internet',
    icon: Wifi,
    color: 'hsl(260 70% 55%)',
    description: 'Box, mobile, forfaits'
  },
  {
    id: 'cv',
    name: 'CV',
    icon: FileText,
    color: 'hsl(340 65% 50%)',
    description: 'Curriculum vitae'
  },
  {
    id: 'diplomas',
    name: 'Diplômes',
    icon: GraduationCap,
    color: 'hsl(142 70% 40%)',
    description: 'Diplômes, certificats'
  },
  {
    id: 'banking',
    name: 'Documents bancaires',
    icon: Building2,
    color: 'hsl(200 60% 45%)',
    description: 'Relevés, contrats, RIB'
  },
  {
    id: 'other',
    name: 'Autres documents',
    icon: FolderOpen,
    color: 'hsl(215 20% 50%)',
    description: 'Documents divers'
  }
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find(cat => cat.id === id);
}

export function getCategoryIcon(categoryId: string) {
  const category = getCategoryById(categoryId);
  return category?.icon || FolderOpen;
}

export function getCategoryColor(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.color || 'hsl(215 20% 50%)';
}
