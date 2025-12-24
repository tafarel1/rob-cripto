import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart2, 
  Zap, 
  Shield, 
  Settings, 
  Power, 
  Layers, 
  Box, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertTriangle,
  CandlestickChart,
  Search,
  Bell,
  RefreshCw,
  Gamepad2,
  DollarSign,
  AlertCircle,
  Home,
  Bot,
  Menu,
  LayoutDashboard,
  Coins,
  ChevronRight,
  Wallet,
  X,
  Star,
  ArrowRightLeft,
  Loader2,
  ListPlus,
  Filter,
  LayoutGrid,
  List,
  AlignJustify,
  ArrowUpDown,
  Download,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Play,
  Radar,
  Globe,
  Clock,
  History,
  Target,
  ArrowRight,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  ShieldAlert,
  Network,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  Settings2,
  PieChart,
  Newspaper,
  PlayCircle,
  Cpu,
  Radio,
  AlertOctagon,
  HelpCircle,
  BookOpen,
  Lightbulb,
  LogOut,
  LineChart,
  Terminal,
  Database,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Calendar,
  BarChart3,
  Check,
  Sun,
  Moon,
  User,
  MoreHorizontal,
  Percent,
  Layout,
  StopCircle,
  TestTube,
  Move,
  XCircle,
  Save,
  Square,
  Cog,
  FileDown,
  SplitSquareHorizontal,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

// Navigation Icons
export const HomeIcon = ({ className, ...props }: IconProps) => (
  <Home className={cn("text-muted-foreground", className)} {...props} />
);

export const BotIcon = ({ className, ...props }: IconProps) => (
  <Bot className={cn("text-primary", className)} {...props} />
);

export const MenuIcon = ({ className, ...props }: IconProps) => (
  <Menu className={cn("text-muted-foreground", className)} {...props} />
);

export const DashboardIcon = ({ className, ...props }: IconProps) => (
  <LayoutDashboard className={cn("text-muted-foreground", className)} {...props} />
);

export const WalletIcon = ({ className, ...props }: IconProps) => (
  <Wallet className={cn("text-muted-foreground", className)} {...props} />
);

export const CoinsIcon = ({ className, ...props }: IconProps) => (
  <Coins className={cn("text-yellow-500", className)} {...props} />
);

export const ChevronRightIcon = ({ className, ...props }: IconProps) => (
  <ChevronRight className={cn("text-muted-foreground", className)} {...props} />
);

export const ChevronUpIcon = ({ className, ...props }: IconProps) => (
  <ChevronUp className={cn("text-muted-foreground", className)} {...props} />
);

export const ChevronDownIcon = ({ className, ...props }: IconProps) => (
  <ChevronDown className={cn("text-muted-foreground", className)} {...props} />
);

export const ActivityIcon = ({ className, ...props }: IconProps) => (
  <Activity className={cn("text-blue-500", className)} {...props} />
);

// System Icons
export const GamepadIcon = ({ className, ...props }: IconProps) => (
  <Gamepad2 className={cn("text-primary", className)} {...props} />
);

export const ZapIcon = ({ className, ...props }: IconProps) => (
  <Zap className={cn("text-yellow-500", className)} {...props} />
);

export const DollarIcon = ({ className, ...props }: IconProps) => (
  <DollarSign className={cn("text-success-500", className)} {...props} />
);

export const ShieldIcon = ({ className, ...props }: IconProps) => (
  <Shield className={cn("text-blue-500", className)} {...props} />
);

export const InfoIcon = ({ className, ...props }: IconProps) => (
  <AlertCircle className={cn("text-blue-400", className)} {...props} />
);

export const TrendingUpIcon = ({ className, ...props }: IconProps) => (
  <TrendingUp className={cn("text-success-500", className)} {...props} />
);

export const TrendingDownIcon = ({ className, ...props }: IconProps) => (
  <TrendingDown className={cn("text-danger-500", className)} {...props} />
);

// SMC Icons
export const OrderBlockIcon = ({ className, ...props }: IconProps) => (
  <Layers className={cn("text-primary", className)} {...props} />
);

export const LayersIcon = ({ className, ...props }: IconProps) => (
  <Layers className={cn("text-muted-foreground", className)} {...props} />
);

