import { AlertTriangle } from 'lucide-react'
import { classifyExercise } from '../lib/training-analysis'

// Recovery hours per muscle group (from training-analysis.js)
const RECOVERY_HOURS = {
  chest: 72, back: 72, shoulders: 48, quads: 96,
  hamstrings: 72, glutes: 72, biceps: 48, triceps: 48, core: 24,
}

const MUSCLE_NL = {
  chest: 'Borst', back: 'Rug', shoulders: 'Schouders', biceps: 'Biceps',
  triceps: 'Triceps', quads: 'Quadriceps', hamstrings: 'Hamstrings',
  glutes: 'Billen', core: 'Core', push: 'Push', pull: 'Pull'
}

// Push/Pull muscle groups
const PUSH_MUSCLES = ['chest', 'shoulders', 'triceps']
const PULL_MUSCLES = ['back', 'biceps']

/**
 * Calculate volume (sets * reps * kg) per muscle group per week
 */
export function calculateWeeklyVolume(workouts, weeksBack = 1) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (weeksBack * 7))
  const weekEnd = weeksBack > 1 
    ? new Date(now.getTime() - ((weeksBack - 1) * 7 * 86400000))
    : now

  const volume = {}
  
  for (const w of workouts) {
    const date = new Date(w.created_at)
    if (date < weekStart || date > weekEnd) continue
    
    for (const s of (w.workout_sets || [])) {
      const muscle = classifyExercise(s.exercise)
      if (!muscle) continue
      
      const setVolume = (s.weight_kg || 0) * (s.reps || 0)
      volume[muscle] = (volume[muscle] || 0) + setVolume
    }
  }
  
  return volume
}

/**
 * Detect volume spikes (>30% = high, 15-30% = moderate)
 */
export function detectVolumeSpikes(workouts) {
  const risks = []
  const thisWeekVolume = calculateWeeklyVolume(workouts, 1)
  
  // Calculate 4-week average
  const avgVolume = {}
  for (let week = 2; week <= 5; week++) {
    const weekVol = calculateWeeklyVolume(workouts, week)
    for (const [muscle, vol] of Object.entries(weekVol)) {
      avgVolume[muscle] = (avgVolume[muscle] || 0) + vol / 4
    }
  }
  
  for (const [muscle, currentVol] of Object.entries(thisWeekVolume)) {
    const avg = avgVolume[muscle] || 0
    if (avg === 0) continue
    
    const increase = ((currentVol - avg) / avg) * 100
    
    if (increase > 30) {
      risks.push({
        muscle,
        level: 'hoog',
        type: 'volume_spike',
        reason: `Volume ${Math.round(increase)}% hoger dan 4-weeks gemiddelde`
      })
    } else if (increase > 15) {
      risks.push({
        muscle,
        level: 'matig',
        type: 'volume_spike',
        reason: `Volume ${Math.round(increase)}% hoger dan 4-weeks gemiddelde`
      })
    }
  }
  
  return risks
}

/**
 * Detect muscle imbalances between antagonist pairs
 */
export function detectMuscleImbalances(workouts) {
  const risks = []
  const volume = calculateWeeklyVolume(workouts, 1)
  
  // Push vs Pull
  const pushVolume = PUSH_MUSCLES.reduce((sum, m) => sum + (volume[m] || 0), 0)
  const pullVolume = PULL_MUSCLES.reduce((sum, m) => sum + (volume[m] || 0), 0)
  
  if (pushVolume > 0 && pullVolume > 0) {
    const pushPullRatio = pushVolume / pullVolume
    const pullPushRatio = pullVolume / pushVolume
    
    if (pushPullRatio > 2 || pullPushRatio > 2) {
      risks.push({
        muscle: pushPullRatio > 2 ? 'push' : 'pull',
        level: 'hoog',
        type: 'imbalance',
        reason: `Push/Pull disbalans: ratio ${Math.max(pushPullRatio, pullPushRatio).toFixed(1)}x`
      })
    } else if (pushPullRatio > 1.5 || pullPushRatio > 1.5) {
      risks.push({
        muscle: pushPullRatio > 1.5 ? 'push' : 'pull',
        level: 'matig',
        type: 'imbalance',
        reason: `Push/Pull disbalans: ratio ${Math.max(pushPullRatio, pullPushRatio).toFixed(1)}x`
      })
    }
  }
  
  // Quad vs Hamstring
  const quadVolume = volume.quads || 0
  const hamVolume = volume.hamstrings || 0
  
  if (quadVolume > 0 && hamVolume > 0) {
    const quadHamRatio = quadVolume / hamVolume
    const hamQuadRatio = hamVolume / quadVolume
    
    if (quadHamRatio > 2) {
      risks.push({
        muscle: 'quads',
        level: quadHamRatio > 3 ? 'hoog' : 'matig',
        type: 'imbalance',
        reason: `Quad/Hamstring disbalans: ratio ${quadHamRatio.toFixed(1)}x`
      })
    } else if (hamQuadRatio > 2) {
      risks.push({
        muscle: 'hamstrings',
        level: hamQuadRatio > 3 ? 'hoog' : 'matig',
        type: 'imbalance',
        reason: `Hamstring/Quad disbalans: ratio ${hamQuadRatio.toFixed(1)}x`
      })
    }
  }
  
  return risks
}

