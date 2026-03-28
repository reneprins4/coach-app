// ---------------------------------------------------------------------------
// Core domain types for the Kravex coach app
// ---------------------------------------------------------------------------

// ---- Enums / Union types ----

export type Gender = 'male' | 'female' | 'other'

export type TrainingGoal = 'hypertrophy' | 'strength' | 'powerbuilding' | 'conditioning'

export type TrainingPhase = 'build' | 'strength' | 'peak' | 'deload'

export type PeriodizationPhase = 'accumulation' | 'intensification' | 'strength' | 'deload'

export type ExperienceLevel = 'complete_beginner' | 'beginner' | 'returning' | 'intermediate' | 'advanced'

export type Equipment = 'full_gym' | 'home_gym' | 'minimal' | 'bodyweight'

export type Units = 'kg' | 'lbs'

export type MainLift = 'squat' | 'bench' | 'deadlift' | 'ohp'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'biceps'
  | 'triceps'
  | 'core'

export type SplitName =
  | 'Push'
  | 'Pull'
  | 'Legs'
  | 'Upper'
  | 'Lower'
  | 'Lower Body'
  | 'Full Body'

export type RecoveryStatusLabel = 'ready' | 'recovering' | 'fatigued' | 'needs_work'

export type ProgressionDirection = 'up' | 'same' | 'down' | 'new'

// ---- User Settings ----

export interface UserSettings {
  name: string
  gender: Gender
  goal: TrainingGoal
  frequency: string
  restTime: number
  units: Units
  memberSince: string | null
  bodyweight: string
  experienceLevel: ExperienceLevel
  equipment: Equipment
  benchMax: string
  squatMax: string
  deadliftMax: string
  ohpMax: string
  onboardingCompleted: boolean
  language: string
  time: number
  trainingGoal: TrainingGoal
  trainingPhase: TrainingPhase
  mainLift: MainLift | null
  mainLiftGoalKg: number | null
  mainLiftGoalDate: string | null
  priorityMuscles: MuscleGroup[]
  priorityMusclesUntil: string | null
}

// ---- Workout & Sets ----

export interface WorkoutSet {
  id: string
  workout_id: string
  user_id: string
  exercise: string
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  split: string
  created_at: string
  completed_at: string | null
  notes: string | null
  workout_sets: WorkoutSet[]
  totalVolume: number
  exerciseNames: string[]
}

// ---- Exercise ----

export interface Exercise {
  name: string
  muscle_group: MuscleGroup
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
  vs_last_session: string
  exercise_type?: 'reps' | 'time'
  duration_min?: number
  duration_max?: number
}

// ---- Training Analysis ----

export interface SetTarget {
  min: number
  max: number
  mev: number
}

export interface LastSessionSet {
  exercise: string
  weight_kg: number | null
  reps: number | null
  rpe: number | null
}

export interface MuscleStatus {
  setsThisWeek: number
  daysSinceLastTrained: number | null
  hoursSinceLastTrained: number | null
  avgRpeLastSession: number | null
  setsLastSession: number
  recoveryPct: number
  recentExercises: string[]
  lastSessionSets: LastSessionSet[]
  target: SetTarget
  status: RecoveryStatusLabel
}

export type MuscleStatusMap = Record<MuscleGroup, MuscleStatus>

// ---- Split Scoring ----

export interface SplitScore {
  name: string
  score: number
  reasoning: string
}

// ---- Periodization ----

export interface WeekTarget {
  week: number
  rpe: number
  repRange: [number, number]
  setNote: string
  isDeload: boolean
}

export interface PhaseConfig {
  label: string
  labelKey: string
  weeks: number
  description: string
  descriptionKey: string
  color: string
  weekTargets: WeekTarget[]
}

export interface TrainingBlock {
  id: string
  phase: PeriodizationPhase
  startDate: string
  createdAt: string
  fullPlan: unknown
  lastModified: string
  currentWeek: number
  daysElapsed: number
}

export interface BlockProgress {
  currentWeek: number
  totalWeeks: number
  pct: number
  isLastWeek: boolean
}

// ---- AI Coach Response ----

export interface AIExercise {
  name: string
  muscle_group: MuscleGroup
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
  vs_last_session: `${ProgressionDirection} - ${string}` | ProgressionDirection
  exercise_type?: 'reps' | 'time'
  duration_min?: number
  duration_max?: number
}

