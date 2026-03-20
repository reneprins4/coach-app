/**
 * Dynamic Lucide icon mapping utility.
 *
 * Maps string icon names to Lucide React components so that
 * achievement definitions and other data structures can reference
 * icons by name without importing every component at the call site.
 */

import {
  Target,
  Flame,
  Zap,
  Crown,
  Dumbbell,
  Star,
  Award,
  Trophy,
  Medal,
  Diamond,
  Shield,
  BarChart3,
  Rocket,
  Sparkles,
  TrendingDown,
  Minus,
  TrendingUp,
  CheckCircle,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

/** Registry of icon name -> Lucide component */
export const ICON_MAP: Record<string, LucideIcon> = {
  Target,
  Flame,
  Zap,
  Crown,
  Dumbbell,
  Star,
  Award,
  Trophy,
  Medal,
  Diamond,
  Shield,
  BarChart3,
  Rocket,
  Sparkles,
  TrendingDown,
  Minus,
  TrendingUp,
  CheckCircle,
  HelpCircle,
}

/**
 * Resolve a Lucide icon component by name.
 * Returns HelpCircle as fallback if name is not found.
 */
export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? HelpCircle
}
