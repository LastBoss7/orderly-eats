import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAdminRole } from '@/hooks/useAdminRole';
import {
  Download,
  Upload,
  Loader2,
  Monitor,
  Trash2,
  FileArchive,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstallerFile {
  name: string;
  size: number;
  created_at: string;
  url: string;
}

export function PrinterAppDownload() {
  const { profile } = useAuth();
  const { isAdmin } = useAdminRole();
  const [files, setFiles] = useState<InstallerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('printer-app')
        .list('installers', {
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('printer-app')
            .getPublicUrl(`installers/${file.name}`);

          return {
            name: file.name,
            size: file.metadata?.size || 0,
            created_at: file.created_at || new Date().toISOString(),
            url: urlData.publicUrl,
          };
        })
      );

      setFiles(filesWithUrls);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.exe', '.zip', '.msi', '.dmg', '.AppImage'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast.error('Tipo de arquivo inválido. Use: .exe, .zip, .msi, .dmg ou .AppImage');
      return;
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 100MB');
      return;
    }

    setUploading(true);

    try {
      const fileName = file.name;
      
      const { error } = await supabase.storage
        .from('printer-app')
        .upload(`installers/${fileName}`, file, {
          upsert: true,
        });

      if (error) throw error;

      toast.success('Instalador enviado com sucesso!');
      fetchFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Excluir ${fileName}?`)) return;

    setDeleting(fileName);

    try {
      const { error } = await supabase.storage
        .from('printer-app')
        .remove([`installers/${fileName}`]);

      if (error) throw error;

      toast.success('Arquivo excluído');
      fetchFiles();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const latestFile = files[0];

  return (
    <div className="space-y-4">
      {/* Main Download Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="w-5 h-5 text-primary" />
            Aplicativo de Impressão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Baixe e instale o aplicativo para imprimir pedidos automaticamente na sua impressora térmica.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : latestFile ? (
            <div className="bg-background/50 rounded-lg p-4 border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileArchive className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{latestFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(latestFile.size)} • {format(new Date(latestFile.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <a href={latestFile.url} download>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Nenhum instalador disponível ainda. {isAdmin ? 'Faça o upload abaixo.' : 'Entre em contato com o administrador.'}
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-2 text-sm">Como usar:</h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Baixe e instale o aplicativo</li>
              <li>Copie o ID do restaurante (aba Impressoras)</li>
              <li>Cole o ID no aplicativo e conecte</li>
              <li>Selecione sua impressora térmica</li>
              <li>Pronto! Os pedidos serão impressos automaticamente</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Admin Upload Section */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5" />
              Gerenciar Instaladores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" disabled={uploading} asChild>
                <label className="cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? 'Enviando...' : 'Upload Novo Instalador'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".exe,.zip,.msi,.dmg,.AppImage"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground">
                .exe, .zip, .msi, .dmg, .AppImage (máx. 100MB)
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="border rounded-lg divide-y">
                {files.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileArchive className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {format(new Date(file.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={file.url} download>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.name)}
                        disabled={deleting === file.name}
                      >
                        {deleting === file.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
