import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, Bot, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Robô Cripto</h1>
          </div>
          <nav className="flex space-x-6">
            <Link to="/dashboard" className="text-white hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/test" className="text-white hover:text-blue-400 transition-colors">
              Testes
            </Link>
            <Link to="/" className="text-white hover:text-blue-400 transition-colors">
              Sobre
            </Link>
            <Link to="/" className="text-white hover:text-blue-400 transition-colors">
              Contato
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Trading Automatizado com
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {' '}Smart Money Concepts
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Maximize seus lucros com nosso robô de trading inteligente baseado em Smart Money Concepts (SMC). 
            Análise automatizada, gestão de risco integrada e execução precisa 24/7.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/dashboard">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                <TrendingUp className="mr-2 h-5 w-5" />
                Acessar Dashboard
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900">
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Análise SMC Automatizada</h3>
            <p className="text-gray-300">
              Detecta automaticamente zonas de liquidez, order blocks, fair value gaps e estruturas de mercado.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Gestão de Risco Inteligente</h3>
            <p className="text-gray-300">
              Controle automático de risco com stop loss dinâmico, tamanho de posição calculado e limites diários.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Execução 24/7</h3>
            <p className="text-gray-300">
              Operações automáticas com integração às principais exchanges (Binance, Bybit) e monitoramento em tempo real.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h3 className="text-3xl font-bold text-white mb-4">
          Pronto para começar?
        </h3>
        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
          Configure seu robô em minutos e comece a operar com as estratégias mais avançadas do mercado de criptomoedas.
        </p>
        <Link to="/dashboard">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3">
            Começar Agora
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2024 Robô Cripto. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            * Trading envolve riscos. Nunca invista mais do que pode perder.
          </p>
        </div>
      </footer>
    </div>
  );
}