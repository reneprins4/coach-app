import { describe, it, expect } from 'vitest'
import {
  calculateWeeklyVolume,
  detectVolumeSpikes,
  detectMuscleImbalances,
  detectConsecutiveHighRPE,
  detectInsufficientRecovery,
  analyzeInjuryRisks,
} from '../../components/InjuryRadar'

// Helper to create mock workouts
function createWorkout(daysAgo, sets) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    id: `w-${daysAgo}-${Math.random()}`,
    created_at: date.toISOString(),
    workout_sets: sets.map((s, i) => ({
      id: `s-${i}`,
      exercise: s.exercise,
      weight_kg: s.weight_kg || 50,
      reps: s.reps || 10,
      rpe: s.rpe ?? null,
    })),
  }
}

describe('calculateWeeklyVolume', () => {
  it('calculates volume for current week', () => {
    const workouts = [
      createWorkout(1, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
      ]),
    ]
    
    const volume = calculateWeeklyVolume(workouts, 1)
    expect(volume.chest).toBe(2000) // 100*10 + 100*10
  })

  it('excludes workouts outside the week range', () => {
    const workouts = [
      createWorkout(10, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
      ]),
    ]
    
    const volume = calculateWeeklyVolume(workouts, 1)
    expect(volume.chest).toBeUndefined()
  })
})

