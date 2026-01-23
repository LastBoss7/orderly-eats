import { Category } from '../types';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useRef, useEffect } from 'react';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected category into view
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedCategory]);

  return (
    <div className="sticky top-[105px] z-40 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div 
        ref={scrollRef}
        className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All Products */}
        <Button
          ref={selectedCategory === null ? selectedRef : undefined}
          variant={selectedCategory === null ? 'default' : 'ghost'}
          size="sm"
          className={`flex-shrink-0 h-9 px-4 text-xs font-medium rounded-full transition-all ${
            selectedCategory === null 
              ? 'bg-foreground text-background hover:bg-foreground/90 shadow-sm' 
              : 'bg-muted/50 hover:bg-muted text-foreground'
          }`}
          onClick={() => onSelectCategory(null)}
        >
          Todos
        </Button>

        {/* Featured Button */}
        {hasFeatured && (
          <Button
            ref={selectedCategory === 'featured' ? selectedRef : undefined}
            variant={selectedCategory === 'featured' ? 'default' : 'ghost'}
            size="sm"
            className={`flex-shrink-0 h-9 px-4 text-xs font-medium rounded-full gap-1.5 transition-all ${
              selectedCategory === 'featured' 
                ? 'bg-foreground text-background hover:bg-foreground/90 shadow-sm' 
                : 'bg-muted/50 hover:bg-muted text-foreground'
            }`}
            onClick={() => onSelectCategory(selectedCategory === 'featured' ? null : 'featured')}
          >
            <Star className="w-3 h-3" />
            Destaques
          </Button>
        )}

        {/* Category Buttons */}
        {categories.map((category) => (
          <Button
            key={category.id}
            ref={selectedCategory === category.id ? selectedRef : undefined}
            variant={selectedCategory === category.id ? 'default' : 'ghost'}
            size="sm"
            className={`flex-shrink-0 h-9 px-4 text-xs font-medium rounded-full transition-all ${
              selectedCategory === category.id 
                ? 'bg-foreground text-background hover:bg-foreground/90 shadow-sm' 
                : 'bg-muted/50 hover:bg-muted text-foreground'
            }`}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.icon && <span className="mr-1">{category.icon}</span>}
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
