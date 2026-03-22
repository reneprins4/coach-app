/**
 * Exercise Name Normalization System (DATA-001)
 *
 * Resolves exercise name variants to canonical names from the exercise library.
 * Prevents PR history fragmentation when users log "Bench" vs "Bench Press"
 * vs "Flat Barbell Bench Press".
 *
 * Strategy:
 * 1. Exact match against library (case-insensitive)
 * 2. Explicit alias lookup (short names, abbreviations)
 * 3. Fuzzy matching: expand abbreviations, strip equipment prefixes/suffixes,
 *    remove plurals, then match against library
 */

// ---------------------------------------------------------------------------
// Canonical exercise names (sourced from FALLBACK library in useExercises.ts)
// Only the names that have common short-form aliases need entries here.
// ---------------------------------------------------------------------------

/** Map of lowercase alias -> canonical library name */
const ALIAS_MAP: Record<string, string> = {
  // ── Bench Press ──
  'bench':                        'Flat Barbell Bench Press',
  'bench press':                  'Flat Barbell Bench Press',
  'flat bench':                   'Flat Barbell Bench Press',
  'flat bench press':             'Flat Barbell Bench Press',
  'barbell bench':                'Flat Barbell Bench Press',
  'barbell bench press':          'Flat Barbell Bench Press',
  'bb bench':                     'Flat Barbell Bench Press',
  'bb bench press':               'Flat Barbell Bench Press',
  'flat bb bench press':          'Flat Barbell Bench Press',
  'bench press (barbell)':        'Flat Barbell Bench Press',

  // ── Incline Bench ──
  'incline bench':                'Incline Barbell Bench Press',
  'incline bench press':          'Incline Barbell Bench Press',
  'incline barbell bench':        'Incline Barbell Bench Press',
  'incline bb bench press':       'Incline Barbell Bench Press',
  'incline bb bench':             'Incline Barbell Bench Press',

  // ── Decline Bench ──
  'decline bench':                'Decline Barbell Bench Press',
  'decline bench press':          'Decline Barbell Bench Press',
  'decline barbell bench':        'Decline Barbell Bench Press',

  // ── Dumbbell Bench ──
  'db bench':                     'Flat Dumbbell Bench Press',
  'db bench press':               'Flat Dumbbell Bench Press',
  'dumbbell bench':               'Flat Dumbbell Bench Press',
  'dumbbell bench press':         'Flat Dumbbell Bench Press',
  'flat db bench press':          'Flat Dumbbell Bench Press',
  'flat dumbbell bench':          'Flat Dumbbell Bench Press',
  'bench press (dumbbell)':       'Flat Dumbbell Bench Press',

  // ── Incline DB Press ──
  'incline db press':             'Incline Dumbbell Press',
  'incline dumbbell press':       'Incline Dumbbell Press',
  'incline db bench press':       'Incline Dumbbell Press',
  'incline dumbbell bench press': 'Incline Dumbbell Press',

  // ── Squat ──
  'squat':                        'Back Squat',
  'squats':                       'Back Squat',
  'barbell squat':                'Back Squat',
  'bb squat':                     'Back Squat',
  'bb squats':                    'Back Squat',
  'back squats':                  'Back Squat',

  // ── Front Squat ──
  'front squats':                 'Front Squat',

  // ── Deadlift ──
  'deadlift':                     'Conventional Deadlift',
  'deadlifts':                    'Conventional Deadlift',
  'conventional':                 'Conventional Deadlift',
  'bb deadlift':                  'Conventional Deadlift',
  'barbell deadlift':             'Conventional Deadlift',

  // ── Romanian Deadlift ──
  'rdl':                          'Romanian Deadlift',
  'rdls':                         'Romanian Deadlift',
  'romanian':                     'Romanian Deadlift',
  'romanian deadlifts':           'Romanian Deadlift',
  'bb rdl':                       'Romanian Deadlift',
  'barbell rdl':                  'Romanian Deadlift',

  // ── DB Romanian Deadlift ──
  'db rdl':                       'Dumbbell Romanian Deadlift',
  'dumbbell rdl':                 'Dumbbell Romanian Deadlift',
  'db romanian deadlift':         'Dumbbell Romanian Deadlift',

  // ── Overhead Press ──
  'ohp':                          'Barbell Overhead Press',
  'overhead press':               'Barbell Overhead Press',
  'military press':               'Barbell Overhead Press',
  'bb overhead press':            'Barbell Overhead Press',
  'barbell overhead':             'Barbell Overhead Press',
  'standing press':               'Barbell Overhead Press',
  'bb ohp':                       'Barbell Overhead Press',

  // ── DB Overhead Press ──
  'db overhead press':            'Dumbbell Overhead Press',
  'db ohp':                       'Dumbbell Overhead Press',
  'dumbbell ohp':                 'Dumbbell Overhead Press',
  'db shoulder press':            'Dumbbell Overhead Press',
  'dumbbell shoulder press':      'Dumbbell Overhead Press',

  // ── Rows ──
  'bb row':                       'Barbell Row',
  'bb rows':                      'Barbell Row',
  'barbell rows':                 'Barbell Row',
  'bent over row':                'Barbell Row',
  'bent-over row':                'Barbell Row',
  'bent over rows':               'Barbell Row',

  'db row':                       'Dumbbell Row',
  'db rows':                      'Dumbbell Row',
  'dumbbell rows':                'Dumbbell Row',
  'one arm row':                  'Dumbbell Row',
  'one arm db row':               'Dumbbell Row',
  'single arm row':               'Dumbbell Row',

  // ── Curls ──
  'db curl':                      'Dumbbell Curl',
  'db curls':                     'Dumbbell Curl',
  'dumbbell curls':               'Dumbbell Curl',
  'bicep curl':                   'Dumbbell Curl',
  'bicep curls':                  'Dumbbell Curl',

  'bb curl':                      'Barbell Curl',
  'bb curls':                     'Barbell Curl',
  'barbell curls':                'Barbell Curl',

  'hammer curls':                 'Hammer Curl',

  // ── Pull-up / Chin-up ──
  'pullup':                       'Pull-up',
  'pullups':                      'Pull-up',
  'pull up':                      'Pull-up',
  'pull ups':                     'Pull-up',
  'pull-ups':                     'Pull-up',

  'chinup':                       'Chin-up',
  'chinups':                      'Chin-up',
  'chin up':                      'Chin-up',
  'chin ups':                     'Chin-up',
  'chin-ups':                     'Chin-up',

  // ── Lat Pulldown ──
  'lat pulldown':                 'Lat Pulldown (Wide)',
  'lat pull down':                'Lat Pulldown (Wide)',
  'lat pulldowns':                'Lat Pulldown (Wide)',
  'wide grip pulldown':           'Lat Pulldown (Wide)',

  'close grip pulldown':          'Lat Pulldown (Close)',
  'close grip lat pulldown':      'Lat Pulldown (Close)',

  // ── Lateral Raise ──
  'lateral raises':               'Lateral Raise',
  'lat raise':                    'Lateral Raise',
  'lat raises':                   'Lateral Raise',
  'side raise':                   'Lateral Raise',
  'side raises':                  'Lateral Raise',
  'db lateral raise':             'Lateral Raise',
  'db lateral raises':            'Lateral Raise',
  'dumbbell lateral raise':       'Lateral Raise',
  'dumbbell lateral raises':      'Lateral Raise',

  // ── Hip Thrust ──
  'hip thrusts':                  'Hip Thrust',
  'barbell hip thrust':           'Hip Thrust',
  'bb hip thrust':                'Hip Thrust',

  // ── Leg Press ──
  'leg press':                    'Leg Press',

  // ── Leg Curl ──
  'leg curl':                     'Lying Leg Curl',
  'leg curls':                    'Lying Leg Curl',
  'hamstring curl':               'Lying Leg Curl',
  'hamstring curls':              'Lying Leg Curl',

  // ── Calf Raise ──
  'calf raise':                   'Standing Calf Raise',
  'calf raises':                  'Standing Calf Raise',

  // ── Dip ──
  'dips':                         'Dip',
  'tricep dip':                   'Dip',
  'tricep dips':                  'Dip',

  // ── Skull Crusher ──
  'skull crushers':               'Skull Crusher',
  'skullcrushers':                'Skull Crusher',
  'skullcrusher':                 'Skull Crusher',

  // ── Tricep Pushdown ──
  'pushdown':                     'Tricep Pushdown',
  'pushdowns':                    'Tricep Pushdown',
  'tricep pushdowns':             'Tricep Pushdown',
  'cable pushdown':               'Tricep Pushdown',
  'cable pushdowns':              'Tricep Pushdown',

  // ── Face Pull ──
  'face pulls':                   'Face Pull',

  // ── Lunge ──
  'lunges':                       'Walking Lunges',
  'walking lunge':                'Walking Lunges',

  // ── Bulgarian Split Squat ──
  'bss':                          'Bulgarian Split Squat',
  'bulgarian':                    'Bulgarian Split Squat',
  'bulgarians':                   'Bulgarian Split Squat',
  'split squat':                  'Bulgarian Split Squat',
  'split squats':                 'Bulgarian Split Squat',

  // ── Plank ──
  'planks':                       'Plank',

  // ── Cable Fly ──
  'cable fly':                    'Cable Fly (Mid)',
  'cable flies':                  'Cable Fly (Mid)',
  'cable flys':                   'Cable Fly (Mid)',
}

