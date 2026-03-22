# Kravex Fitness Simulation Test Plan
**Doel:** Automatisch testen of de fitness-logica correct werkt voor echte gebruikers over tijd  
**Type:** Gesimuleerde gebruikerssimulatie — geen echte gebruikers nodig  
**Wanneer uitvoeren:** Na elke bugfix uit KRAVEX_REVIEW.md, en bij elke code-wijziging in `src/lib/`

---

## Concept

In plaats van handmatig testen bouwen we een **Fitness Simulation Test Suite** die:

1. **Fictieve trainingshistorie genereert** per gebruikersprofiel (bijv. 100 workouts over 6 maanden)
2. **Alle algoritmes aanroept** op die gesimuleerde data
3. **De output automatisch controleert** — klopt het gewicht? Is de juiste split aanbevolen? Geen valse alerts?

De tests draaien in de bestaande test-suite via `npm test` en falen automatisch als de fitness-logica breekt.

---

## Testscenario's

### Scenario A — Beginner, 3 maanden consistent (Happy Path)
**Profiel:** Emma, 19 jaar, bodyweight thuis, 3x/week Full Body  
**Gesimuleerde data:** 36 workouts over 12 weken, lineaire gewichtsprogressie

**Verwacht:**
- ✅ Gewichtsuggesties stijgen elke 2-3 weken (progressive overload)
- ✅ Geen plateau-detectie in eerste 8 weken
- ✅ Geen deload-aanbeveling in eerste 6 weken
- ✅ Workouts bevatten alleen bodyweight oefeningen
- ✅ RPE-gebaseerde progressie: bij RPE < 8 → rep- of gewichtstoename
- ❌ Geen Bulgarian Split Squat als enige quad-optie (na ENGINE-005 fix)

---

### Scenario B — Vakantie/Lange Pauze (False Positive Test)
**Profiel:** Marcus, 34 jaar, advanced, 4 weken niet getraind  
**Gesimuleerde data:** 80 workouts, dan 28 dagen gap, dan terugkeer

**Verwacht:**
- ✅ Na de gap: geen plateau-melding op bench press of squat
- ✅ Na de gap: Performance Forecast toont "je bent terug na een pauze" (niet "plateau")
- ✅ Deload-algoritme triggert NIET puur op basis van frequentie-drop door vakantie
- ❌ Mag NIET tonen: "Plateau gedetecteerd op Bench Press" bij terugkeer

---

### Scenario C — Knieblessure (Injury Safety Test)
**Profiel:** Jaap, 54 jaar, actieve knieblessure (moderate, links)  
**Gesimuleerde data:** 30 workouts + 1 actieve knieblessure in state

**Verwacht:**
- ✅ Gegenereerde workout bevat GEEN squat, leg press, leg extension
- ✅ Gegenereerde workout bevat WEL rehab-oefeningen voor knie (wall sit, terminal knee ext)
- ✅ Alternatieve quad-oefening wordt gesuggereerd (bijv. upper body focus)
- ✅ Blessure-banner zichtbaar in workout UI
- ❌ Mag NIET bevatten: Hack Squat, Bulgarian Split Squat, Lunge

---

### Scenario D — 6 Maanden PPL, Spierbalans (Scientific Correctness Test)
**Profiel:** Tyler, 26 jaar, advanced, 6x/week PPL  
**Gesimuleerde data:** 150 workouts (Push/Pull/Legs cycli)

**Verwacht:**
- ✅ Pull dag bevat rear delt / face pull oefeningen (na ENGINE-004 fix)
- ✅ Na 6 maanden: geen ernstige chest-vs-back imbalance in WeaknessHunter
- ✅ Posterior schouders worden geregistreerd als "trained" in muscle status
- ✅ Volume per spiergroep blijft binnen MEV-MRV range voor advanced
- ❌ Mag NIET: rear delts als "never trained" classificeren na 6 maanden PPL

---

### Scenario E — Echte Plateau (True Positive Test)
**Profiel:** Sofia, 29 jaar, intermediate, 3x/week  
**Gesimuleerde data:** 50 workouts waarbij bench press 8 weken op exact hetzelfde gewicht staat

