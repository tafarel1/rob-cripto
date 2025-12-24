import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BellIcon, DownloadIcon, FilterIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '@/contexts/SocketContext';

interface Alert {
  id: string;
  type: 'strategic' | 'standard' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  pair: string;
}

export function AlertHistory() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    // Fetch initial alerts
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts?limit=50');
        const data = await res.json();
        if (data.success) {
          setAlerts(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch alerts', err);
      }
    };
    
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (newAlert: Alert) => {
      setAlerts(prev => [newAlert, ...prev]);
    };

    socket.on('alert:new', handleNewAlert);

    return () => {
      socket.off('alert:new', handleNewAlert);
    };
  }, [socket]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}/read`, { method: 'POST' });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'strategic': return 'default'; // Orange-ish usually, but default works for now
      case 'standard': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-bold">Alert History</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FilterIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <DownloadIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[300px]">
          <div className="flex flex-col">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`flex flex-col gap-1 p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!alert.read ? 'bg-muted/20' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(alert.type) as 'default' | 'secondary' | 'destructive' | 'outline'} className="text-xxs uppercase">
                      {alert.type}
                    </Badge>
                    <span className="text-xs font-bold">{alert.title}</span>
                  </div>
                  <span className="text-xxs text-muted-foreground">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-1">{alert.message}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xxs font-mono bg-secondary px-1 rounded text-muted-foreground">{alert.pair}</span>
                  {!alert.read && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 text-xxs px-2 text-blue-500"
                      onClick={() => handleMarkAsRead(alert.id)}
                    >
                      Mark as Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No alerts found.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
