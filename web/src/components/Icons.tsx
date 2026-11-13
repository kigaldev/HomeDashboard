import React from "react";
import {
  House,
  ShoppingCart,
  CreditCard,
  Users,
  Calendar,
  Zap,
  Shield,
  FileText,
  Sparkles,
  Settings,
  RefreshCw,
  Plus,
  Check,
  Clock,
  MapPin,
  Camera,
  ChevronRight,
  ChevronDown,
  Receipt,
  PieChart,
  Bot,
  Activity,
  Layers,
  Music,
  Tv,
  Globe,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Search,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Maximize2,
  Radio,
  Compass,
  Bookmark,
  type LucideIcon,
} from "lucide-react";

// Shim sobre lucide-react: mantiene los exports y la firma ({ className, size, style }) originales.
type IconProps = { className?: string; size?: number; style?: React.CSSProperties };

function wrap(Icon: LucideIcon, defaultSize = 18) {
  return function WrappedIcon({ className = "", size = defaultSize, style }: IconProps) {
    return <Icon size={size} className={className} style={style} aria-hidden="true" />;
  };
}

export const IconHome = wrap(House);
export const IconCart = wrap(ShoppingCart);
export const IconEconomy = wrap(CreditCard);
export const IconFamily = wrap(Users);
export const IconCalendar = wrap(Calendar);
export const IconEnergy = wrap(Zap);
export const IconShield = wrap(Shield);
export const IconWarranty = wrap(FileText);
export const IconSparkles = wrap(Sparkles);
export const IconSettings = wrap(Settings);
export const IconRefresh = wrap(RefreshCw);
export const IconPlus = wrap(Plus);
export const IconCheck = wrap(Check);
export const IconClock = wrap(Clock);
export const IconLocation = wrap(MapPin);
export const IconCamera = wrap(Camera);
export const IconChevronRight = wrap(ChevronRight, 16);
export const IconChevronDown = wrap(ChevronDown, 16);
export const IconReceipt = wrap(Receipt);
export const IconPieChart = wrap(PieChart);
export const IconBot = wrap(Bot);
export const IconActivity = wrap(Activity);
export const IconLayers = wrap(Layers);
export const IconMusic = wrap(Music);
export const IconTv = wrap(Tv);
export const IconGlobe = wrap(Globe);
export const IconPlay = wrap(Play);
export const IconPause = wrap(Pause);
export const IconSkipBack = wrap(SkipBack);
export const IconSkipForward = wrap(SkipForward);
export const IconVolume2 = wrap(Volume2);
export const IconVolumeX = wrap(VolumeX);
export const IconSearch = wrap(Search);
export const IconExternalLink = wrap(ExternalLink);
export const IconArrowLeft = wrap(ArrowLeft);
export const IconArrowRight = wrap(ArrowRight);
export const IconRotateCw = wrap(RotateCw);
export const IconMaximize2 = wrap(Maximize2);
export const IconRadio = wrap(Radio);
export const IconCompass = wrap(Compass);
export const IconBookmark = wrap(Bookmark);
