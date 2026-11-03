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
  type LucideIcon,
} from "lucide-react";

// Shim sobre lucide-react: mantiene los exports y la firma ({ className, size }) originales.
type IconProps = { className?: string; size?: number };

function wrap(Icon: LucideIcon, defaultSize = 18) {
  return function WrappedIcon({ className = "", size = defaultSize }: IconProps) {
    return <Icon size={size} className={className} aria-hidden="true" />;
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
