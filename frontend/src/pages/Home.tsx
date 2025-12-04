import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import HeaderBar from '@/components/layout/HeaderBar';
import { Bot, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderBar />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Trading Automatizado com
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {' '}Smart Money Concepts
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Maximize seus lucros com nosso robô de trading inteligente baseado em Smart Money Concepts (SMC). 
            Análise automatizada, gestão de risco integrada e execução precisa 24/7.
          </p>
          <div className="flex justify-center">
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-card rounded-lg shadow-sm">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Análise SMC Automatizada</h3>
            <p className="text-muted-foreground">
              Detecta automaticamente zonas de liquidez, order blocks, fair value gaps e estruturas de mercado.
            </p>
          </div>
          
          <div className="text-center p-6 bg-card rounded-lg shadow-sm">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Gestão de Risco Inteligente</h3>
            <p className="text-muted-foreground">
              Controle automático de risco com stop loss dinâmico, tamanho de posição calculado e limites diários.
            </p>
          </div>
          
          <div className="text-center p-6 bg-card rounded-lg shadow-sm">
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Execução 24/7</h3>
            <p className="text-muted-foreground">
              Operações automáticas com integração às principais exchanges (Binance, Bybit) e monitoramento em tempo real.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h3 className="text-3xl font-bold mb-4">
          Pronto para começar?
        </h3>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Configure seu robô em minutos e comece a operar com as estratégias mais avançadas do mercado de criptomoedas.
        </p>
        <Link to="/dual-dashboard">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3">
            Começar Agora
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-card py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">
            © 2024 Robô Cripto. Todos os direitos reservados.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            * Trading envolve riscos. Nunca invista mais do que pode perder.
          </p>
        </div>
      </footer>
    </div>
  );
}
