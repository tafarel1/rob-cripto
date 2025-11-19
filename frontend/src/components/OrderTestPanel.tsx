import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Send,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface OrderResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export default function OrderTestPanel() {
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [type, setType] = useState('limit');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('0.001');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderResult | null>(null);

  const handleSubmitOrder = async () => {
    try {
      setIsSubmitting(true);
      
      const orderData = {
        symbol,
        type,
        side,
        amount: parseFloat(amount),
        price: price ? parseFloat(price) : undefined
      };

      const response = await fetch('/api/exchange/test-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      setLastOrder(result);
      
      if (result.success) {
        console.log('✅ Ordem criada com sucesso:', result.data);
      } else {
        console.error('❌ Erro ao criar ordem:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      setLastOrder({
        success: false,
        error: 'Erro de conexão com o servidor'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Teste de Ordens</span>
          <Badge variant="outline">Testnet</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Símbolo */}
          <div>
            <Label htmlFor="symbol">Símbolo</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTC/USDT"
            />
          </div>

          {/* Tipo de Ordem */}
          <div>
            <Label htmlFor="type">Tipo de Ordem</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="market">Market</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lado (Compra/Venda) */}
          <div>
            <Label htmlFor="side">Operação</Label>
            <Select value={side} onValueChange={setSide}>
              <SelectTrigger id="side">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    Comprar
                  </div>
                </SelectItem>
                <SelectItem value="sell">
                  <div className="flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                    Vender
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div>
            <Label htmlFor="amount">Quantidade</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.001"
              step="0.0001"
              min="0"
            />
          </div>

          {/* Preço (apenas para limit orders) */}
          {type === 'limit' && (
            <div>
              <Label htmlFor="price">Preço (USD)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Deixe vazio para usar preço de mercado"
                step="0.01"
                min="0"
              />
            </div>
          )}

          {/* Botão de Enviar */}
          <Button 
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Ordem de Teste
              </>
            )}
          </Button>

          {/* Resultado da Última Ordem */}
          {lastOrder && (
            <div className={`p-4 rounded-lg border ${lastOrder.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {lastOrder.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span className={`font-semibold ${lastOrder.success ? 'text-green-800' : 'text-red-800'}`}>
                    {lastOrder.success ? 'Ordem Enviada' : 'Erro na Ordem'}
                  </span>
                </div>
                <Badge variant={lastOrder.success ? 'default' : 'destructive'}>
                  {lastOrder.success ? 'Sucesso' : 'Erro'}
                </Badge>
              </div>
              
              {lastOrder.success && lastOrder.data && (
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {lastOrder.data.id}</p>
                  <p><strong>Símbolo:</strong> {lastOrder.data.symbol}</p>
                  <p><strong>Lado:</strong> {lastOrder.data.side === 'buy' ? 'Compra' : 'Venda'}</p>
                  <p><strong>Quantidade:</strong> {lastOrder.data.amount}</p>
                  {lastOrder.data.price && (
                    <p><strong>Preço:</strong> {formatCurrency(lastOrder.data.price)}</p>
                  )}
                  <p><strong>Status:</strong> {lastOrder.data.status}</p>
                </div>
              )}
              
              {!lastOrder.success && lastOrder.error && (
                <p className="text-sm text-red-700">{lastOrder.error}</p>
              )}
              
              {lastOrder.message && (
                <p className="text-sm text-gray-600 mt-2">{lastOrder.message}</p>
              )}
            </div>
          )}

          {/* Informação de Teste */}
          <div className="flex items-center justify-center text-xs text-gray-500">
            <DollarSign className="h-3 w-3 mr-1" />
            <span>Esta ordem será executada no ambiente de testnet com capital virtual</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}