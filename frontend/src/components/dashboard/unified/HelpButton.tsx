import React, { ReactNode } from 'react';
import { HelpIcon, BookIcon, LightbulbIcon, AlertTriangleIcon } from '@/components/ui/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HelpButtonProps {
  title?: string;
  content: string | ReactNode;
  className?: string;
  tutorialContent?: ReactNode;
  tipsContent?: ReactNode;
  troubleshootingContent?: ReactNode;
}

export function HelpButton({ 
  title = "Widget Help", 
  content, 
  className,
  tutorialContent,
  tipsContent,
  troubleshootingContent
}: HelpButtonProps) {
  return (
    <Dialog>
      <DialogTrigger className={className} asChild>
        <button className="rounded-full p-1 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
          <HelpIcon className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-primary transition-colors" />
          <span className="sr-only">Open help</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpIcon className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Learn how to use this widget effectively.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Main Description */}
            <div className="text-sm text-muted-foreground leading-relaxed">
              {content}
            </div>

            {/* Structured Content if available */}
            {(tutorialContent || tipsContent || troubleshootingContent) && (
              <Tabs defaultValue="guide" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="guide" disabled={!tutorialContent}>
                    <BookIcon className="w-4 h-4 mr-2" />
                    Guide
                  </TabsTrigger>
                  <TabsTrigger value="tips" disabled={!tipsContent}>
                    <LightbulbIcon className="w-4 h-4 mr-2" />
                    Tips
                  </TabsTrigger>
                  <TabsTrigger value="troubleshoot" disabled={!troubleshootingContent}>
                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                    Fixes
                  </TabsTrigger>
                </TabsList>
                
                {tutorialContent && (
                  <TabsContent value="guide" className="mt-4 space-y-2 text-sm">
                    {tutorialContent}
                  </TabsContent>
                )}
                
                {tipsContent && (
                  <TabsContent value="tips" className="mt-4 space-y-2 text-sm">
                    {tipsContent}
                  </TabsContent>
                )}
                
                {troubleshootingContent && (
                  <TabsContent value="troubleshoot" className="mt-4 space-y-2 text-sm">
                    {troubleshootingContent}
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