**Verwacht:**
- ✅ Plateau-detectie triggert na week 6-8 op bench press
- ✅ Aanbeveling is specifiek (niet generiek): "Wissel naar incline of voeg paused reps toe"
- ✅ Status = 'plateau' (niet 'slowing')
- ✅ Mini-trend grafiek in PlateauAlert toont vlakke lijn
- ❌ Mag NIET: plateau detecteren op oefeningen die wel progressie tonen

---

### Scenario F — Schema-wisseling (False Fatigue Test)
**Profiel:** Lena, 38 jaar, intermediate, wisselt van Full Body naar PPL  
**Gesimuleerde data:** 20 Full Body workouts (25 sets/sessie), dan switch naar PPL (15 sets/sessie)

**Verwacht:**
- ✅ Geen deload-melding na schema-wisseling
- ✅ Wekelijks volume blijft vergelijkbaar (erkend door algoritme)
- ✅ FatigueDetector gebruikt wekelijkse sets, niet sessie-sets
- ❌ Mag NIET: "Volume drop gedetecteerd" tonen na een schema-wisseling

---

### Scenario G — Progressive Overload Correctheid (Precision Test)
**Profiel:** Marcus, bench press: 80kg×8 @RPE7, doelrep-range [6,10]  
**Input:** Directe aanroep van `calculateProgression()`

**Verwacht:**
- ✅ Strategie = `rep_progression` (niet aan top van range, RPE < 8)
- ✅ Suggestie: 80kg × 9 reps (voeg 1 rep toe bij RPE7)
- ✅ Bij 80kg×10 @RPE7 → strategie = `weight_increase` → ~82.5kg × 6
- ✅ Bij 80kg×8 @RPE9 → strategie = `maintain`
- ✅ Bij 80kg×8 @RPE9.5 → strategie = `deload` → 76kg

---

### Scenario H — MRV Ceiling (Volume Cap Test)
**Profiel:** Tyler, chest al op 20 sets deze week (boven MRV)  
**Input:** Genereer Push workout terwijl chest MRV = 20 al bereikt is

**Verwacht:**
- ✅ Gegenereerde workout heeft 0-1 chest sets (na ENGINE-003 fix)
- ✅ Workout verschuift focus naar schouders/triceps
- ✅ Volume ceiling gerespecteerd, niet genegeerd
- ❌ Mag NIET: 4 sets bench press toevoegen terwijl MRV al bereikt is

---

### Scenario I — Deload Week Correctheid
**Profiel:** Marcus, week 4 van accumulatiefase (deload week)  
**Input:** `generateLocalWorkout()` met `isDeload: true`

**Verwacht:**
- ✅ Compounds: max 2 sets (niet 4)
- ✅ Isolaties: max 1 set (na ENGINE-006 fix)
- ✅ RPE target = 6 (niet 8)
- ✅ Geschat volume = ~40% van normale week
- ✅ Momentum-indicator geeft geen "declining" warning in deload week (na ALGO-013 fix)

---

### Scenario J — Golden Path (End-to-End, 16 Weken)
**Profiel:** Beginner (complete_beginner), full gym, hypertrofie doel, 3x/week  
**Simulatie:** Week-voor-week, 48 workouts

| Week | Verwacht |
|------|---------|
| 1-2 | Startgewichten gebaseerd op lichaamsgewicht, Full Body, geen plateau |
| 3-4 | Rep-progressie zichtbaar (+1-2 reps per sessie) |
| 5-6 | Eerste gewichtstoename op compounds (RPE < 8 + top rep range) |
| 8 | Deload week (week 4 van accumulatiefase) |
| 9 | Nieuwe fase: intensivering, lagere reps, hogere RPE |
| 12 | Kracht-piek fase, 3-5 reps, RPE 8-9 |
| 13 | Deload (week 3 van krachtfase) |
| 14-16 | Nieuwe accumulatie cyclus, startgewichten hoger dan week 1 |

**Pass criteria:** Geen fouten, geen false alerts, correcte phase-progressie

---

## Technische Implementatie

