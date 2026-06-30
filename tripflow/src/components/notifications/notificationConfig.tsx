import {
  CalendarDays,
  Plane,
  Wallet,
  FileText,
  Package,
  Sparkles,
} from "lucide-react";
import type { NotificationType } from "../../types/notifications";

export const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    icon: React.ElementType;
    bg: string;
    iconColor: string;
    gradient: string;
    label: string;
  }
> = {
  activity: {
    icon: CalendarDays,
    bg: "bg-violet-100",
    iconColor: "text-violet-600",
    gradient: "from-violet-400 to-purple-500",
    label: "Activity",
  },
  trip: {
    icon: Plane,
    bg: "bg-sky-100",
    iconColor: "text-sky-500",
    gradient: "from-sky-400 to-blue-500",
    label: "Trip",
  },
  budget: {
    icon: Wallet,
    bg: "bg-peach-100 bg-orange-50",
    iconColor: "text-orange-400",
    gradient: "from-orange-300 to-pink-400",
    label: "Budget",
  },
  document: {
    icon: FileText,
    bg: "bg-mint-100 bg-emerald-50",
    iconColor: "text-emerald-500",
    gradient: "from-emerald-400 to-teal-500",
    label: "Document",
  },
  packing: {
    icon: Package,
    bg: "bg-pink-50",
    iconColor: "text-pink-500",
    gradient: "from-pink-400 to-rose-400",
    label: "Packing",
  },
  system: {
    icon: Sparkles,
    bg: "bg-yellow-50",
    iconColor: "text-yellow-500",
    gradient: "from-yellow-300 to-amber-400",
    label: "TripFlow",
  },
};