export const FVGIcon = ({ className, ...props }: IconProps) => (
  <Box className={cn("text-blue-500", className)} {...props} />
);

export const LiquidityIcon = ({ className, ...props }: IconProps) => (
  <Activity className={cn("text-orange-500", className)} {...props} />
);

// Trading Icons
export const BuyIcon = ({ className, ...props }: IconProps) => (
  <ArrowUpCircle className={cn("text-success-500", className)} {...props} />
);

export const SellIcon = ({ className, ...props }: IconProps) => (
  <ArrowDownCircle className={cn("text-danger-500", className)} {...props} />
);

export const StopLossIcon = ({ className, ...props }: IconProps) => (
  <ShieldAlert className={cn("text-danger-500", className)} {...props} />
);

export const TakeProfitIcon = ({ className, ...props }: IconProps) => (
  <Target className={cn("text-success-500", className)} {...props} />
);

// Chart Icons
export const CandlestickIcon = ({ className, ...props }: IconProps) => (
  <CandlestickChart className={cn("text-muted-foreground", className)} {...props} />
);

export const LineChartIcon = ({ className, ...props }: IconProps) => (
  <LineChart className={cn("text-muted-foreground", className)} {...props} />
);

export const BarChart3Icon = ({ className, ...props }: IconProps) => (
  <BarChart3 className={cn("text-muted-foreground", className)} {...props} />
);

// Action Icons
export const SearchIcon = ({ className, ...props }: IconProps) => (
  <Search className={cn("text-muted-foreground", className)} {...props} />
);

export const BellIcon = ({ className, ...props }: IconProps) => (
  <Bell className={cn("text-yellow-500", className)} {...props} />
);

export const RefreshIcon = ({ className, ...props }: IconProps) => (
  <RefreshCw className={cn("text-muted-foreground", className)} {...props} />
);

export const SettingsIcon = ({ className, ...props }: IconProps) => (
  <Settings className={cn("text-muted-foreground", className)} {...props} />
);

export const XIcon = ({ className, ...props }: IconProps) => (
  <X className={cn("text-muted-foreground", className)} {...props} />
);

export const StarIcon = ({ className, ...props }: IconProps) => (
  <Star className={cn("text-yellow-500", className)} {...props} />
);

export const ArrowRightLeftIcon = ({ className, ...props }: IconProps) => (
  <ArrowRightLeft className={cn("text-muted-foreground", className)} {...props} />
);

export const LoaderIcon = ({ className, ...props }: IconProps) => (
  <Loader2 className={cn("text-muted-foreground animate-spin", className)} {...props} />
);

export const ListPlusIcon = ({ className, ...props }: IconProps) => (
  <ListPlus className={cn("text-muted-foreground", className)} {...props} />
);

export const FilterIcon = ({ className, ...props }: IconProps) => (
  <Filter className={cn("text-muted-foreground", className)} {...props} />
);

export const ListIcon = ({ className, ...props }: IconProps) => (
  <List className={cn("text-muted-foreground", className)} {...props} />
);

export const ArrowUpDownIcon = ({ className, ...props }: IconProps) => (
  <ArrowUpDown className={cn("text-muted-foreground", className)} {...props} />
);

export const GridIcon = ({ className, ...props }: IconProps) => (
  <LayoutGrid className={cn("text-muted-foreground", className)} {...props} />
);

export const DownloadIcon = ({ className, ...props }: IconProps) => (
  <Download className={cn("text-muted-foreground", className)} {...props} />
);

export const SlidersHorizontalIcon = ({ className, ...props }: IconProps) => (
  <SlidersHorizontal className={cn("text-muted-foreground", className)} {...props} />
);

export const ArrowUpIcon = ({ className, ...props }: IconProps) => (
  <ArrowUp className={cn("text-success-500", className)} {...props} />
);

export const ArrowDownIcon = ({ className, ...props }: IconProps) => (
  <ArrowDown className={cn("text-danger-500", className)} {...props} />
);

export const PlayIcon = ({ className, ...props }: IconProps) => (
  <Play className={cn("text-success-500", className)} {...props} />
);

export const RadarIcon = ({ className, ...props }: IconProps) => (
  <Radar className={cn("text-muted-foreground", className)} {...props} />
);

