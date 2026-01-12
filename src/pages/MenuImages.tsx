import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  Upload, 
  Search, 
  Trash2, 
  Download, 
  Grid3X3, 
  List,
  Filter,
  MoreVertical,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data for demonstration
const mockImages = [
  { id: '1', name: 'pizza-margherita.jpg', url: '/placeholder.svg', category: 'Pizzas', size: '245 KB', date: '2024-01-10' },
  { id: '2', name: 'hamburguer-classic.jpg', url: '/placeholder.svg', category: 'Hambúrgueres', size: '312 KB', date: '2024-01-09' },
  { id: '3', name: 'salada-caesar.jpg', url: '/placeholder.svg', category: 'Saladas', size: '189 KB', date: '2024-01-08' },
  { id: '4', name: 'refrigerante.jpg', url: '/placeholder.svg', category: 'Bebidas', size: '156 KB', date: '2024-01-07' },
  { id: '5', name: 'sobremesa-chocolate.jpg', url: '/placeholder.svg', category: 'Sobremesas', size: '278 KB', date: '2024-01-06' },
  { id: '6', name: 'entrada-bruschetta.jpg', url: '/placeholder.svg', category: 'Entradas', size: '201 KB', date: '2024-01-05' },
];

export default function MenuImages() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const filteredImages = mockImages.filter(img => 
    img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isSelected = (id: string) => selectedImages.includes(id);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Imagens do Cardápio</h1>
            <p className="text-muted-foreground">Gerencie as imagens dos seus produtos</p>
          </div>
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Fazer Upload
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Imagens</CardDescription>
              <CardTitle className="text-2xl">{mockImages.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Espaço Utilizado</CardDescription>
              <CardTitle className="text-2xl">1.4 MB</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Produtos sem Imagem</CardDescription>
              <CardTitle className="text-2xl text-destructive">3</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Última Atualização</CardDescription>
              <CardTitle className="text-2xl">Hoje</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar imagens..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                {selectedImages.length > 0 && (
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Excluir ({selectedImages.length})
                  </Button>
                )}
                <div className="flex border rounded-md">
                  <Button 
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filteredImages.map((image) => (
              <Card 
                key={image.id} 
                className={`group cursor-pointer transition-all hover:shadow-lg ${isSelected(image.id) ? 'ring-2 ring-primary' : ''}`}
                onClick={() => toggleImageSelection(image.id)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-muted rounded-t-lg overflow-hidden">
                    <img 
                      src={image.url} 
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected(image.id) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="secondary" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="text-xs">{image.category}</Badge>
                      <span className="text-xs text-muted-foreground">{image.size}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredImages.map((image) => (
                  <div 
                    key={image.id} 
                    className={`flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer ${isSelected(image.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected(image.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {isSelected(image.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                      <img 
                        src={image.url} 
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{image.name}</p>
                      <p className="text-sm text-muted-foreground">{image.date}</p>
                    </div>
                    <Badge variant="secondary">{image.category}</Badge>
                    <span className="text-sm text-muted-foreground w-20 text-right">{image.size}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredImages.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Image className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma imagem encontrada</h3>
              <p className="text-muted-foreground text-center mt-1">
                Tente ajustar sua busca ou faça upload de novas imagens
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
