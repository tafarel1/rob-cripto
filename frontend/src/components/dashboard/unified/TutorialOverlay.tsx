import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XIcon, ChevronRightIcon, BotIcon, DashboardIcon, LineChartIcon } from '@/components/ui/icons';
import { useDashboard } from '@/contexts/DashboardContext';

export function TutorialOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  const { setMode } = useDashboard();

  useEffect(() => {
    // Check if tutorial has been seen
    const hasSeenTutorial = localStorage.getItem('has_seen_v2_tutorial');
    if (!hasSeenTutorial) {
      // Small delay to appear after load
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('has_seen_v2_tutorial', 'true');
  };

  const steps = [
    {
      title: "Bem-vindo ao Dashboard Unificado!",
      description: "Integramos análise, execução e monitoramento em uma experiência contínua. Vamos fazer um tour rápido?",
      icon: <BotIcon className="w-10 h-10 text-primary" />,
      action: () => {}
    },
    {
      title: "Modo Pro",
      description: "Visão geral da sua carteira, performance e calendário econômico. O centro de comando para suas decisões.",
      icon: <DashboardIcon className="w-10 h-10 text-blue-500" />,
      action: () => setMode('pro')
    },
    {
      title: "SMC Analysis",
      description: "Análise técnica profunda com Smart Money Concepts. Identifique Order Blocks e FVG automaticamente.",
      icon: <LineChartIcon className="w-10 h-10 text-emerald-500" />,
      action: () => setMode('smc')
    },
    {
      title: "Auto Trading",
      description: "Automatize suas estratégias com base nos sinais SMC. Configure riscos e deixe o robô trabalhar.",
      icon: <BotIcon className="w-10 h-10 text-purple-500" />,
      action: () => setMode('auto')
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      steps[step + 1].action();
    } else {
      handleClose();
      // Return to Pro mode after tour
      setMode('pro');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md p-6 relative overflow-hidden border-primary/20 shadow-2xl">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 hover:bg-muted/50"
          onClick={handleClose}
        >
          <XIcon className="w-4 h-4" />
        </Button>

        <div className="flex flex-col items-center text-center space-y-4 pt-4 relative">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-2 animate-in zoom-in duration-500">
            {steps[step].icon}
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {steps[step].title}
          </h2>
          
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {steps[step].description}
          </p>

          <div className="flex items-center gap-2 mt-8 w-full pt-4">
            <div className="flex-1 flex justify-center gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
            
            <Button onClick={handleNext} className="ml-auto group">
              {step === steps.length - 1 ? "Começar" : "Próximo"}
              <ChevronRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