export const GlobeIcon = ({ className, ...props }: IconProps) => (
  <Globe className={cn("text-muted-foreground", className)} {...props} />
);

export const ClockIcon = ({ className, ...props }: IconProps) => (
  <Clock className={cn("text-muted-foreground", className)} {...props} />
);

export const HistoryIcon = ({ className, ...props }: IconProps) => (
  <History className={cn("text-muted-foreground", className)} {...props} />
);

export const TargetIcon = ({ className, ...props }: IconProps) => (
  <Target className={cn("text-muted-foreground", className)} {...props} />
);

export const ArrowRightIcon = ({ className, ...props }: IconProps) => (
  <ArrowRight className={cn("text-muted-foreground", className)} {...props} />
);

export const MaximizeIcon = ({ className, ...props }: IconProps) => (
  <Maximize2 className={cn("text-muted-foreground", className)} {...props} />
);

export const MinimizeIcon = ({ className, ...props }: IconProps) => (
  <Minimize2 className={cn("text-muted-foreground", className)} {...props} />
);

export const EyeIcon = ({ className, ...props }: IconProps) => (
  <Eye className={cn("text-muted-foreground", className)} {...props} />
);

export const EyeOffIcon = ({ className, ...props }: IconProps) => (
  <EyeOff className={cn("text-muted-foreground", className)} {...props} />
);

export const WifiIcon = ({ className, ...props }: IconProps) => (
  <Wifi className={cn("text-success-500", className)} {...props} />
);

export const WifiOffIcon = ({ className, ...props }: IconProps) => (
  <WifiOff className={cn("text-danger-500", className)} {...props} />
);

export const AlertTriangleIcon = ({ className, ...props }: IconProps) => (
  <AlertTriangle className={cn("text-yellow-500", className)} {...props} />
);

export const NetworkIcon = ({ className, ...props }: IconProps) => (
  <Network className={cn("text-blue-500", className)} {...props} />
);

export const ArrowUpRightIcon = ({ className, ...props }: IconProps) => (
  <ArrowUpRight className={cn("text-success-500", className)} {...props} />
);

export const ArrowDownRightIcon = ({ className, ...props }: IconProps) => (
  <ArrowDownRight className={cn("text-danger-500", className)} {...props} />
);

export const MinusIcon = ({ className, ...props }: IconProps) => (
  <Minus className={cn("text-muted-foreground", className)} {...props} />
);

export const CheckCircleIcon = ({ className, ...props }: IconProps) => (
  <CheckCircle className={cn("text-success-500", className)} {...props} />
);

export const Settings2Icon = ({ className, ...props }: IconProps) => (
  <Settings2 className={cn("text-muted-foreground", className)} {...props} />
);

export const PieChartIcon = ({ className, ...props }: IconProps) => (
  <PieChart className={cn("text-muted-foreground", className)} {...props} />
);

export const NewspaperIcon = ({ className, ...props }: IconProps) => (
  <Newspaper className={cn("text-muted-foreground", className)} {...props} />
);

export const PlayCircleIcon = ({ className, ...props }: IconProps) => (
  <PlayCircle className={cn("text-success-500", className)} {...props} />
);

export const CpuIcon = ({ className, ...props }: IconProps) => (
  <Cpu className={cn("text-muted-foreground", className)} {...props} />
);

export const RadioIcon = ({ className, ...props }: IconProps) => (
  <Radio className={cn("text-muted-foreground", className)} {...props} />
);

export const AlertOctagonIcon = ({ className, ...props }: IconProps) => (
  <AlertOctagon className={cn("text-danger-500", className)} {...props} />
);

export const HelpIcon = ({ className, ...props }: IconProps) => (
  <HelpCircle className={cn("text-muted-foreground", className)} {...props} />
);

export const SwapIcon = ({ className, ...props }: IconProps) => (
  <ArrowLeftRight className={cn("text-muted-foreground", className)} {...props} />
);

export const AlignJustifyIcon = ({ className, ...props }: IconProps) => (
  <AlignJustify className={cn("text-muted-foreground", className)} {...props} />
);

export const SortIcon = ({ className, ...props }: IconProps) => (
  <ArrowUpDown className={cn("text-muted-foreground", className)} {...props} />
);