export interface AIWorkoutResponse {
  split: string
  reasoning: string
  exercises: AIExercise[]
  estimated_duration_min: number
  volume_notes: string
}

// ---- UI Components ----

export interface ToastProps {
  message: string
  action?: string
  onAction?: () => void
  onDismiss?: () => void
  duration?: number
}

// ---- Exercise Classification ----

export interface ExerciseClassification {
  primary: MuscleGroup | null
  secondary: MuscleGroup[]
}

// ---- Workout Preferences (shared between Logger & AICoach) ----

export interface WorkoutPreferences {
  name: string
  gender: Gender
  bodyweight: string
  experienceLevel: ExperienceLevel
  equipment: Equipment
  goal: TrainingGoal
  frequency: string
  time: number
  energy: string
  benchMax: string
  squatMax: string
  deadliftMax: string
  focusedMuscles: MuscleGroup[]
  priorityMuscles: MuscleGroup[]
  trainingGoal: TrainingGoal
  trainingPhase: PeriodizationPhase | undefined
  blockWeek: number | undefined
  blockTotalWeeks: number | null | undefined
  isDeload: boolean
  targetRPE: number | null | undefined
  targetRepRange: [number, number] | null | undefined
  weekTargetNote?: string | null
}

// ---- Active Workout Types ----

export interface ActiveWorkoutSet {
  id: string
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
  created_at: string
}

export interface ActiveExercise {
  name: string
  muscle_group?: string
  category?: string
  sets: ActiveWorkoutSet[]
  plan?: ExercisePlan | null
  image_url_0?: string | null
  image_url_1?: string | null
}

export interface ExercisePlan {
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
  exercise_type?: 'reps' | 'time'
  duration_min?: number
  duration_max?: number
}

export interface ActiveWorkout {
  tempId: string
  startedAt: string
  lastActivityAt?: string
  exercises: ActiveExercise[]
  notes: string
}

// ---- Start Flow State ----

export interface StartFlowState {
  loading: boolean
  generating: boolean
  error: string | null
  retryCount: number
  muscleStatus: MuscleStatusMap | null
  splits: SplitScore[]
  recommendedSplit: string | null
  selectedSplit: string | null
  generatedWorkout: ActiveExercise[] | null
  recoveredMuscles: string[]
  showSplitPicker: boolean
  estimatedDuration: number | null
  exerciseCount: number | null
  cachedAt: number | null
  availableTime: number | null
  aiResponse: AIWorkoutResponse | null
  energy: 'low' | 'medium' | 'high'
  focusedMuscles: MuscleGroup[]
}

// ---- Junk Volume Warning ----

export interface JunkVolumeWarning {
  exercise: string
  message: string
  severity: string
}

// ---- Superset Mode ----

export interface SupersetGroup {
  type: 'superset' | 'single'
  exercises: Array<{ name: string }>
  pairReason?: string
  restAfter?: number
}

export interface SupersetModeState {
  supersets: SupersetGroup[]
  active: boolean
}

// ---- Swap Modal Exercise ----

export interface SubstituteExercise {
  name: string
  muscle_group: string
  equipment?: string
  weight_kg?: number
  sets?: number
  reps_min?: number
  reps_max?: number
  rpe_target?: number
  rest_seconds?: number
  notes?: string
}

// ---- Last Workout Info ----

export interface LastWorkoutPreview {
  preview: string
  exercises: ActiveExercise[]
}

// ---- PR Banner ----

export interface PRBanner {
  weight: number
  reps: number
  improvement: number
  type: string
}

// ---- AI Cache ----

export interface WorkoutCachePreferences {
  goal: TrainingGoal
  equipment: Equipment
  time: number
  energy?: string
  isDeload?: boolean
  trainingPhase?: TrainingPhase
  blockWeek?: number
  focusedMuscles?: MuscleGroup[]
}

export interface WorkoutCacheInput {
  split: string
  muscleStatus: MuscleStatusMap
  preferences: WorkoutCachePreferences
}

export interface SubstituteCacheInput {
  exercise: { name: string; muscle_group?: string }
  reason: string
  equipment?: string
}

// ---- AI (Gemini) Response Types ----

export interface ExerciseGuideResponse {
  steps: string[]
  muscles: string[]
  mistakes: string[]
  tip: string
}

