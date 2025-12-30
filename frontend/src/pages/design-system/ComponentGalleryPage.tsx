import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  PlayIcon, 
  SettingsIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  InfoIcon, 
  SearchIcon,
  BotIcon
} from '@/components/ui/icons';

export default function ComponentGalleryPage() {
  return (
    <div className="container mx-auto py-8 space-y-10 animate-fade-in pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Component Gallery</h1>
        <p className="text-muted-foreground">
          Biblioteca de componentes reutilizáveis e seus estados.
        </p>
      </div>

      <Tabs defaultValue="base" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="base">Base</TabsTrigger>
          <TabsTrigger value="forms">Formulários</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-8 mt-6">
          {/* Buttons */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Buttons</h2>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="success">Success</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><SettingsIcon className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                  <Button className="gap-2">
                    <PlayIcon className="h-4 w-4" /> With Icon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Badges */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Badges</h2>
            <Card>
              <CardContent className="pt-6 flex flex-wrap gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge className="bg-success-500 hover:bg-success-600">Custom Success</Badge>
                <Badge variant="outline" className="border-warning-500 text-warning-500">Warning Outline</Badge>
              </CardContent>
            </Card>
          </section>

          {/* Cards */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Cards</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Card Description goes here.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Content of the card. This uses the default card styles.</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Action</Button>
                </CardFooter>
              </Card>
              
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <BotIcon className="h-5 w-5" />
                    Active Card
                  </CardTitle>
                  <CardDescription>Highlighted card state.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Useful for active strategies or selected items.</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="forms" className="space-y-8 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>Inputs, switches, sliders, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" placeholder="Email" />
              </div>
              
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="search">Search (with icon)</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" id="search" placeholder="Search..." className="pl-9" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="airplane-mode" />
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
              </div>

              <div className="space-y-2 max-w-sm">
                <Label>Volume Control (Slider)</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-8 mt-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Alerts</h2>
            <div className="grid gap-4">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                  You can add components to your app using the cli.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Your session has expired. Please log in again.
                </AlertDescription>
              </Alert>

              <Alert className="border-success-500 text-success-900 dark:text-success-100 bg-success-50 dark:bg-success-900/20">
                <CheckCircleIcon className="h-4 w-4 text-success-500" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your changes have been saved successfully.
                </AlertDescription>
              </Alert>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Progress</h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Loading...</span>
                    <span className="text-muted-foreground">45%</span>
                  </div>
                  <Progress value={45} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Processing</span>
                    <span className="text-muted-foreground">80%</span>
                  </div>
                  <Progress value={80} className="bg-secondary text-success-500" indicatorClassName="bg-success-500" />
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
