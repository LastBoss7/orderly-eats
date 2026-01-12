import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Minus, 
  HelpCircle,
  ChevronRight,
  User,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function SalonSettings() {
  const navigate = useNavigate();
  
  // State for form fields - all defaults to empty/zero for admin to configure
  const [hasDiningRoom, setHasDiningRoom] = useState('');
  const [tableCount, setTableCount] = useState(0);
  const [orderTabCount, setOrderTabCount] = useState(0);
  const [hasWaiters, setHasWaiters] = useState('');
  const [operationType, setOperationType] = useState('');
  const [serviceTypes, setServiceTypes] = useState({
    table: false,
    individual: false,
    counter: false,
    selfService: false,
  });

  const handleTableCountChange = (delta: number) => {
    setTableCount(prev => Math.max(1, prev + delta));
  };

  const handleOrderTabCountChange = (delta: number) => {
    setOrderTabCount(prev => Math.max(1, prev + delta));
  };

  const handleServiceTypeChange = (type: keyof typeof serviceTypes) => {
    setServiceTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleSave = () => {
    // TODO: Save settings to database
    console.log({
      hasDiningRoom,
      tableCount,
      orderTabCount,
      hasWaiters,
      operationType,
      serviceTypes,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span>Configurações Salão</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Meu Salão</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Salão</h1>
          </div>
          <Button 
            onClick={() => navigate('/waiter')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            Acessar Garçom
          </Button>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Salão</CardTitle>
            <CardDescription>
              Defina informações da sua operação no Salão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Atendimento de Salão */}
            <div className="space-y-4">
              <fieldset className="border rounded-lg p-4">
                <legend className="text-sm font-medium text-muted-foreground px-2">
                  Atendimento de Salão
                </legend>
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Você tem atendimento de salão no seu estabelecimento? *
                  </Label>
                  <RadioGroup 
                    value={hasDiningRoom} 
                    onValueChange={setHasDiningRoom}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="dining-yes" />
                      <Label htmlFor="dining-yes">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="dining-no" />
                      <Label htmlFor="dining-no">Não</Label>
                    </div>
                  </RadioGroup>
                </div>
              </fieldset>
            </div>

            {hasDiningRoom === 'yes' && (
              <>
                {/* Estrutura e Modelo de Negócio */}
                <fieldset className="border rounded-lg p-4">
                  <legend className="text-sm font-medium text-muted-foreground px-2">
                    Estrutura e Modelo de Negócio
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Quantidade de mesas */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Quantidade de mesas</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleTableCountChange(-1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="w-16 text-center text-xl font-semibold">
                          {tableCount}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleTableCountChange(1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mesas no seu estabelecimento
                      </p>
                    </div>

                    {/* Quantidade de comandas */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Quantidade de comandas</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleOrderTabCountChange(-1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="w-16 text-center text-xl font-semibold">
                          {orderTabCount}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleOrderTabCountChange(1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Comandas no estabelecimento
                      </p>
                    </div>

                    {/* Possui Garçons */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Possui Garçons? *</Label>
                      <RadioGroup 
                        value={hasWaiters} 
                        onValueChange={setHasWaiters}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="waiters-yes" />
                          <Label htmlFor="waiters-yes">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="waiters-no" />
                          <Label htmlFor="waiters-no">Não</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-sm text-muted-foreground">
                        Garçons do seu estabelecimento
                      </p>
                    </div>
                  </div>
                </fieldset>

                <Separator />

                {/* Como você opera? */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Como você opera? * (Selecione apenas 1 opção, considere a principal)
                  </Label>
                  <RadioGroup 
                    value={operationType} 
                    onValueChange={setOperationType}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="a-la-carte" id="op-alacarte" className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="op-alacarte" className="font-medium cursor-pointer">
                            À la carte
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cardápio com itens individuais para escolha
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cardápio físico ou digital
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="buffet" id="op-buffet" className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="op-buffet" className="font-medium cursor-pointer">
                            Buffet/Self Service
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cliente se serve sozinho
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Preço único ou por quilo (Kg)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="rodizio" id="op-rodizio" className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="op-rodizio" className="font-medium cursor-pointer">
                            Rodízio
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Garçons servem variedades continuamente
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Garçons oferecem variedades
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Como você atende seu cliente */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Como você atende o seu cliente no salão? * (Selecione 1 opção ou mais)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-table" 
                        checked={serviceTypes.table}
                        onCheckedChange={() => handleServiceTypeChange('table')}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-table" className="font-medium cursor-pointer">
                            Em mesa
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Garçom vai até a mesa do cliente
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Garçom se dirige ao cliente nas mesas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-individual" 
                        checked={serviceTypes.individual}
                        onCheckedChange={() => handleServiceTypeChange('individual')}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-individual" className="font-medium cursor-pointer">
                            Comanda individual
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cada cliente tem sua própria comanda
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Registra o consumo de cada cliente
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-counter" 
                        checked={serviceTypes.counter}
                        onCheckedChange={() => handleServiceTypeChange('counter')}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-counter" className="font-medium cursor-pointer">
                            No Balcão
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cliente faz pedido diretamente no balcão
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cliente se dirige ao balcão
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-self" 
                        checked={serviceTypes.selfService}
                        onCheckedChange={() => handleServiceTypeChange('selfService')}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-self" className="font-medium cursor-pointer">
                            Auto atendimento
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cliente faz pedido por dispositivo
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cliente pede através de dispositivo eletrônico
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-6">
              <Button 
                variant="outline" 
                className="min-w-[120px]"
                onClick={() => navigate('/dashboard')}
              >
                Cancelar
              </Button>
              <Button 
                className="min-w-[120px]"
                onClick={handleSave}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