export interface ExerciseSubstituteInput {
  exercise: {
    name: string
    muscle_group?: string
    weight_kg?: number
    plan?: {
      sets?: number
      reps_min?: number
      reps_max?: number
      rpe_target?: number
      rest_seconds?: number
      weight_kg?: number
    }
  }
  reason: string
  equipment?: string
  experienceLevel?: string
  bodyweight?: string
}

export interface ExerciseSubstituteResponse {
  name: string
  muscle_group: string
  weight_kg: number
  sets: number
  reps_min: number
  reps_max: number
  rpe_target: number
  rest_seconds: number
  notes: string
  why?: string
}

export interface RecentSession {
  date: string
  sets: RecentSessionSet[]
}

export interface RecentSessionSet {
  exercise: string
  weight_kg: number | null
  reps: number | null
  rpe: number | null
}

// ---- Fatigue Detection ----

export interface RpeDriftSignal {
  type: 'rpe_drift'
  exercise: string
  delta: number
}

export interface VolumeDropSignal {
  type: 'volume_drop'
  dropPct: number
}

export interface FrequencyDropSignal {
  type: 'frequency_drop'
  perWeek: string
}

export type FatigueSignal = RpeDriftSignal | VolumeDropSignal | FrequencyDropSignal

export type FatigueRecommendation = 'urgent' | 'suggested' | 'none'

export interface FatigueResult {
  fatigued: boolean
  score: number
  signals: FatigueSignal[]
  recommendation?: FatigueRecommendation
}

// ---- Form Analysis ----

export type InsightSeverity = 'low' | 'medium' | 'high'

export interface FormInsight {
  exercise: string
  insight: string
  severity: InsightSeverity
  recommendation: string
}

// ---- Junk Volume Detection (lib types) ----

export interface JunkVolumeSet {
  rpe?: number | null
  weight_kg?: number | null
  reps?: number | null
}

// ---- Momentum Calculator ----

export type MomentumStatus = 'peak' | 'good' | 'declining' | 'fatigue' | 'deload'
export type MomentumSignal =
  | 'e1rm_rising' | 'e1rm_dropping'
  | 'rpe_improving' | 'rpe_degrading'
  | 'reps_peak' | 'reps_dropping'

export interface MomentumResult {
  score: number
  status: MomentumStatus
  message: string
  signals: MomentumSignal[]
  showPRHint: boolean
  totalSets: number
}

// ---- Performance Forecast ----

export interface ForecastSession {
  date: string
  fullDate?: string
  bestE1rm?: number
  e1rm?: number
}

export interface RegressionResult {
  slope: number
  intercept: number
}

export interface ForecastChartPoint {
  x: number
  e1rm: number | null
  forecast: number | null
}

export type ForecastStatus = 'insufficient' | 'plateau' | 'positive' | 'break'

export interface ForecastResult {
  status: ForecastStatus
  forecastDate?: string
  currentPR?: number
  targetPR?: number
  sessionsNeeded?: number
  weeksNeeded?: number
  slope?: number
  chartData?: ForecastChartPoint[]
  stale?: boolean
  message?: string
}

// ---- Optimal Hour ----

export type TimeSlotLabel = '06-08' | '08-10' | '10-12' | '12-14' | '14-16' | '16-18' | '18-20' | '20-22'
export type OptimalHourConfidence = 'none' | 'low' | 'medium' | 'high'

export interface TimeSlotPerformance {
  slot: TimeSlotLabel
  hourStart: number
  hourEnd: number
  workoutCount: number
  avgVolume: number
  avgRpe: number
  performanceScore: number
  normalizedScore: number
}

export interface OptimalHourResult {
  hasEnoughData: boolean
  totalWorkouts: number
  slotsAnalyzed: number
  bestSlot: TimeSlotPerformance | null
  worstSlot: TimeSlotPerformance | null
  allSlots: TimeSlotPerformance[]
  percentageDifference: number
  confidence: OptimalHourConfidence
}

// ---- Plateau Detection ----

export type PlateauStatus = 'plateau' | 'slowing'

export interface PlateauWeekData {
  week: string
  e1rm: number
}

export interface PlateauResult {
  exercise: string
  currentE1rm: number
  weeksOfData: number
  weeklyData: PlateauWeekData[]
  status: PlateauStatus
  weeklyGrowthPct: string
  recommendation: string
}

// ---- PR Detection ----

export type PRType = 'weight' | 'e1rm'

export interface PRDetectionResult {
  isPR: boolean
  type: PRType
  previousBest: number
  newBest: number
  improvement: number
}

