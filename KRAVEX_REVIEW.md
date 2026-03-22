# Kravex App — Complete Review & Bug Report
**Datum:** 2026-03-22  
**Reviewer:** Spark (gebaseerd op code-analyse + 7 gebruikerspersona's)  
**Doel:** Input voor dev agent — niet nu uitvoeren

---

## 1. KRITIEKE BUGS (breekt functionaliteit)

### BUG-001: Ontbrekende i18n keys in PlateauAlert
**Component:** `src/components/PlateauAlert.tsx`  
**Probleem:** De component gebruikt translation keys die **niet bestaan** in `en.json` of `nl.json`:
- `t('plateau_alert.title', 'Attention Points')` — ontbreekt
- `t('plateau_alert.plateau', 'Plateau')` — ontbreekt
- `t('plateau_alert.slowing', 'Slowing')` — ontbreekt
- `t('plateau_alert.exercise_count', ...)` — ontbreekt
- `t('common.show_less', 'Show less')` — ontbreekt in `common`
- `t('common.show_more', ...)` — ontbreekt in `common`

**Gevolg:** Alle gebruikers zien de hardcoded Engelse fallbacks, ook NL-gebruikers.  
**Fix:** Voeg `plateau_alert` sectie toe aan beide locale files. Voeg `show_less` en `show_more` toe aan `common`.

---

### BUG-002: Lege workout kan worden opgeslagen
**Hook:** `src/hooks/useActiveWorkout.ts` → `finishWorkout()`  
**Probleem:** Er is geen check of de workout minimaal 1 set bevat. `workout.exercises.flatMap(ex => ex.sets...)` kan een lege array opleveren. De workout wordt dan opgeslagen als lege entry.  
**Gevolg:** Database vervuilt met lege workouts, statistieken kloppen niet (bijv. "streak" telt een lege workout mee).  
**Fix:** Voeg vóór de Supabase insert toe: `if (pendingSets.length === 0) { setSaving(false); return null }` én toon de gebruiker een foutmelding.

---

### BUG-003: Blessuregebieden onvolledig
**Component:** `src/components/InjuryReport.tsx`  
**Probleem:** Alleen 8 gebieden: `shoulder, knee, lower_back, elbow, wrist, hip, neck, ankle`.  
**Ontbreekt:** `quad`, `hamstring`, `calf`, `chest`, `upper_back`, `groin`  
**Gevolg:** Jaap met een knieblessure kan die melden. Maar iemand met een hamstringblessure of ribpijn kan niets rapporteren — de meest voorkomende sportblessures worden niet gedekt.  
**Fix:** Uitbreiden met minimaal: quad, hamstring, calf, groin.

---

### BUG-004: Deload dismiss — inconsistente storage
**Component:** `src/components/DeloadAlert.tsx`  
**Probleem:** Dismiss-staat wordt opgeslagen in Supabase `settings.deload_dismissed_until` maar bij geen `updateSettings` prop valt het terug op... niets (de knop doet dan niets en het alert verdwijnt niet).  
**Code:** `if (updateSettings) { updateSettings(...) }` — geen fallback naar localStorage.  
**Gevolg:** Als `updateSettings` niet beschikbaar is (bijv. niet ingelogd, offline), kan de deload-alert niet worden weggedrukt.  
**Fix:** Voeg localStorage fallback toe als `updateSettings` niet beschikbaar is.

---

### BUG-005: InjuryReport — geen reset bij teruggaan vanuit stap 3
**Component:** `src/components/InjuryReport.tsx`  
**Probleem:** `handleBack()` vermindert `step` maar reset `selectedSeverity` niet bij teruggaan van stap 3 naar 2. Als gebruiker stap 3 verlaat en andere severity kiest, klopt de state niet.  
**Fix:** In `handleBack()`: `if (step === 3) setSelectedSeverity(null)`.

---

## 2. UX ISSUES (per gebruikersprofiel)

### Emma — Complete Beginner (19, bodyweight thuis)

**UX-001: Geen beginner workout path na onboarding**  
De onboarding uitlegt splits/RPE/recovery, maar zodra Emma op "Start training" klikt, belandt ze in de AI coach die vraagt hoelang ze wil trainen en welke energielevel ze heeft. Er is geen "dit is je eerste workout, hier is wat je doet" pad. Beginners willen geleid worden, niet kiezen.  
**Fix:** Voeg een "first workout" guided flow toe die automatisch een Full Body bodyweight workout genereert met uitleg per oefening.

**UX-002: RPE voor beginners — te laat uitgelegd**  
RPE-uitleg verschijnt pas als je een set logt. Maar de term "RPE" staat al in de AI coach output ("RPE toevoegen verbetert set-kwaliteits analyse") zonder context.  
**Fix:** Bij eerste keer RPE zien: automatisch de RPE uitleg tonen (beginner flow).

**UX-003: "Start leeg" voor beginners verwarrend**  
`start_empty` ("Start leeg") biedt geen guidance over welke oefeningen te kiezen. Beginners weten dit niet.  
**Fix:** Verberg "Start leeg" optie voor gebruikers met `experience = complete_beginner`. Of voeg een tooltip toe: "Kies dit als je al een eigen programma hebt."

---

### Marcus — Advanced Powerlifter (34, 5x/week)

**UX-004: Deload trigger te snel voor advanced lifters**  
`detectFatigue` triggert al na 4 workouts: `if (!workouts || workouts.length < 4) return null`. Een powerlifter traint zwaar en heeft meerdere weken nodig voor een significante deload-aanbeveling.  
**Fix:** Maak deload-gevoeligheid afhankelijk van `experience_level`. Advanced: pas tonen na consistente fatigue-signalen over 2+ weken.

**UX-005: Geen percentage-based training**  
Powerlifters trainen op % van hun 1RM (bijv. "Werk vandaag op 75% van je max"). Dit ontbreekt volledig.  
**Fix:** Optie toevoegen in trainer block: "% 1RM based" vs "RPE based" programmering.

**UX-006: PlateauAlert geeft geen specifiek advies**  
`item.recommendation` toont een aanbeveling maar de bron is onduidelijk — is dit statisch of AI-gegenereerd? Voor een advanced lifter is "verander je aanpak" te generiek.  
**Fix:** Maak recommendations specifiek: deload nodig? Volume omhoog? Variatie in oefening?

---

### Sofia — Drukke Moeder (29, dumbbells, 30 min)

**UX-007: Geen snelle workout override**  
Als Sofia al een Coach-training heeft gepland maar slechts 20 minuten heeft, moet ze door de volledige start flow opnieuw. Er is geen "ik heb minder tijd vandaag" knop op het moment zelf.  
**Fix:** Voeg "Tijd aanpassen" knop toe op het workout preview scherm, zodat de workout automatisch ingekort wordt.

**UX-008: Geen expliciete "workout hervatten" UI**  
De workout wordt bewaard in localStorage als de app sluit. Maar er is geen zichtbare "Hervat je workout van X minuten geleden" prompt bij terugkeer. Sofia zou de app kunnen sluiten (kind huilt) en niet weten hoe ze terug moet.  
**Fix:** Bij app-open: als er een actieve workout in localStorage staat, toon direct een opvallende "Hervat training" banner.

---

### Jaap — Comeback Atleet (54, knieblessure)

**UX-009: Blessure check-in reminder ontbreekt**  
`banner_check_in_due` text bestaat in de locales, maar er is geen mechanisme dat periodiek herinnert aan een check-in. Jaap zou na 3 dagen moeten worden herinnerd.  
**Fix:** Push notification (of in-app alert bij app-open) als een check-in >3 dagen geleden is.

**UX-010: Geen "ik wil een professional raadplegen" link**  
Bij ernstige blessures (`severity = severe`) is er geen doorverwijzing naar een fysiotherapeut of arts.  
**Fix:** Bij `severe` blessure toevoegen: "Overweeg een professional te raadplegen" met optioneel een link naar een zoekopdracht.

**UX-011: Geen "returning athlete" experience level**  
Jaap was vroeger fit maar is 15 jaar gestopt. `experience_complete_beginner` voelt verkeerd (hij weet wat een squat is), maar `experience_intermediate` overschat zijn huidige niveau. Er is geen "ik ben teruggekomen na een lange pauze" optie.  
**Fix:** Voeg `experience_returning` toe: "Eerder getraind, lange pauze" — met conservatieve startgewichten en opbouwprogramma.

---

### Tyler — Bodybuilder (26, 6x/week, hypertrofie)

**UX-012: Volume per spiergroep slechts 4 weken**  
`volume_per_muscle: "Volume per muscle group — last 4 weeks"` — bodybuilders willen mesoperiodes van 8-16 weken kunnen vergelijken.  
**Fix:** Voeg periodes toe: 4w / 8w / 16w (naast de bestaande 4w/12w/6m in het algemene volume tab).

**UX-013: JunkVolumeAlert geeft geen uitleg**  
`junk_volume.stop` en `junk_volume.warning` geven geen uitleg *waarom* het junk volume is. De `warning.message` en `warning.recommendation` zijn er wel, maar voor een bodybuilder die dit voor het eerst ziet is de term "junk volume" onduidelijk.  
**Fix:** Voeg een "?" info-knop toe die uitlegt: "Junk volume = sets die te weinig prikkel geven voor groei (bijv. RPE < 6, te ver van failure)."

**UX-014: Geen exercise variant tracking**  
Als Tyler "Bench Press" doet op maandag en "Incline DB Press" op donderdag, worden dit als twee losse oefeningen getrackt. Er is geen "dit is een variant van dezelfde bewegingspatroon" logica.  
**Fix:** Optionele exercise grouping op basis van bewegingspatroon (horizontal push, vertical pull, etc.) voor volume-berekening per patroon.

---

### Lena — Runner/Data-Driven (38, intermediate)

**UX-015: Geen custom doelen buiten hoofdlift**  
`main_lift` sectie ondersteunt alleen squat/bench/deadlift/OHP. Lena wil misschien haar pull-up of leg press PR bijhouden.  
**Fix:** Optie voor aangepaste "main lift" invoer, of meerdere PR-doelen per gebruiker.

**UX-016: Monthly Story — geen share-formaat zonder screenshot**  
`screenshot_hint: "Take a screenshot to share"` — er is geen native share functionaliteit, alleen een screenshot-instructie. Op mobiel is dit friction.  
**Fix:** Gebruik de Web Share API voor native delen op iOS/Android.

**UX-017: Geen verbinding met andere activiteiten**  
Lena loopt ook. Er is geen optie om cardio-activiteiten te loggen, zelfs niet als vrije aantekening. De app is 100% gericht op krachttraining.  
**Fix:** Voeg optioneel een "Andere activiteit" log toe (niet uitwerken, alleen notitieveld).

---

## 3. EDGE CASES

### EDGE-001: Workout met gewicht = 0 (bodyweight)
Als een gebruiker een bodyweight oefening logt met gewicht 0, werkt de e1RM berekening dan correct? `0 × reps × factor` = 0, wat leidt tot een "plateau" op alle bodyweight oefeningen.  
**Fix:** Detecteer bodyweight oefeningen en skip e1RM berekening. Gebruik reps-progressie als alternatief.

### EDGE-002: Meerdere blessures tegelijk
`addInjury` voorkomt duplicaten per body area, maar de workout generator houdt mogelijk alleen rekening met de eerste actieve blessure. Testen: knie + onderrug tegelijk actief.  
**Fix:** Verzeker dat `excludedExercises` de union is van alle actieve blessures.

### EDGE-003: Taalwissel tijdens actieve workout
Als een gebruiker NL → EN wisselt mid-workout (via profiel), worden sommige exercise names (die dynamisch zijn) mogelijk niet vertaald.  
**Fix:** Exercise names ophalen uit een genormaliseerde tabelwaarde, los van de UI-taal.

### EDGE-004: Template met verwijderde oefening
Als een exercise uit de database wordt verwijderd en een gebruiker laadt een template die die oefening bevat, is het gedrag onbekend.  
**Fix:** Bij het laden van een template: filter oefeningen die niet meer bestaan en toon een melding.

### EDGE-005: Extreme gewichten
Bij het invoeren van 300kg squat (competition powerlifter) of 5kg dumbbell curl (beginner vrouw) — zijn er validatiegrenzen? Geen validatiegrenzen gezien in de code.  
**Fix:** Voeg min/max validatie toe per oefening (bijv. max 500kg, min 0.5kg) met een waarschuwing.

### EDGE-006: Onboarding overgeslagen
Als een gebruiker de onboarding overslaat met "Skip", zijn er geen standaardwaarden ingesteld voor goal/experience/equipment. De AI coach heeft dan geen context.  
**Fix:** Bij het overslaan: sla standaardwaarden op (`goal: hypertrophy`, `experience: beginner`, `equipment: full_gym`) én toon een banner "Vul je profiel aan voor betere resultaten."

---

## 4. MISSING FEATURES (prioriteit: hoog → laag)

| # | Feature | Voor wie | Prioriteit |
|---|---------|----------|------------|
| MF-001 | "Returning athlete" experience level | Jaap (comeback) | Hoog |
| MF-002 | Workout hervatten banner bij app-open | Sofia, iedereen | Hoog |
| MF-003 | Blessuregebieden uitbreiden (quad, hamstring, calf) | Iedereen | Hoog |
| MF-004 | Beginner first-workout guided flow | Emma | Hoog |
| MF-005 | Lege workout blokkeren bij finish | Iedereen | Hoog |
| MF-006 | Blessure check-in reminder na 3 dagen | Jaap | Middel |
| MF-007 | "Ik heb minder tijd vandaag" workout aanpassen | Sofia | Middel |
| MF-008 | Web Share API voor Monthly Story | Lena | Middel |
| MF-009 | Custom PR-doelen (niet alleen squat/bench/dead/OHP) | Lena, Tyler | Middel |
| MF-010 | Volume periode uitbreiden (8w/16w per spiergroep) | Tyler | Middel |
| MF-011 | Professional raadplegen CTA bij severe blessure | Jaap | Middel |
| MF-012 | Percentage-based training (% 1RM) | Marcus | Laag |
| MF-013 | Exercise variant grouping (bewegingspatroon) | Tyler | Laag |
| MF-014 | Andere activiteiten loggen (cardio notitie) | Lena | Laag |

---

## 5. COPY / TEKST ISSUES (al deels gefixed)

- `plateau_alert.*` — ontbreekt in beide locale files (zie BUG-001)
- `common.show_less` / `common.show_more` — ontbreekt
- `experience_intermediate` in NL → kan verwarrend zijn ("Gemiddeld" heeft negatieve connotatie in NL voor sporters — overweeg "Gevorderd beginner")
- `deload.dismiss: "Nu niet"` — zou ook "Herinner me over 7 dagen" kunnen zijn (beter UX)

---

## 6. WAT GOED WERKT

- Offline queue (`useOfflineQueue.ts`) — solide implementatie
- localStorage QuotaExceededError handling — goed afgevangen
- Workout auto-save naar localStorage bij afsluiten — werkt
- InjuryReport multi-step flow — duidelijk en clean
- DeloadAlert signals (rpe_drift, volume_drop, frequency_drop) — goede logica
- PlateauAlert mini trend-grafiek — sterke UX
- Superset modal — goed doordacht (antagonist check, time savings)
- RPE beginner uitleg — goed gedifferentieerd van advanced uitleg
- Monthly Story — motiverend feature
- Onboarding beginners concept-uitleg (splits/RPE/recovery) — prima

---

*Gegenereerd door Spark — 2026-03-22 — klaar voor dev agent*

---

## 7. ALGORITME ANALYSE — LANGE-TERMIJN GEBRUIKERS

> *Dit gedeelte gaat over correctheid van de kern-algoritmes bij gebruikers met 50-500 workouts in hun history. Dit zijn subtiele bugs die pas na maanden gebruik zichtbaar worden.*

---

### ALGO-001: PlateauDetector — Vakantie/pauze wordt als plateau gezien
**File:** `src/lib/plateauDetector.ts`  
**Probleem:** Het 6-weken window pakt de laatste 6 kalenderweken. Als een gebruiker 4 weken op vakantie is geweest en terugkomt, heeft hij geen of weinig data in die weken. De regressiehelling is dan vlak (geen progressie = stilstand), wat als plateau wordt gerapporteerd.  
**Gevolg:** Gebruiker keert terug na vakantie en ziet direct "Plateau gedetecteerd op Bench Press" — terwijl hij gewoon weg was.  
**Fix:** Gebruik de laatste 6 weken MÉT trainingsdata in plaats van de laatste 6 kalenderweken. Filter lege weken voor de regressie.

---

### ALGO-002: FatigueDetector — Sets per workout vs wekelijkse sets
**File:** `src/lib/fatigueDetector.ts`  
**Probleem:** Volume drop wordt gemeten als `setsPerWorkout` — het aantal sets per individuele sessie. Als iemand zijn schema verandert van PPL (6 sessies × 12 sets = 72/week) naar Full Body (3 sessies × 25 sets = 75/week), daalt het gemiddelde sets-per-workout van 12 naar 25 — nee, dat stijgt. Maar als iemand van Full Body (3×25=75/week) naar Push/Pull (4×18=72/week) gaat, daalt de sets-per-workout van 25 naar 18 (−28%), wat een false positive fatigue signal geeft.  
**Gevolg:** Schema-wisseling triggert een deload-aanbeveling terwijl er geen vermoeidheid is.  
**Fix:** Vergelijk totale wekelijkse sets (niet sets per workout): groepeer per week en vergelijk weekgemiddelden.

---

### ALGO-003: FatigueDetector — Frequentiedrempel niet relatief aan doel
**File:** `src/lib/fatigueDetector.ts`  
**Probleem:** `if (workoutsPerWeek < 2)` triggert een fatigue signal voor iedereen die minder dan 2x/week traint. Maar een gebruiker die bewust 1-2x per week traint (beginner schema) triggert dit altijd.  
**Gevolg:** Beginners krijgen constant een "you might be overtrained" melding — terwijl ze precies op schema zitten.  
**Fix:** Vergelijk met `userSettings.frequency_target` in plaats van de absolute grens van 2. Als iemand een 2x/week schema heeft en 1.5x/week traint, is dat een signaal. Als iemand een 3x schema heeft en 1.5x traint, is dat een groter signaal.

---

### ALGO-004: WeaknessHunter — "Tricep dip" geclassificeerd als borst
**File:** `src/lib/weaknessHunter.ts`  
**Probleem:** De regex-volgorde in `getDetailedMuscleGroup`:
```
if (/bench|chest|fly|dip|push.?up|pec/.test(l)) return 'chest'
```
"Tricep dip" en "Assisted dip" matchen op `dip` en worden als 'chest' geclassificeerd. De triceps check staat lager en wordt nooit bereikt.  
**Gevolg:** Iemand die veel dips doet ziet een valse "chest imbalance" en mist zijn triceps-volume tracking.  
**Fix:** Voeg de tricep-specifieke check toe VÓÓR de chest check: `if (/tricep.*dip|dip.*tricep/.test(l)) return 'triceps'`

---

### ALGO-005: WeaknessHunter — "Arnold press" en onbekende schouders default naar borst
**File:** `src/lib/weaknessHunter.ts`  
**Probleem:** De default fallback is:
```
if (/leg/.test(l)) return 'quadriceps'
return 'chest' // DEFAULT
```
Elke oefening die niet matcht, wordt als borst geclassificeerd. "Arnold press", "Z-bar curl variatie", "Machine shoulder press" etc. worden als 'chest' geteld.  
**Gevolg:** Na 6 maanden training ziet een gebruiker dat zijn borst "dominant" is terwijl zijn schoudervolume enorm is — maar verkeerd geclassificeerd.  
**Fix:** Default fallback veranderen naar `'core'` (neutraal) of logging toevoegen voor onbekende oefeningen. Beter: uitbreiden van de regex-patronen.

---

### ALGO-006: PerformanceForecast — PR-target altijd +2.5kg ongeacht niveau
**File:** `src/lib/performanceForecast.ts`  
**Probleem:** `const PR_INCREMENT = 2.5` — het forecast target is altijd 2.5kg meer op de e1RM. Voor een beginner (squat 60kg) is +2.5kg groot (+4%). Voor een gevorderde (squat 200kg) is +2.5kg klein (+1.25%) en de forecast zal altijd "over 1-2 weken" zijn, wat onrealistisch is.  
**Gevolg:** Gevorderde gebruikers zien altijd een "PR over 1 week" forecast die nooit uitkomt. Ze verliezen vertrouwen in de feature.  
**Fix:** Maak PR_INCREMENT relatief: `Math.max(2.5, currentPR * 0.015)` — 1.5% van huidige PR, minimaal 2.5kg.

---

### ALGO-007: PerformanceForecast — Lange pauze getoond als "plateau"
**File:** `src/lib/performanceForecast.ts`  
**Probleem:** `if (daysSinceLastSession > 21) return { status: 'plateau' }`  
Als een gebruiker 3 weken niet traint (vakantie, ziekte) en terugkeert, ziet hij "Performance plateau" in zijn forecast. Dat is incorrect — het is geen plateau, het is een pauze.  
**Gevolg:** Demotiverende feedback op het slechtste moment (na terugkeer).  
**Fix:** Gebruik `status: 'break'` met boodschap "Je bent terug na een pauze — tijd om weer op te bouwen."

---

### ALGO-008: VolumeTracker — Bodyweight oefeningen tellen als 0 volume
**File:** `src/lib/volumeTracker.ts`  
**Probleem:** `(s.weight_kg || 0) * (s.reps || 0)` — pull-ups, push-ups, dips met gewicht 0 dragen 0 bij aan het totale volume.  
**Gevolg:** Een gebruiker die puur bodyweight traint ziet een volume van 0 op alle grafieken. Progressie en trends zijn onzichtbaar. Statistieken als "beste week" zijn betekenisloos.  
**Fix:** Voor bodyweight oefeningen: gebruik een schatter. Opties:
1. Bewaar user's lichaamsgewicht en gebruik dat als minimumgewicht
2. Tel sets in plaats van kg-volume voor bodyweight oefeningen
3. Scheid "volume (kg)" en "setvolume (sets)" in de UI

---

### ALGO-009: PlateauDetector — e1RM berekening inconsistent over de codebase
**Files:** `src/lib/plateauDetector.ts` vs `src/lib/prDetector.ts`  
**Probleem:** Twee verschillende e1RM formules:
- `plateauDetector.ts`: `set.reps === 1 ? set.weight_kg : set.weight_kg * (1 + set.reps / 30)` (Epley)
- `prDetector.ts` → `calculateE1RM`: zelfde formule, maar in `performanceForecast.ts` wordt `s.bestE1rm || s.e1rm` gebruikt

De berekening is hetzelfde maar het is niet gecentraliseerd. Als de formule ooit verandert (bijv. naar Brzycki: `weight / (1.0278 - 0.0278 * reps)`), moet het op 3+ plekken worden aangepast.  
**Fix:** Exporteer `calculateE1RM` uit `prDetector.ts` en importeer die overal. Één formule, één plek.

---

### ALGO-010: JunkVolumeDetector — Geen onderscheid warmup vs werksets
**File:** `src/lib/junkVolumeDetector.ts`  
**Probleem:** De detector analyseert alle sets inclusief warmup sets. Iemand die 2 warmup sets doet (60kg RPE 6, 80kg RPE 7) en dan 3 werksets (100kg RPE 7, 100kg RPE 8, 100kg RPE 8.5) — de detector kijkt naar de laatste 3 sets totaal: [80kg RPE7, 100kg RPE7, 100kg RPE8.5]. De RPE stijgt van 7 naar 8.5 (delta 1.5) bij gewicht dat stijgt van 80 naar 100kg. Dat triggert incorrect een waarschuwing.  
**Fix:** Gebruik een `isWarmup: boolean` flag op sets, of negeer sets met gewicht < 70% van het zwaarste set-gewicht in die reeks.

---

### ALGO-011: PRDetector — Exercise matching is exact-lowercase, mist varianten
**File:** `src/lib/prDetector.ts`  
**Probleem:** `s.exercise?.toLowerCase() === exerciseName.toLowerCase()`  
Als iemand ooit "Bench Press" logt en later "Barbell Bench Press" — dit zijn twee aparte PR-records. Na 6 maanden heeft iemand 15 PR-records voor "bench press varianten" in plaats van één duidelijk bench press PR.  
**Gevolg:** De "all-time PR" is versnipperd over naamvarianten. Plateau-detectie heeft te weinig data per oefening (gesplitst over namen).  
**Fix:** Fuzzy exercise matching via normalisatie (verwijder "barbell/dumbbell/cable" prefix) of een oefening-alias systeem in de database.

---

### ALGO-012: Periodization — Training block verloopt stilletjes na de geplande weken
**File:** `src/lib/periodization.ts`  
**Probleem:** `getCurrentBlock` berekent `currentWeek` maar capt het op het maximum aantal weken voor die fase. Als iemand een 4-weeks accumulatiefase heeft en er 8 weken over doet (langzame trainer), staat hij altijd op "week 4" — het blok verloopt nooit automatisch.  
**Gevolg:** Een gebruiker die zijn block verwaarloost zit jarenlang in "accumulation week 4" zonder dat het systeem suggereert een nieuw blok te starten.  
**Fix:** Na `weeksElapsed > phase.weeks + 2`, toon een prominente melding: "Je accumulatiefase is verlopen. Start een nieuw trainingsblok."

---

### ALGO-013: Momentum Calculator — Geen context voor trainingsblok fase
**File:** `src/lib/momentumCalculator.ts` (niet direct gelezen maar gebruikt in Dashboard)  
**Waarschijnlijk probleem:** Als iemand in een deload week zit (week 4 van een blok, RPE 5, lager volume), zal de momentum calculator dit registreren als "dalend momentum" of "declining" — terwijl het de bedoeling is.  
**Gevolg:** Gebruiker volgt het programma perfect (deload week) maar ziet een rode "momentum" indicator.  
**Fix:** Haal de huidige blok-fase op (`getCurrentBlock()`) en negeer momentum-waarschuwingen in deload weken.

---

## 8. DATA INTEGRITEIT — LANGE-TERMIJN SCENARIO'S

### DATA-001: Oefening hernoemd = historisch PR kwijt
Als een gebruiker een oefening hernoemt (bijv. van "Bench" naar "Bench Press"), verdwijnt de PR-history van "Bench" uit de nieuwe naam. Er is geen rename-mechanisme.

### DATA-002: Supabase + localStorage sync conflict
Trainingsblok staat in Supabase EN localStorage. Als een gebruiker twee apparaten gebruikt (telefoon + tablet), kan het blok out-of-sync raken. `loadBlock` probeert Supabase te laden, maar valt terug op localStorage zonder te controleren of localStorage verouderd is.

### DATA-003: Geen data export
Na 1 jaar training heeft een gebruiker waardevolle data. Er is geen export functie (CSV/JSON). Als de app stopt of Supabase faalt, is alle data weg.

### DATA-004: Workout timestamp timezone
`created_at` wordt opgeslagen als UTC. Als een gebruiker in een andere tijdzone reist en traint, worden de workout-weken verkeerd ingedeeld (een workout op maandag 23:00 CET is dinsdag in UTC). De `getWeekKey` functie gebruikt UTC: `d.toISOString().split('T')[0]` → timezone bug.

---

## 9. SAMENVATTING PRIORITEITEN (volledig herzien)

### Kritiek — Fix vóór launch
- BUG-001: i18n keys ontbreken in PlateauAlert
- BUG-002: Lege workout kan worden opgeslagen
- ALGO-004: Tricep dip → borst classificatie (wrong muscle tracking)
- ALGO-008: Bodyweight volume = 0 (statistieken nutteloos voor bodyweight users)

### Hoog — Fix in eerste sprint na launch
- BUG-003: Blessuregebieden uitbreiden
- ALGO-001: Vakantie = plateau false positive
- ALGO-002: Schema-wisseling = false fatigue
- ALGO-006: PR target niet relatief aan niveau
- ALGO-009: e1RM centraliseren (technische schuld)
- ALGO-011: Exercise naam matching fuzzy maken
- DATA-004: Timezone bug in week-berekening

### Middel — Tweede sprint
- ALGO-003: Frequentiedrempel relatief aan doel
- ALGO-005: Arnold press → borst fallback
- ALGO-007: Lange pauze = plateau misleading
- ALGO-010: Warmup sets in junk volume
- ALGO-012: Verlopen training block geen notificatie
- ALGO-013: Deload week = dalend momentum misleading
- DATA-001: Oefening rename = PR verlies
- DATA-002: Multi-device sync conflict

### Laag — Backlog
- DATA-003: Data export ontbreekt
- MF-012 t/m MF-014: Geavanceerde features

---

*Bijgewerkt: 2026-03-22 — Spark*

---

## 10. WETENSCHAPPELIJKE AUDIT — WORKOUT ENGINE (KRITIEK)

> *Dit zijn de diepste bugs — ze zitten in de kern van wat de app belooft: wetenschappelijk verantwoorde workouts genereren. Een ervaren sporter of coach zou deze fouten direct herkennen.*

---

### ENGINE-001: Today's Workout gebruikt NOOIT je trainingshistorie voor gewichten ⚠️ KRITIEK
**File:** `src/lib/todaysWorkout.ts`, regel 60  
**Code:** `recentHistory: [], // altijd leeg`  
**Probleem:** De "Today's Workout" feature geeft altijd een lege array mee als trainingshistorie. Dit betekent dat de progressive overload engine in `generateLocalWorkout` voor ELKE oefening de "estimate" strategie gebruikt — alsof je de app voor het eerst opent.  
**Gevolg:** Een gebruiker die 6 maanden traint krijgt bij "Vandaag" altijd dezelfde geschatte begingewichten op basis van zijn lichaamsgewicht, nooit zijn werkelijke progressie. Dit breekt de kern van de app.  
**Fix:** Laad de recente workout history (`workouts.slice(0, 5)`) en geef die mee als `recentHistory` — precies zoals de AI coach dat doet.

---

### ENGINE-002: Volume MRV ceiling identiek voor alle spiergroepen — wetenschappelijk onjuist
**File:** `src/lib/training-analysis.ts` → `getVolumeCeiling()`  
**Code:** `const base = beginner ? 12 : advanced ? 24 : 18; return MUSCLE_GROUPS.map(m => [m, base])`  
**Probleem:** Elke spiergroep krijgt exact dezelfde MRV (Maximum Recoverable Volume), ongeacht de spiergroep. Wetenschappelijk zijn de MRV's per spiergroep sterk verschillend:
- Biceps: MRV ≈ 20-26 sets/week (kleine spier, herstelt snel)
- Quads: MRV ≈ 12-18 sets/week (grote spier, herstelt langzamer)
- Hamstrings: MRV ≈ 10-16 sets/week

Door iedereen op 18 sets te cappen, worden biceps te weinig getraind (makkelijk 20 sets verdragen) en quads mogelijk te veel (18 sets is al aan de bovenkant van het bereik).  
**Fix:** Gebruik spiergroep-specifieke MRV's, gebaseerd op de al aanwezige `SET_TARGETS_BY_GOAL` tabel: `max` waarde = MRV per spiergroep.

---

### ENGINE-003: Volume ceiling cap wordt genegeerd als je al boven MRV zit
**File:** `src/lib/localWorkoutGenerator.ts`  
**Code:**  
```js
const remaining = Math.max(0, ceiling - currentWeekly - otherPlanned)
if (ex.sets > remaining && remaining > 0) { // BUG: remaining === 0 wordt overgeslagen
  ex.sets = remaining
}
```
**Probleem:** Als een gebruiker al op of over zijn MRV zit (`remaining === 0`), wordt de workout gewoon gegenereerd met de volledige set-count. De `> 0` check zorgt dat de conditie NOOIT triggert op het moment dat het het hardst nodig is.  
**Gevolg:** Overtrainde gebruiker krijgt gewoon een volledige workout aangeboden, geen waarschuwing, geen reductie.  
**Fix:** `if (remaining < ex.sets) { ex.sets = Math.max(1, remaining) }` — verwijder de `> 0` check.

---

### ENGINE-004: Pull split mist posterior schouder (rear delts) — wetenschappelijk fout
**File:** `src/lib/localWorkoutGenerator.ts` → `SPLIT_TEMPLATES`  
**Code:** `'Pull': { muscles: ['back', 'biceps'], exercisesPerMuscle: { back: 3, biceps: 2, ... } }`  
**Probleem:** In wetenschappelijk onderbouwde PPL-programmering hoort de posterieure deltaspier (rear delt, face pulls) op de Pull dag, omdat deze spier functioneel samenwerkt met de rugspieren en dezelfde bewegingsrichtingen deelt (horizontale abductie, external rotation). Kravex geeft rear delts 0 slots op Pull dag.  
**Gevolg:** PPL-gebruikers trainen hun rear delts nooit, tenzij ze zelf Face Pulls toevoegen. Over tijd → schouderimbalance, verhoogd blessurerisico.  
**Fix:** `'Pull': { muscles: ['back', 'biceps', 'shoulders'], exercisesPerMuscle: { back: 3, biceps: 2, shoulders: 1 } }` — alleen posterior shoulder oefeningen (Face Pull, Rear Delt Fly) in de shoulders pool voor Pull.

---

### ENGINE-005: Quad-training onmogelijk voor bodyweight/dumbbell gebruikers
**File:** `src/lib/localWorkoutGenerator.ts` → `EXERCISE_POOL.quads` + `pickExercises()`  
**Probleem:** De quad exercise pool bevat: Back Squat (barbell), Leg Press (machine), Leg Extension (machine), Front Squat (barbell), Bulgarian Split Squat (dumbbell), Hack Squat (machine).  
Voor een `equipment: 'bodyweight'` of `equipment: 'dumbbells'` gebruiker blijft er maar **één oefening over**: Bulgarian Split Squat.  
**Gevolg:**  
1. Beginner die thuis traint: elke workout Bulgarian Split Squat voor quads — geen variatie, te moeilijk voor beginners, niet progressief zonder gewichten.
2. Pure bodyweight trainer: geen enkele quad oefening in de pool!  
**Fix:** Voeg toe aan de quad pool: `Bodyweight Squat (bodyweight)`, `Jump Squat (bodyweight)`, `Step-up (bodyweight/dumbbell)`, `Wall Sit (bodyweight)`.

---

### ENGINE-006: Deload isolatie-volume is 67% van normaal in plaats van 40%
**File:** `src/lib/localWorkoutGenerator.ts` → `getSets()`  
**Code:** `if (isDeload) return 2` — altijd 2 sets, zowel voor compounds als isolaties.  
**Probleem:**
- Compound oefeningen normaal: 4 sets → deload 2 sets = 50% reductie ✓ (close to 40%)
- Isolatie oefeningen normaal: 3 sets → deload 2 sets = 33% reductie ✗ (moet 40% zijn → 1-2 sets)

De deload-filosofie is 40% volume reductie. Isolaties zouden op 1-2 sets moeten zitten.  
**Fix:** `if (isDeload) return isCompound ? 2 : 1`

---

### ENGINE-007: 'dip' → inconsistente spiergroep classificatie
**Probleem:** In twee verschillende bestanden wordt "dip" anders geclassificeerd:
- `training-analysis.ts` EXERCISE_MUSCLE_MAP: `'dip': 'triceps'` ✓
- `weaknessHunter.ts` `getDetailedMuscleGroup`: regex `bench|chest|fly|dip` → `'chest'` ✗

**Gevolg:** Dips worden geteld als triceps voor recovery/volume tracking maar als borst voor weakness analysis. Iemand die veel dips doet:
- Heeft voldoende triceps volume (training-analysis: correct)
- Maar ziet "borst dominant" in weakness hunter (incorrect)  
**Fix:** Consistente mapping — "Tricep dip" = triceps. Voeg speciale check toe in weaknessHunter voor dip.

---

### ENGINE-008: Progressive overload gebruikt enkel de laatste set, niet de beste set
**File:** `src/lib/localWorkoutGenerator.ts` → `buildHistoryMap()`  
**Code:**  
```js
for (const session of history) {
  for (const set of session.sets) {
    if (!map[set.exercise]) continue // eerste match wint
    map[set.exercise] = { weight: set.weight_kg, reps: set.reps, rpe: set.rpe }
  }
}
```
**Probleem:** De functie neemt de EERSTE set van de meest recente sessie als referentie, niet de BESTE set (hoogste e1RM). Als iemand 4 sets doet waarbij set 3 de zwaarste is (100kg×8), maar set 1 was 80kg×10, baseert de overload-berekening zich op 80kg×10 — en suggereert conservatief.  
**Fix:** Bewaar de set met de hoogste e1RM: `if (!map[ex] || e1rm(set) > e1rm(map[ex])) map[ex] = set`

---

### ENGINE-009: Split scoring straft Full Body voor advanced maar niet voor PPL-herhaling
**File:** `src/lib/training-analysis.ts` → `scoreSplits()`  
**Probleem:** Er is een speciale penalty van -40 voor Full Body bij advanced gebruikers en een -30 penalty als je gisteren Full Body deed. Maar er is GEEN equivalent voor PPL: als iemand gisteren Push deed, kan vandaag Push opnieuw worden aanbevolen als de recovery scores het toelaten (triceps en shoulders herstellen in 48u).  
**Gevolg:** Een advanced PPL-gebruiker kan 2x Push achter elkaar krijgen aanbevolen, wat leidt tot overtraining van borst/schouders/triceps.  
**Fix:** Voeg een `lastSplit !== recommendedSplit` bonus toe aan alternatieve splits, of een penalty als de split gelijk is aan de vorige sessie.

---

### ENGINE-010: `analyzeTraining` bekijkt maar 30 workouts — bij lang gebruik onvolledig
**File:** `src/lib/todaysWorkout.ts`  
**Code:** `analyzeTraining(workouts.slice(0, 30), ...)`  
**Probleem:** Alleen de laatste 30 workouts worden geanalyseerd voor het bepalen van "sets deze week". Bij een gebruiker die 5x/week traint is 30 workouts = 6 weken history. De "setsThisWeek" teller telt alle sets van de afgelopen 7 dagen — dat is onafhankelijk van het aantal workouts. Dit is OK.

MAAR: de recentExercises (welke oefeningen deed je recent) kijkt ook maar terug 30 workouts. Bij iemand die 5x/week traint zijn 30 workouts maar 6 weken. Als een oefening 7+ weken geleden voor het laatst is gedaan, verschijnt hij als "nieuw" — terwijl hij historische progressie heeft. Dit is een mild issue maar relevant voor gevorderde gebruikers.

**Fix:** Voor exercise variety-check: slice(0, 20). Voor historische progressie: laad alle workouts maar filter op exercise-naam.

---

## 11. WETENSCHAPPELIJKE BEOORDELING

| Component | Wetenschappelijk correct? | Oordeel |
|-----------|--------------------------|---------|
| Recovery hours (72/96/48u) | ✅ Gebaseerd op peer-reviewed data | Goed |
| MEV/MAV set targets (Israetel) | ✅ Evidence-based | Goed |
| Progressive overload (RPE-gated, % increase) | ✅ Modern en correct | Goed |
| Compound secondary muscles (50% credit) | ✅ Logisch en verdedigbaar | Goed |
| Periodization fases (accumulatie→intensivering→piek) | ✅ Correct | Goed |
| Deload timing (week 4 van elk blok) | ✅ Evidence-based | Goed |
| **Today's Workout progressive overload** | ❌ Werkt niet (lege history) | Kritiek |
| **MRV ceiling uniform per level** | ❌ Spiergroep-specifiek zou beter zijn | Probleem |
| **Pull split zonder rear delts** | ❌ Wetenschappelijk onjuist | Probleem |
| **Bodyweight quad-pool leeg** | ❌ Onbruikbaar voor thuis-trainers | Probleem |
| Volume ceiling cap bij MRV overschrijding | ❌ Code-bug, niet afgedwongen | Bug |
| Deload volume voor isolaties | ⚠️ Te hoog (67% vs 40%) | Verbeterpunt |
| Dip classificatie inconsistentie | ⚠️ Twee bronnen, twee antwoorden | Verbeterpunt |

**Conclusie:** De wetenschappelijke basis is solide (Israetel MEV/MAV, RPE-based overload, recovery science). Maar de implementatie heeft een aantal kritieke bugs waardoor de mooiste features niet werken zoals bedoeld. Een pro-atleet zou ENGINE-001, ENGINE-004 en ENGINE-005 direct herkennen als fundamentele tekortkomingen.

---

*Bijgewerkt: 2026-03-22 — Spark*