describe('detectVolumeSpikes', () => {
  it('detects high volume spike (>30%)', () => {
    // This week: high volume
    // Weeks 2-5: lower average
    const workouts = [
      // This week - 2600 volume
      createWorkout(1, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 80, reps: 10 },
      ]),
      // Week 2 - 500 volume
      createWorkout(10, [
        { exercise: 'Bench Press', weight_kg: 50, reps: 10 },
      ]),
      // Week 3 - 500 volume
      createWorkout(17, [
        { exercise: 'Bench Press', weight_kg: 50, reps: 10 },
      ]),
      // Week 4 - 500 volume
      createWorkout(24, [
        { exercise: 'Bench Press', weight_kg: 50, reps: 10 },
      ]),
      // Week 5 - 500 volume
      createWorkout(31, [
        { exercise: 'Bench Press', weight_kg: 50, reps: 10 },
      ]),
    ]
    
    const risks = detectVolumeSpikes(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    expect(chestRisk).toBeDefined()
    expect(chestRisk.level).toBe('hoog')
    expect(chestRisk.type).toBe('volume_spike')
  })

  it('detects moderate volume spike (15-30%)', () => {
    const workouts = [
      // This week - 1200 volume (20% increase from avg of 1000)
      createWorkout(1, [
        { exercise: 'Bench Press', weight_kg: 60, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 60, reps: 10 },
      ]),
      // Week 2-5: avg 1000 volume
      createWorkout(10, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
      createWorkout(17, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
      createWorkout(24, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
      createWorkout(31, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
    ]
    
    const risks = detectVolumeSpikes(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    expect(chestRisk).toBeDefined()
    expect(chestRisk.level).toBe('matig')
  })
})

describe('detectMuscleImbalances', () => {
  it('detects high push/pull imbalance (>2x)', () => {
    const workouts = [
      createWorkout(1, [
        // Push: 3000 volume
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 100, reps: 10 },
        // Pull: 1000 volume
        { exercise: 'Row', weight_kg: 100, reps: 10 },
      ]),
    ]
    
    const risks = detectMuscleImbalances(workouts)
    const imbalance = risks.find(r => r.type === 'imbalance' && (r.muscle === 'push' || r.muscle === 'pull'))
    expect(imbalance).toBeDefined()
    expect(imbalance.level).toBe('hoog')
  })

  it('detects moderate push/pull imbalance (1.5-2x)', () => {
    const workouts = [
      createWorkout(1, [
        // Push: 1800 volume
        { exercise: 'Bench Press', weight_kg: 90, reps: 10 },
        { exercise: 'Bench Press', weight_kg: 90, reps: 10 },
        // Pull: 1000 volume
        { exercise: 'Row', weight_kg: 100, reps: 10 },
      ]),
    ]
    
    const risks = detectMuscleImbalances(workouts)
    const imbalance = risks.find(r => r.type === 'imbalance')
    expect(imbalance).toBeDefined()
    expect(imbalance.level).toBe('matig')
  })

  it('detects quad/hamstring imbalance', () => {
    const workouts = [
      createWorkout(1, [
        // Quads: 4000 volume
        { exercise: 'Leg Press', weight_kg: 100, reps: 10 },
        { exercise: 'Leg Press', weight_kg: 100, reps: 10 },
        { exercise: 'Leg Press', weight_kg: 100, reps: 10 },
        { exercise: 'Leg Press', weight_kg: 100, reps: 10 },
        // Hamstrings: 500 volume (ratio = 8x -> hoog)
        { exercise: 'Leg Curl', weight_kg: 50, reps: 10 },
      ]),
    ]
    
    const risks = detectMuscleImbalances(workouts)
    const imbalance = risks.find(r => r.muscle === 'quads' || r.muscle === 'hamstrings')
    expect(imbalance).toBeDefined()
    expect(imbalance.type).toBe('imbalance')
  })
})

describe('detectConsecutiveHighRPE', () => {
  it('detects 4+ consecutive high RPE sessions (hoog)', () => {
    const workouts = [
      createWorkout(1, [{ exercise: 'Bench Press', rpe: 9 }]),
      createWorkout(4, [{ exercise: 'Bench Press', rpe: 8.5 }]),
      createWorkout(7, [{ exercise: 'Bench Press', rpe: 9 }]),
      createWorkout(10, [{ exercise: 'Bench Press', rpe: 8.5 }]),
    ]
    
    const risks = detectConsecutiveHighRPE(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    expect(chestRisk).toBeDefined()
    expect(chestRisk.level).toBe('hoog')
  })

  it('detects 3 consecutive high RPE sessions (matig)', () => {
    const workouts = [
      createWorkout(1, [{ exercise: 'Bench Press', rpe: 9 }]),
      createWorkout(4, [{ exercise: 'Bench Press', rpe: 8.5 }]),
      createWorkout(7, [{ exercise: 'Bench Press', rpe: 9 }]),
    ]
    
    const risks = detectConsecutiveHighRPE(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    expect(chestRisk).toBeDefined()
    expect(chestRisk.level).toBe('matig')
  })

  it('resets count after deload (RPE <= 6)', () => {
    const workouts = [
      createWorkout(1, [{ exercise: 'Bench Press', rpe: 9 }]),
      createWorkout(4, [{ exercise: 'Bench Press', rpe: 5 }]), // Deload
      createWorkout(7, [{ exercise: 'Bench Press', rpe: 9 }]),
      createWorkout(10, [{ exercise: 'Bench Press', rpe: 9 }]),
    ]
    
    const risks = detectConsecutiveHighRPE(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    // Should not trigger because deload breaks the chain
    expect(chestRisk).toBeUndefined()
  })
})

describe('detectInsufficientRecovery', () => {
  it('detects training with insufficient recovery (<50%)', () => {
    // Chest needs 72 hours recovery. Training at 24 hours = 33% recovery
    const workouts = [
      createWorkout(2, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
      createWorkout(1, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
    ]
    
    const risks = detectInsufficientRecovery(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    expect(chestRisk).toBeDefined()
    expect(chestRisk.type).toBe('recovery')
  })

  it('does not flag when recovery is sufficient', () => {
    // Chest trained 4 days apart = ~96 hours > 72 hours needed
    const workouts = [
      createWorkout(5, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
      createWorkout(1, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
    ]
    
    const risks = detectInsufficientRecovery(workouts)
    const chestRisk = risks.find(r => r.muscle === 'chest')
    expect(chestRisk).toBeUndefined()
  })
})

describe('analyzeInjuryRisks', () => {
  it('returns empty array if fewer than 4 workouts', () => {
    const workouts = [
      createWorkout(1, [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }]),
    ]
    
    const risks = analyzeInjuryRisks(workouts)
    expect(risks).toEqual([])
  })

  it('limits to max 3 risks', () => {
    // Create scenario with many risks
    const workouts = [
      createWorkout(1, [
        { exercise: 'Bench Press', weight_kg: 200, reps: 10, rpe: 9 },
        { exercise: 'Row', weight_kg: 50, reps: 10 },
        { exercise: 'Squat', weight_kg: 200, reps: 10 },
        { exercise: 'RDL', weight_kg: 30, reps: 10 },
      ]),
      createWorkout(2, [
        { exercise: 'Bench Press', weight_kg: 200, reps: 10, rpe: 9 },
      ]),
      createWorkout(3, [
        { exercise: 'Bench Press', weight_kg: 200, reps: 10, rpe: 9 },
      ]),
      createWorkout(4, [
        { exercise: 'Bench Press', weight_kg: 200, reps: 10, rpe: 9 },
      ]),
      // Historical data for volume comparison
      createWorkout(10, [{ exercise: 'Bench Press', weight_kg: 50, reps: 5 }]),
      createWorkout(17, [{ exercise: 'Bench Press', weight_kg: 50, reps: 5 }]),
      createWorkout(24, [{ exercise: 'Bench Press', weight_kg: 50, reps: 5 }]),
      createWorkout(31, [{ exercise: 'Bench Press', weight_kg: 50, reps: 5 }]),
    ]
    
    const risks = analyzeInjuryRisks(workouts)
    expect(risks.length).toBeLessThanOrEqual(3)
  })

  it('prioritizes high risks over moderate', () => {
    const workouts = [
      createWorkout(1, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 9 },
      ]),
      createWorkout(2, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 9 },
      ]),
      createWorkout(3, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 9 },
      ]),
      createWorkout(4, [
        { exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 9 },
      ]),
    ]
    
    const risks = analyzeInjuryRisks(workouts)
    if (risks.length > 1) {
      // First risk should be 'hoog' if any exists
      const hasHoog = risks.some(r => r.level === 'hoog')
      if (hasHoog) {
        expect(risks[0].level).toBe('hoog')
      }
    }
  })
})