// ---------------------------------------------------------------------------
// Canonical name set (built once, used for exact matching)
// ---------------------------------------------------------------------------

/**
 * Full list of canonical exercise names from the FALLBACK library.
 * This is used for exact-match lookups. Keeping it here (rather than importing
 * the FALLBACK array) avoids pulling React hooks into pure utility code.
 */
const CANONICAL_NAMES: string[] = [
  // Chest
  'Flat Barbell Bench Press', 'Incline Barbell Bench Press', 'Decline Barbell Bench Press',
  'Flat Dumbbell Bench Press', 'Incline Dumbbell Press', 'Decline Dumbbell Press',
  'Cable Fly (High)', 'Cable Fly (Mid)', 'Cable Fly (Low)', 'Pec Deck',
  'Push-up', 'Chest Dip', 'Smith Machine Bench Press', 'Smith Machine Incline Press',
  'Dumbbell Fly', 'Incline Dumbbell Fly', 'Machine Chest Press', 'Svend Press',
  'Cable Crossover', 'Machine Chest Fly', 'Wide Push-up', 'Decline Push-up',
  'Archer Push-up', 'Kettlebell Floor Press', 'Band Chest Press', 'Man Maker',
  // Back
  'Conventional Deadlift', 'Barbell Row', 'Pendlay Row', 'T-Bar Row',
  'Seated Cable Row', 'Dumbbell Row', 'Chest Supported Row', 'Pull-up', 'Chin-up',
  'Lat Pulldown (Wide)', 'Lat Pulldown (Close)', 'Straight Arm Pulldown',
  'Hyperextension', 'Meadows Row', 'Rack Pull', 'Deficit Deadlift',
  'Cable Row (Wide Grip)', 'Single Arm Cable Row', 'Machine Row', 'Inverted Row',
  'Kroc Row', 'Smith Machine Row', 'Snatch Grip Deadlift', 'Trap Bar Deadlift',
  'Renegade Row', 'Machine Lat Pulldown', 'Cable Reverse Fly', 'Cable Lat Prayer',
  'Kettlebell Row', 'Band Row', 'Commando Pull-up', 'Muscle Up',
  // Shoulders
  'Barbell Overhead Press', 'Dumbbell Overhead Press', 'Arnold Press',
  'Lateral Raise', 'Cable Lateral Raise', 'Face Pull', 'Rear Delt Fly',
  'Upright Row', 'Machine Shoulder Press', 'Machine Lateral Raise',
  'Cable Rear Delt Fly', 'Barbell Shrug', 'Seated Dumbbell Press', 'Push Press',
  'Smith Machine Overhead Press', 'Dumbbell Front Raise', 'Cable Front Raise',
  'Reverse Pec Deck', 'Dumbbell Shrug', 'Cable Shrug',
  'Kettlebell Overhead Press', 'Landmine Press', 'Lu Raise', 'Band Pull-Apart',
  'Pike Push-up', 'Handstand Push-up', 'Cable Upright Row', 'Cable Face Pull (Rope)',
  'Machine Rear Delt Fly', 'Kettlebell Halo', 'Band Lateral Raise', 'Band Face Pull',
  'Clean and Press', 'Kettlebell Clean', 'Kettlebell Snatch', 'Battle Rope Slam',
  // Legs
  'Back Squat', 'Front Squat', 'Bulgarian Split Squat', 'Leg Press', 'Hack Squat',
  'Walking Lunges', 'Hip Thrust', 'Romanian Deadlift', 'Lying Leg Curl',
  'Seated Leg Curl', 'Nordic Curl', 'Leg Extension', 'Standing Calf Raise',
  'Seated Calf Raise', 'Sumo Deadlift', 'Glute Bridge', 'Cable Kickback',
  'Goblet Squat', 'Kettlebell Goblet Squat', 'Smith Machine Squat', 'Sissy Squat',
  'Step-Up', 'Reverse Lunge', 'Barbell Lunge', 'Pendulum Squat', 'Belt Squat',
  'Cyclist Squat', 'Wall Sit', 'Pistol Squat', 'Box Squat', 'Safety Bar Squat',
  'Stiff Leg Deadlift', 'Dumbbell Romanian Deadlift', 'Single Leg Romanian Deadlift',
  'Kettlebell Swing', 'Good Morning', 'Glute Ham Raise', 'Slider Leg Curl',
  'Cable Pull Through', 'Barbell Glute Bridge', 'Single Leg Hip Thrust',
  'Cable Hip Abduction', 'Banded Clamshell', 'Frog Pump', 'Smith Machine Hip Thrust',
  'Lateral Band Walk', 'Donkey Calf Raise', 'Single Leg Calf Raise',
  'Leg Press Calf Raise', 'Barbell Calf Raise', 'Smith Machine Calf Raise',
  'Tibialis Raise', 'Thrusters', 'Burpee', 'Machine Leg Press (Narrow)',
  'Machine Leg Press (Wide)', 'Smith Machine Lunge', 'Machine Hip Thrust',
  'Hip Adduction Machine', 'Hip Abduction Machine', 'Kettlebell Front Squat',
  'Kettlebell Deadlift', 'Kettlebell Sumo Squat', 'Band Squat', 'Band Good Morning',
  'Band Hip Thrust', 'Band Leg Curl', 'Bodyweight Squat', 'Jump Squat',
  'Box Jump', 'Cossack Squat',
  // Arms
  'Barbell Curl', 'EZ-Bar Curl', 'Dumbbell Curl', 'Hammer Curl',
  'Incline Dumbbell Curl', 'Cable Curl', 'Preacher Curl', 'Concentration Curl',
  'Tricep Pushdown', 'Overhead Tricep Extension', 'Skull Crusher',
  'Close Grip Bench Press', 'Tricep Kickback', 'Diamond Push-up', 'Spider Curl',
  'Cable Hammer Curl', 'Reverse Barbell Curl', 'Machine Preacher Curl',
  'Bayesian Cable Curl', 'Cross Body Hammer Curl', 'Zottman Curl',
  '21s Barbell Curl', 'Dip', 'Overhead Dumbbell Extension', 'Cable Overhead Extension',
  'JM Press', 'Bench Dip', 'Single Arm Pushdown', 'Machine Tricep Extension',
  'Wrist Curl', 'Reverse Wrist Curl', 'Farmer Walk', 'Plate Pinch Hold',
  'Dead Hang', 'Kettlebell Farmer Walk', 'Machine Bicep Curl',
  'Smith Machine Close Grip Press', 'Band Curl', 'Band Tricep Extension',
  // Core
  'Plank', 'Ab Wheel Rollout', 'Cable Crunch', 'Hanging Leg Raise', 'Pallof Press',
  'Dead Bug', 'Side Plank', 'Russian Twist', 'Bicycle Crunch', 'Dragon Flag',
  'V-Up', 'Cable Woodchop', 'Decline Sit-Up', 'Weighted Plank', 'Mountain Climber',
  'Toe Touch', 'Flutter Kick', 'L-Sit Hold', 'Hollow Body Hold', 'Copenhagen Plank',
  'Suitcase Carry', 'Turkish Get-Up', 'Bear Crawl', 'Band Anti-Rotation Hold',
  'Hanging Knee Raise', 'Machine Abdominal Crunch', 'Kettlebell Windmill',
]

