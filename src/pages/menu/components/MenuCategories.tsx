import { Category } from '../types';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Sparkles } from 'lucide-react';

interface MenuCategoriesProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  hasFeatured: boolean;
}

export function MenuCategories({
  categories,
  selectedCategory,
  onSelectCategory,
  hasFeatured,
}: MenuCategoriesProps) {
  return (
    <div className="sticky top-[56px] sm:top-16 z-40 bg-background/95 backdrop-blur-md border-b py-2 sm:py-3">
      <div className="container mx-auto px-3 sm:px-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 sm:gap-2">
            {/* Featured Button */}
            {hasFeatured && (
              <Button
                variant={selectedCategory === 'featured' ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0 gap-1 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm"
                onClick={() => onSelectCategory(selectedCategory === 'featured' ? null : 'featured')}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Destaques
              </Button>
            )}

            {/* All Products */}
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm"
              onClick={() => onSelectCategory(null)}
            >
              Todos
            </Button>

            {/* Category Buttons */}
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm"
                onClick={() => onSelectCategory(category.id)}
              >
                {category.icon && <span className="mr-1">{category.icon}</span>}
                {category.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