export const SlidersIcon = ({ className, ...props }: IconProps) => (
  <SlidersHorizontal className={cn("text-muted-foreground", className)} {...props} />
);

export const BarChartIcon = ({ className, ...props }: IconProps) => (
  <BarChart3 className={cn("text-muted-foreground", className)} {...props} />
);

export const BookIcon = ({ className, ...props }: IconProps) => (
  <BookOpen className={cn("text-muted-foreground", className)} {...props} />
);

export const ShieldAlertIcon = ({ className, ...props }: IconProps) => (
  <ShieldAlert className={cn("text-destructive", className)} {...props} />
);

export const LightbulbIcon = ({ className, ...props }: IconProps) => (
  <Lightbulb className={cn("text-yellow-500", className)} {...props} />
);

export const LogOutIcon = ({ className, ...props }: IconProps) => (
  <LogOut className={cn("text-muted-foreground", className)} {...props} />
);

export const TerminalIcon = ({ className, ...props }: IconProps) => (
  <Terminal className={cn("text-muted-foreground", className)} {...props} />
);

export const DatabaseIcon = ({ className, ...props }: IconProps) => (
  <Database className={cn("text-muted-foreground", className)} {...props} />
);

export const ChevronLeftIcon = ({ className, ...props }: IconProps) => (
  <ChevronLeft className={cn("text-muted-foreground", className)} {...props} />
);

export const CalendarIcon = ({ className, ...props }: IconProps) => (
  <Calendar className={cn("text-muted-foreground", className)} {...props} />
);

export const CheckIcon = ({ className, ...props }: IconProps) => (
  <Check className={cn("text-success-500", className)} {...props} />
);

export const SunIcon = ({ className, ...props }: IconProps) => (
  <Sun className={cn("text-yellow-500", className)} {...props} />
);

export const MoonIcon = ({ className, ...props }: IconProps) => (
  <Moon className={cn("text-muted-foreground", className)} {...props} />
);

export const UserIcon = ({ className, ...props }: IconProps) => (
  <User className={cn("text-muted-foreground", className)} {...props} />
);

export const MoreHorizontalIcon = ({ className, ...props }: IconProps) => (
  <MoreHorizontal className={cn("text-muted-foreground", className)} {...props} />
);

export const PercentIcon = ({ className, ...props }: IconProps) => (
  <Percent className={cn("text-muted-foreground", className)} {...props} />
);

export const LayoutIcon = ({ className, ...props }: IconProps) => (
  <Layout className={cn("text-muted-foreground", className)} {...props} />
);

export const LayoutGridIcon = ({ className, ...props }: IconProps) => (
  <LayoutGrid className={cn("text-muted-foreground", className)} {...props} />
);

export const StopCircleIcon = ({ className, ...props }: IconProps) => (
  <StopCircle className={cn("text-destructive", className)} {...props} />
);

export const TestTubeIcon = ({ className, ...props }: IconProps) => (
  <TestTube className={cn("text-muted-foreground", className)} {...props} />
);

export const MoveIcon = ({ className, ...props }: IconProps) => (
  <Move className={cn("text-muted-foreground", className)} {...props} />
);

export const XCircleIcon = ({ className, ...props }: IconProps) => (
  <XCircle className={cn("text-muted-foreground", className)} {...props} />
);

export const SaveIcon = ({ className, ...props }: IconProps) => (
  <Save className={cn("text-muted-foreground", className)} {...props} />
);

export const SquareIcon = ({ className, ...props }: IconProps) => (
  <Square className={cn("text-muted-foreground", className)} {...props} />
);

export const CogIcon = ({ className, ...props }: IconProps) => (
  <Cog className={cn("text-muted-foreground", className)} {...props} />
);

export const FileDownIcon = ({ className, ...props }: IconProps) => (
  <FileDown className={cn("text-muted-foreground", className)} {...props} />
);

export const SplitSquareHorizontalIcon = ({ className, ...props }: IconProps) => (
  <SplitSquareHorizontal className={cn("text-muted-foreground", className)} {...props} />
);

export const MonitorIcon = ({ className, ...props }: IconProps) => (
  <LayoutDashboard className={cn("text-muted-foreground", className)} {...props} />
);