### Bestandsstructuur
```
src/lib/__tests__/
  simulation/
    userProfiles.ts        — Persona definities (Emma, Marcus, Sofia, etc.)
    workoutGenerator.ts    — Synthetische workout data genereren
    scenarios/
      scenario-a-beginner.test.ts
      scenario-b-vacation.test.ts
      scenario-c-injury.test.ts
      scenario-d-ppl-balance.test.ts
      scenario-e-plateau.test.ts
      scenario-f-schema-switch.test.ts
      scenario-g-progressive-overload.test.ts
      scenario-h-mrv-ceiling.test.ts
      scenario-i-deload.test.ts
      scenario-j-golden-path.test.ts
```

### Synthetische Data Generator
```typescript
// workoutGenerator.ts
interface SimulatedWorkout {
  created_at: string       // datum
  workout_sets: SimSet[]
}

function generateLinearProgression(
  exercises: string[],
  weeks: number,
  sessionsPerWeek: number,
  startWeights: Record<string, number>,
  weeklyIncreasePct: number
): SimulatedWorkout[]

function generatePlateau(
  exercise: string,
  weeks: number,
  weight: number,
  reps: number
): SimulatedWorkout[]

function generateVacationGap(
  beforeWorkouts: SimulatedWorkout[],
  gapDays: number
): SimulatedWorkout[]
```

### Voorbeeld Test
```typescript
// scenario-e-plateau.test.ts
describe('Scenario E: Echte Plateau', () => {
  it('detecteert plateau na 8 weken gelijk gewicht', () => {
    const workouts = generatePlateau('Flat Barbell Bench Press', 8, 80, 8)
    const plateaus = detectPlateaus(workouts)

    const benchPlateau = plateaus.find(p => p.exercise === 'Flat Barbell Bench Press')
    expect(benchPlateau).toBeDefined()
    expect(benchPlateau?.status).toBe('plateau')
    expect(benchPlateau?.recommendation).toContain('incline')
  })

  it('detecteert GEEN plateau op oefeningen met progressie', () => {
    const workouts = generateLinearProgression(['Back Squat'], 8, 3, { 'Back Squat': 60 }, 0.03)
    const plateaus = detectPlateaus(workouts)
    expect(plateaus.find(p => p.exercise === 'Back Squat')).toBeUndefined()
  })
})
```

---

## Uitvoering

### Stap 1 — Na bugfixes uit KRAVEX_REVIEW.md
Implementeer de simulatie-tests gelijktijdig met de fixes. Elke fix krijgt een corresponderende test die bewijst dat de fix werkt.

### Stap 2 — CI/CD integratie
Voeg toe aan `package.json` scripts:
```json
"test:simulation": "vitest run src/lib/__tests__/simulation/",
"test:all": "vitest run"
```

### Stap 3 — Regression Guard
Na elke PR of code-wijziging in `src/lib/` draait de simulatie automatisch. Als een scenario faalt → merge geblokkeerd.

### Stap 4 — Uitbreiden over tijd
Elke nieuwe bug die wordt gevonden → nieuw scenario toevoegen. De test-suite groeit mee met de app.

---

## Prioriteitsvolgorde

| Prioriteit | Scenario | Reden |
|-----------|---------|-------|
| 1 | G — Progressive Overload | Kern van de app, simpelste unit test |
| 2 | J — Golden Path | End-to-end validatie na alle fixes |
| 3 | C — Knieblessure | Veiligheid, liability-risico |
| 4 | B — Vakantie false positive | Meest frustrerende UX-bug |
| 5 | E — Echte Plateau | True positive validatie |
| 6 | H — MRV Ceiling | Volume correctheid |
| 7 | I — Deload | Programma-integriteit |
| 8 | A — Beginner Happy Path | Onboarding kwaliteit |
| 9 | D — PPL Balans | Wetenschappelijke correctheid |
| 10 | F — Schema-wisseling | False fatigue preventie |

---

*Opgesteld: 2026-03-22 — Spark*  
*Status: Plan klaar, implementatie wacht op bugfixes uit KRAVEX_REVIEW.md*