export interface PRRecord {
  bestWeight: number
  bestReps: number
  bestE1RM: number
  date: string
  muscleGroup: string
}

export interface PRDisplayRecord extends PRRecord {
  exercise: string
}

// ---- Superset Architect (lib types) ----

export interface SupersetExerciseInput {
  name: string
  muscle_group?: string
  primary_muscles?: string[]
  sets?: number
  plan?: {
    sets?: number
    reps_min?: number
    reps_max?: number
    rpe_target?: number
    rest_seconds?: number
  }
}

export interface SupersetGroupResult {
  type: 'superset' | 'single'
  exercises: SupersetExerciseInput[]
  restBetween: number
  restAfter: number
  pairReason?: string
}

export interface TimeSavings {
  normalMinutes: number
  supersetMinutes: number
  savedMinutes: number
  savedPercent: number
  supersets: SupersetGroupResult[]
  hasSupersets: boolean
}

// ---- Warmup Calculator ----

export interface WarmupSet {
  weight_kg: number
  reps: number
  label: string
  isBarOnly: boolean
  isWarmup?: boolean
}

// ---- Exercise Substitutes (static) ----

export type SubstitutionReason = 'machine_busy' | 'no_equipment' | 'injury' | 'default'
export type EquipmentType = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight'

export interface StaticExercise {
  name: string
  muscle_group: string
  equipment: EquipmentType
}

export interface SubstituteOption {
  name: string
  muscle_group: string
  equipment?: EquipmentType
  weight_kg: number
  sets: number
  reps_min: number
  reps_max: number
  rpe_target: number
  rest_seconds: number
  notes: string
}

export interface SubstituteOptionsInput {
  exercise: {
    name: string
    muscle_group?: string
    weight_kg?: number
    plan?: {
      sets?: number
      reps_min?: number
      reps_max?: number
      rpe_target?: number
      rest_seconds?: number
      weight_kg?: number
    }
  }
  equipment: string
  excludeNames?: string[]
  max?: number
}

// ---- Volume Tracker ----

export type TrendDirection = 'up' | 'down' | 'flat'

export interface WeeklyVolumeEntry {
  label: string
  weekStart: Date
  totalVolume: number
  workoutCount: number
}

export interface MonthlyVolumeEntry {
  label: string
  month: Date
  totalVolume: number
  workoutCount: number
}

export interface VolumeTrend {
  direction: TrendDirection
  pct: number
}

// ---- Weakness Hunter ----

export type DetailedMuscleGroup =
  | 'chest' | 'back' | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves'
  | 'shoulders_front' | 'shoulders_rear' | 'shoulders_side'
  | 'biceps' | 'triceps' | 'core'

export type SimpleMuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core'

export interface AntagonistPair {
  agonist: DetailedMuscleGroup
  antagonist: DetailedMuscleGroup
  ideal: number
  advice: string
}

export interface MuscleImbalance {
  dominant: DetailedMuscleGroup
  dominantNL: string
  weak: DetailedMuscleGroup
  weakNL: string
  dominantSets: number
  weakSets: number
  ratio: number
  idealRatio: number
  deficit: number
  severity: 'high' | 'medium'
  advice: string
}

export interface SortedMuscleGroup {
  key: string
  name: string
  sets: number
  percentage: number
}

export interface WeaknessAnalysis {
  volumeMap: Record<string, number>
  simpleVolumeMap: Record<string, number>
  sortedGroups: SortedMuscleGroup[]
  imbalances: MuscleImbalance[]
  weeksBack: number
  totalSets: number
  workoutCount: number
  hasEnoughData: boolean
}

// ---- Auth Context ----

export interface AuthContextValue {
  user: import('@supabase/auth-js').User | null
  loading: boolean
  sendOtp: (email: string) => Promise<{ error: import('@supabase/auth-js').AuthError | null }>
  verifyOtp: (email: string, token: string) => Promise<{
    data: { user: import('@supabase/auth-js').User | null; session: import('@supabase/auth-js').Session | null }
    error: import('@supabase/auth-js').AuthError | null
  }>
  signIn: (email: string) => Promise<{ error: import('@supabase/auth-js').AuthError | null }>
  signOut: () => Promise<{ error: import('@supabase/auth-js').AuthError | null }>
  settings: UserSettings
  updateSettings: (newSettings: Partial<UserSettings>) => UserSettings
  settingsLoaded: boolean
  isBeginnerMode: boolean
}

