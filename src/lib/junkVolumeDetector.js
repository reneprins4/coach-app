/**
 * Junk Volume Detector
 * Waarschuwt wanneer set-kwaliteit daalt (RPE stijgt of reps dalen bij gelijk gewicht)
 * Dit wijst op training voorbij MRV - "junk volume" dat herstel kost zonder stimulus.
 */

/**
 * Detecteer junk volume op basis van set-kwaliteit degradatie
 * @param {string} exerciseName - Naam van de oefening
 * @param {Array} allSetsThisExercise - Alle sets voor deze oefening in huidige workout
 * @returns {Object|null} Warning object of null als geen probleem
 */
export function detectJunkVolume(exerciseName, allSetsThisExercise) {
  // Minimaal 3 sets nodig voor trend detectie
  if (!allSetsThisExercise || allSetsThisExercise.length < 3) return null

  // Check RPE trend: stijgt RPE terwijl gewicht gelijk blijft?
  const setsWithRPE = allSetsThisExercise.filter(s => s.rpe && s.weight_kg)
  if (setsWithRPE.length >= 3) {
    const recent = setsWithRPE.slice(-3)
    const firstRPE = recent[0].rpe
    const lastRPE = recent[recent.length - 1].rpe
    const avgWeight = recent.reduce((s, x) => s + x.weight_kg, 0) / recent.length
    const lastWeight = recent[recent.length - 1].weight_kg

    // RPE gestegen >= 1.5 bij gelijk of lager gewicht = dalende set kwaliteit
    const rpeDrift = lastRPE - firstRPE
    const weightDropped = lastWeight <= avgWeight

    if (rpeDrift >= 1.5 && weightDropped) {
      const severity = rpeDrift >= 2.5 ? 'high' : 'medium'
      return {
        type: 'set_quality_degradation',
        exercise: exerciseName,
        rpeDrift: rpeDrift.toFixed(1),
        severity,
        message: severity === 'high'
          ? `RPE stijgt sterk (+${rpeDrift.toFixed(1)}) bij gelijk gewicht. Stop of verlaag gewicht.`
          : `Set kwaliteit daalt (+${rpeDrift.toFixed(1)} RPE). Overweeg dit de laatste set te maken.`,
        recommendation: severity === 'high'
          ? 'Stop met deze oefening. Resterende sets zijn junk volume.'
          : 'Nog 1 set maximaal. Kwaliteit gaat voor kwantiteit.'
      }
    }
  }

  // Check reps trend: dalen reps significant bij zelfde gewicht?
  const setsWithReps = allSetsThisExercise.filter(s => s.reps && s.weight_kg)
  if (setsWithReps.length >= 3) {
    const recentReps = setsWithReps.slice(-3)
    const firstReps = recentReps[0].reps
    const lastReps = recentReps[recentReps.length - 1].reps
    const firstWeight = recentReps[0].weight_kg
    const lastWeight = recentReps[recentReps.length - 1].weight_kg

    // Reps dalen >= 25% bij gelijk of hoger gewicht
    if (firstReps > 0) {
      const repDrop = (firstReps - lastReps) / firstReps
      const weightSameOrHigher = lastWeight >= firstWeight * 0.95

      if (repDrop >= 0.25 && weightSameOrHigher) {
        const severity = repDrop >= 0.35 ? 'high' : 'medium'
        return {
          type: 'reps_degradation',
          exercise: exerciseName,
          repDropPct: Math.round(repDrop * 100),
          severity,
          message: `Reps dalen significant (-${Math.round(repDrop * 100)}%) bij zelfde gewicht.`,
          recommendation: severity === 'high'
            ? 'Stop met deze oefening. Je hebt voldoende stimulus gegeven.'
            : 'Verlaag gewicht of maak dit de laatste set.'
        }
      }
    }
  }

  return null
}