/** Lowercase canonical name -> original canonical name */
const CANONICAL_LOOKUP: Map<string, string> = new Map(
  CANONICAL_NAMES.map(name => [name.toLowerCase(), name])
)

// ---------------------------------------------------------------------------
// Reverse alias map: canonical name -> list of aliases (for getExerciseAliases)
// ---------------------------------------------------------------------------
const REVERSE_ALIAS_MAP: Map<string, string[]> = new Map()
for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
  if (!REVERSE_ALIAS_MAP.has(canonical)) {
    REVERSE_ALIAS_MAP.set(canonical, [])
  }
  REVERSE_ALIAS_MAP.get(canonical)!.push(alias)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize an exercise name to its canonical library form.
 *
 * Resolution order:
 * 1. Empty / whitespace -> ""
 * 2. Exact match in canonical library (case-insensitive)
 * 3. Alias lookup after basic cleaning (trim, lowercase, strip parentheticals, plurals)
 * 4. Abbreviation expansion + alias lookup
 * 5. Fallback: return cleaned/title-cased input
 */
export function normalizeExerciseName(name: string): string {
  if (!name || !name.trim()) return ''

  const trimmed = name.trim()

  // 1. Exact canonical match (case-insensitive)
  const exactMatch = CANONICAL_LOOKUP.get(trimmed.toLowerCase())
  if (exactMatch) return exactMatch

  // 2. Clean and try alias lookup + canonical lookup
  const cleaned = clean(trimmed)
  const aliasMatch = ALIAS_MAP[cleaned]
  if (aliasMatch) return aliasMatch
  const cleanedCanonical = CANONICAL_LOOKUP.get(cleaned)
  if (cleanedCanonical) return cleanedCanonical

  // 3. Expand abbreviations and try alias lookup
  const expanded = expandAbbreviations(cleaned)
  if (expanded !== cleaned) {
    const expandedAlias = ALIAS_MAP[expanded]
    if (expandedAlias) return expandedAlias

    // Try canonical match after expansion
    const expandedCanonical = CANONICAL_LOOKUP.get(expanded)
    if (expandedCanonical) return expandedCanonical
  }

  // 4. Strip equipment prefixes/suffixes and retry
  const stripped = stripEquipment(expanded)
  if (stripped !== expanded) {
    const strippedAlias = ALIAS_MAP[stripped]
    if (strippedAlias) return strippedAlias
  }

  // 5. Fallback: return title-cased cleaned input
  return titleCase(trimmed.trim())
}