/**
 * Detect consecutive high RPE sessions without deload
 */
export function detectConsecutiveHighRPE(workouts) {
  const risks = []
  const muscleRPESessions = {}
  
  // Sort workouts by date (newest first is already the case)
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
  
  // Track consecutive high RPE per muscle
  for (const w of sortedWorkouts) {
    const musclesInWorkout = new Set()
    
    for (const s of (w.workout_sets || [])) {
      const muscle = classifyExercise(s.exercise)
      if (!muscle || musclesInWorkout.has(muscle)) continue
      musclesInWorkout.add(muscle)
      
      const rpe = s.rpe
      if (!muscleRPESessions[muscle]) {
        muscleRPESessions[muscle] = { consecutive: 0, hasDeload: false }
      }
      
      if (rpe !== null && rpe !== undefined) {
        if (rpe >= 8.5) {
          if (!muscleRPESessions[muscle].hasDeload) {
            muscleRPESessions[muscle].consecutive++
          }
        } else if (rpe <= 6) {
          // Deload detected
          muscleRPESessions[muscle].hasDeload = true
        }
      }
    }
  }
  
  for (const [muscle, data] of Object.entries(muscleRPESessions)) {
    if (data.consecutive >= 4) {
      risks.push({
        muscle,
        level: 'hoog',
        type: 'high_rpe',
        reason: `${data.consecutive} sessies achtereen met RPE 8.5+ zonder deload`
      })
    } else if (data.consecutive >= 3) {
      risks.push({
        muscle,
        level: 'matig',
        type: 'high_rpe',
        reason: `${data.consecutive} sessies achtereen met RPE 8.5+ zonder deload`
      })
    }
  }
  
  return risks
}

/**
 * Detect insufficient recovery (<50% recovery when trained)
 */
export function detectInsufficientRecovery(workouts) {
  const risks = []
  const muscleWarnings = {}
  
  // Sort workouts chronologically
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )
  
  const lastTrained = {}
  
  for (const w of sorted) {
    const workoutDate = new Date(w.created_at)
    const musclesInWorkout = new Set()
    
    for (const s of (w.workout_sets || [])) {
      const muscle = classifyExercise(s.exercise)
      if (!muscle || musclesInWorkout.has(muscle)) continue
      musclesInWorkout.add(muscle)
      
      if (lastTrained[muscle]) {
        const hoursSince = (workoutDate - lastTrained[muscle]) / 3600000
        const recoveryHours = RECOVERY_HOURS[muscle] || 72
        const recoveryPct = Math.min(100, (hoursSince / recoveryHours) * 100)
        
        if (recoveryPct < 50) {
          muscleWarnings[muscle] = (muscleWarnings[muscle] || 0) + 1
        }
      }
      
      lastTrained[muscle] = workoutDate
    }
  }
  
  for (const [muscle, count] of Object.entries(muscleWarnings)) {
    if (count > 0) {
      risks.push({
        muscle,
        level: count >= 3 ? 'hoog' : 'matig',
        type: 'recovery',
        reason: `${count}x getraind met minder dan 50% herstel`
      })
    }
  }
  
  return risks
}

/**
 * Combine all risk factors and sort by severity
 */
export function analyzeInjuryRisks(workouts) {
  if (!workouts || workouts.length < 4) return []
  
  const allRisks = [
    ...detectVolumeSpikes(workouts),
    ...detectMuscleImbalances(workouts),
    ...detectConsecutiveHighRPE(workouts),
    ...detectInsufficientRecovery(workouts),
  ]
  
  // Sort by level (hoog first) then dedupe by muscle
  const levelOrder = { hoog: 0, matig: 1 }
  allRisks.sort((a, b) => levelOrder[a.level] - levelOrder[b.level])
  
  // Keep only highest risk per muscle
  const seen = new Set()
  const filtered = []
  for (const risk of allRisks) {
    if (!seen.has(risk.muscle)) {
      seen.add(risk.muscle)
      filtered.push(risk)
    }
  }
  
  return filtered.slice(0, 3) // Max 3 risks
}

export default function InjuryRadar({ workouts }) {
  const risks = analyzeInjuryRisks(workouts)
  
  if (risks.length === 0) return null
  
  return (
    <div className="mb-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-cyan-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Blessurerisico detectie
        </span>
      </div>
      <div className="space-y-2">
        {risks.map((risk, i) => (
          <div key={`${risk.muscle}-${risk.type}-${i}`} className="flex items-start gap-3">
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              risk.level === 'hoog' 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {risk.level}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {MUSCLE_NL[risk.muscle] || risk.muscle}
              </p>
              <p className="text-xs text-gray-400">{risk.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
