import { getSetting, saveSetting } from '@/lib/storage';
import { categories as defaultCategories, Category } from '@/lib/categories';

export interface CustomCategorySettings {
  id: string;
  customName?: string;
  customIcon?: string;
  customColor?: string;
  hidden?: boolean;
  order?: number;
}

export interface CategorySettingsMap {
  [categoryId: string]: CustomCategorySettings;
}

const CATEGORY_SETTINGS_KEY = 'categorySettings';
const CATEGORY_ORDER_KEY = 'categoryOrder';

export async function getCategorySettings(): Promise<CategorySettingsMap> {
  const settings = await getSetting(CATEGORY_SETTINGS_KEY);
  if (settings) {
    try {
      return JSON.parse(settings);
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveCategorySettings(settings: CategorySettingsMap): Promise<void> {
  await saveSetting(CATEGORY_SETTINGS_KEY, JSON.stringify(settings));
}

export async function getCategoryOrder(): Promise<string[]> {
  const order = await getSetting(CATEGORY_ORDER_KEY);
  if (order) {
    try {
      return JSON.parse(order);
    } catch {
      return defaultCategories.map(c => c.id);
    }
  }
  return defaultCategories.map(c => c.id);
}

export async function saveCategoryOrder(order: string[]): Promise<void> {
  await saveSetting(CATEGORY_ORDER_KEY, JSON.stringify(order));
}

export async function updateCategorySettings(
  categoryId: string,
  updates: Partial<CustomCategorySettings>
): Promise<void> {
  const settings = await getCategorySettings();
  settings[categoryId] = {
    ...settings[categoryId],
    id: categoryId,
    ...updates
  };
  await saveCategorySettings(settings);
}

export async function resetCategoryToDefault(categoryId: string): Promise<void> {
  const settings = await getCategorySettings();
  delete settings[categoryId];
  await saveCategorySettings(settings);
}

export async function getEnhancedCategories(): Promise<Category[]> {
  const settings = await getCategorySettings();
  const order = await getCategoryOrder();
  
  // Create enhanced categories with custom settings
  const enhancedMap = new Map<string, Category>();
  
  for (const cat of defaultCategories) {
    const customSettings = settings[cat.id];
    enhancedMap.set(cat.id, {
      ...cat,
      name: customSettings?.customName || cat.name,
      color: customSettings?.customColor || cat.color,
    });
  }
  
  // Sort by custom order
  const orderedCategories: Category[] = [];
  for (const id of order) {
    const cat = enhancedMap.get(id);
    if (cat) {
      const customSettings = settings[id];
      if (!customSettings?.hidden) {
        orderedCategories.push(cat);
      }
    }
  }
  
  // Add any categories not in order (new ones)
  for (const cat of defaultCategories) {
    if (!order.includes(cat.id)) {
      const customSettings = settings[cat.id];
      if (!customSettings?.hidden) {
        orderedCategories.push(enhancedMap.get(cat.id)!);
      }
    }
  }
  
  return orderedCategories;
}

export async function getVisibleCategories(): Promise<Category[]> {
  return getEnhancedCategories();
}

export async function getAllCategoriesWithSettings(): Promise<Array<Category & { hidden: boolean; originalName: string }>> {
  const settings = await getCategorySettings();
  const order = await getCategoryOrder();
  
  const result: Array<Category & { hidden: boolean; originalName: string }> = [];
  
  // Process in order
  for (const id of order) {
    const defaultCat = defaultCategories.find(c => c.id === id);
    if (defaultCat) {
      const customSettings = settings[id];
      result.push({
        ...defaultCat,
        name: customSettings?.customName || defaultCat.name,
        color: customSettings?.customColor || defaultCat.color,
        hidden: customSettings?.hidden || false,
        originalName: defaultCat.name
      });
    }
  }
  
  // Add missing categories
  for (const cat of defaultCategories) {
    if (!order.includes(cat.id)) {
      const customSettings = settings[cat.id];
      result.push({
        ...cat,
        name: customSettings?.customName || cat.name,
        color: customSettings?.customColor || cat.color,
        hidden: customSettings?.hidden || false,
        originalName: cat.name
      });
    }
  }
  
  return result;
}
