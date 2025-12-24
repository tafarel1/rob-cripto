import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, FilterIcon, ClockIcon, ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HelpButton } from '../HelpButton';
import { Badge } from '@/components/ui/badge';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';

interface EconomicEvent {
  date: Date;
  time: string;
  currency: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
}

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const mockEvents: EconomicEvent[] = [
  { date: today, time: '14:30', currency: 'USD', event: 'CPI Data (YoY)', impact: 'high', forecast: '3.1%', previous: '3.2%' },
  { date: today, time: '15:00', currency: 'USD', event: 'FOMC Member Speaks', impact: 'medium' },
  { date: today, time: '16:00', currency: 'EUR', event: 'ECB President Speaks', impact: 'high' },
  { date: tomorrow, time: '09:00', currency: 'GBP', event: 'GDP (YoY)', impact: 'medium', forecast: '0.5%', previous: '0.6%' },
  { date: tomorrow, time: '19:00', currency: 'JPY', event: 'Trade Balance', impact: 'medium', forecast: '-0.5T', previous: '-0.6T' },
  { date: tomorrow, time: '21:30', currency: 'AUD', event: 'RBA Meeting Minutes', impact: 'high' },
];

export function EconomicCalendarWidget() {
  const [settings, setSettings] = useWidgetSettings('economic_calendar', {
    filterHighImpact: false
  });
  const { filterHighImpact } = settings;

  const [countdown, setCountdown] = useState<string>('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  
  // Find next high impact event (mock logic)
  useEffect(() => {
    const timer = setInterval(() => {
      // Mock countdown to next event (e.g., 45 mins)
      const now = new Date();
      const mins = 45 - (now.getMinutes() % 45);
      const secs = 60 - now.getSeconds();
      setCountdown(`00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    
    // Expand today by default
    const todayStr = today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    setExpandedDays(prev => ({ ...prev, [todayStr]: true }));

    return () => clearInterval(timer);
  }, []);

  const filteredEvents = filterHighImpact 
    ? mockEvents.filter(e => e.impact === 'high')
    : mockEvents;

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const dateStr = event.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(event);
    return acc;
  }, {} as Record<string, EconomicEvent[]>);

  const toggleDay = (day: string) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Economic Calendar
          <HelpButton 
            className="ml-2"
            title="Economic Calendar"
            content="Upcoming high-impact economic events. Times are in your local timezone."
            tutorialContent={
              <div className="space-y-2">
                <p><strong>Impact Levels:</strong></p>
                <ul className="pl-4 space-y-1 text-xs">
                  <li><span className="text-red-500 font-bold">Red (3 dots)</span>: High Impact - Expect volatility.</li>
                  <li><span className="text-amber-500 font-bold">Orange (2 dots)</span>: Medium Impact.</li>
                  <li><span className="text-emerald-500 font-bold">Green (1 dot)</span>: Low Impact.</li>
                </ul>
              </div>
            }
            tipsContent={
              <ul className="list-disc pl-4 space-y-1">
                <li>Avoid opening new high-leverage positions just before High Impact events.</li>
                <li>Consider pausing automated strategies during major announcements (e.g. FOMC).</li>
              </ul>
            }
          />
        </CardTitle>
        <Button 
          variant={filterHighImpact ? "secondary" : "ghost"} 
          size="icon" 
          className="h-6 w-6"
          onClick={() => setSettings({ filterHighImpact: !filterHighImpact })}
          title={filterHighImpact ? "Show All" : "Show High Impact Only"}
        >
          <FilterIcon className={cn("h-3 w-3", filterHighImpact && "text-primary")} />
        </Button>
      </CardHeader>
      
      {/* Countdown Banner */}
      <div className="bg-primary/5 px-4 py-2 flex items-center justify-between border-y border-primary/10">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <ClockIcon className="h-3 w-3 animate-pulse" />
          Next High Impact:
        </div>
        <Badge variant="outline" className="h-5 text-xs font-mono border-primary/20 bg-background">
          {countdown || "00:45:00"}
        </Badge>
      </div>

      <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <div className="divide-y divide-border/50">
          {Object.entries(groupedEvents).map(([date, events]) => (
            <div key={date} className="bg-background">
              <button 
                onClick={() => toggleDay(date)}
                className="w-full flex items-center justify-between p-2 px-3 bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-semibold text-muted-foreground sticky top-0 z-10 backdrop-blur-sm"
              >
                <span>{date}</span>
                {expandedDays[date] ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
              </button>
              
              {expandedDays[date] && (
                <div className="divide-y divide-border/50">
                  {events.map((e, i) => (
                    <div key={i} className="p-3 hover:bg-muted/30 transition-colors group pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 rounded">{e.time}</span>
                          <span className={cn(
                            "text-xs font-bold w-8", 
                            e.currency === 'USD' ? 'text-green-500' : 
                            e.currency === 'EUR' ? 'text-blue-500' : 
                            'text-purple-500'
                          )}>{e.currency}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <div 
                              key={idx}
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                idx < (e.impact === 'high' ? 3 : e.impact === 'medium' ? 2 : 1)
                                  ? (e.impact === 'high' ? "bg-red-500" : e.impact === 'medium' ? "bg-amber-500" : "bg-emerald-500")
                                  : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm font-medium leading-none mb-1.5">{e.event}</p>
                      {(e.forecast || e.previous) && (
                        <div className="flex items-center gap-4 text-xxs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {e.forecast && <span>Fcst: {e.forecast}</span>}
                          {e.previous && <span>Prev: {e.previous}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredEvents.length === 0 && (
             <div className="p-4 text-center text-xs text-muted-foreground">
               No high impact events found.
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