/**
 * Check if two exercise names refer to the same canonical exercise.
 */
export function areExercisesEquivalent(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false
  // Quick case-insensitive check
  if (name1.toLowerCase().trim() === name2.toLowerCase().trim()) return true
  return normalizeExerciseName(name1) === normalizeExerciseName(name2)
}

/**
 * Get all known aliases for a canonical exercise name.
 * Returns lowercase alias strings.
 */
export function getExerciseAliases(canonicalName: string): string[] {
  return REVERSE_ALIAS_MAP.get(canonicalName) ?? []
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Basic cleaning: lowercase, trim, strip parenthetical suffixes, strip trailing 's' for plurals */
function clean(input: string): string {
  let s = input.toLowerCase().trim()

  // Strip parenthetical suffixes like "(barbell)", "(dumbbell)"
  s = s.replace(/\s*\((?:barbell|dumbbell|cable|machine|smith machine|ez bar|kettlebell|bodyweight|resistance band)\)\s*$/, '')

  // Strip trailing 's' for common exercise plurals, but be careful:
  // - Don't strip from words like "press", "ross" etc.
  // - Only strip from exercise-like words
  s = s.replace(/\b(curl|raise|squat|lunge|row|thrust|dip|fly|crunch|deadlift|shrug|pushdown|kickback|extension|crusher|plank)s\b/g, '$1')
  // Handle hyphenated plurals: "pull-ups" -> "pull-up", "chin-ups" -> "chin-up"
  s = s.replace(/\b(pull-up|chin-up|pullup|chinup)s\b/g, '$1')

  return s.trim()
}

/** Expand common abbreviations */
function expandAbbreviations(input: string): string {
  let s = input
  // Word-boundary replacements
  s = s.replace(/\bbb\b/g, 'barbell')
  s = s.replace(/\bdb\b/g, 'dumbbell')
  s = s.replace(/\bez\b/g, 'ez-bar')
  s = s.replace(/\bsm\b/g, 'smith machine')
  s = s.replace(/\bkb\b/g, 'kettlebell')
  return s
}

/** Strip equipment-related prefixes/suffixes that might prevent matching */
function stripEquipment(input: string): string {
  let s = input
  // Strip leading equipment words
  s = s.replace(/^(barbell|dumbbell|cable|machine|smith machine|ez-bar|kettlebell|bodyweight|resistance band)\s+/g, '')
  return s.trim()
}

/** Title case a string */
function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