// ---- Login Props ----

export interface LoginProps {
  onSendOtp: (email: string) => Promise<{ error: import('@supabase/auth-js').AuthError | null }>
  onVerifyOtp: (email: string, token: string) => Promise<{
    data: { user: import('@supabase/auth-js').User | null; session: import('@supabase/auth-js').Session | null }
    error: import('@supabase/auth-js').AuthError | null
  }>
}

// ---- Component Props ----

export interface RestTimerBarProps {
  remaining: number
  total: number
  onStop: () => void
}

export interface VolumeChartProps {
  data: WeeklyVolumeEntry[] | MonthlyVolumeEntry[]
  unit?: string
}

export interface PlateauAlertProps {
  workouts: Workout[]
  maxItems?: number
}

export interface PerformanceForecastProps {
  sessions: ForecastSession[]
  exerciseName: string
}

export interface MomentumIndicatorProps {
  momentum: MomentumResult | null
}

export interface MuscleMapProps {
  muscleStatus?: Partial<Record<MuscleGroup, MuscleStatus>>
}

export interface DeloadAlertProps {
  workouts: Workout[]
  settings: UserSettings & { deload_dismissed_until?: string }
  updateSettings?: (settings: Record<string, unknown>) => void
}

export interface PlateCalculatorProps {
  targetWeight?: number
  onClose: () => void
}

export interface FormDetectiveProps {
  workouts: Workout[]
  userId: string | undefined
}

export interface FinishModalResult {
  id?: string
  duration: number
  workout_sets: Array<{
    exercise: string
    weight_kg: number | null
    reps: number | null
    rpe: number | null
    [key: string]: unknown
  }>
  totalVolume: number
  exerciseNames: string[]
  exercises?: ActiveExercise[]
  [key: string]: unknown
}

export interface FinishModalProps {
  result: FinishModalResult
  onClose: () => void
  onSaveTemplate?: (name: string) => Promise<void>
}

export interface SupersetModalProps {
  exercises: SupersetExerciseInput[]
  onApply: (exercises: SupersetExerciseInput[], supersets: SupersetGroupResult[]) => void
  onClose: () => void
}

export interface InjuryRadarProps {
  workouts: Workout[]
}

export interface WeaknessHunterProps {
  workouts: Workout[]
  priorityMuscles?: string[]
}

export interface JunkVolumeAlertProps {
  warning: (JunkVolumeWarning & { recommendation?: string }) | null
  onDismiss: () => void
}

export interface ExerciseGuideExercise {
  name: string
  muscle_group?: string
  image_url_0?: string | null
  image_url_1?: string | null
}

export interface ExerciseGuideProps {
  exercise: ExerciseGuideExercise
  onClose: () => void
}

export interface BlockWizardProps {
  isOpen: boolean
  onClose: () => void
  onStart: (phaseKey: string, userId: string | undefined, fullPlan?: string[]) => Promise<void>
  userId: string | undefined
}

export interface ExercisePickerExercise {
  id?: string
  name: string
  muscle_group: string
  equipment?: string
  category?: string
  subfocus?: string
}

export interface ExercisePickerProps {
  exercises: ExercisePickerExercise[]
  addedNames?: string[]
  onSelect: (exercise: ExercisePickerExercise) => void
  onClose: () => void
}

export interface TemplateExercise {
  name: string
  [key: string]: unknown
}

export interface Template {
  id: string
  name: string
  exercises: TemplateExercise[] | string
}

export interface TemplateLibraryProps {
  templates: Template[]
  onLoad: (template: Template) => void
  onDelete: (id: string) => void
  onClose: () => void
}

// ---- Injury Radar Lib Types ----

export type InjuryRiskLevel = 'hoog' | 'matig'
export type InjuryRiskType = 'volume_spike' | 'imbalance' | 'high_rpe' | 'recovery'

export interface InjuryRisk {
  muscle: string
  level: InjuryRiskLevel
  type: InjuryRiskType
  reason: string
}

// ---- Injury Recovery System Types ----
// Re-exported from src/lib/injuryRecovery.ts for convenience

export type { InjuryArea, InjurySeverity, InjurySide, InjuryStatus, CheckInFeeling } from '../lib/injuryRecovery'
export type { ActiveInjury, InjuryCheckIn, RehabExercise, InjuryAreaConfig, RecoveryGuidance, FilteredExercise } from '../lib/injuryRecovery'
