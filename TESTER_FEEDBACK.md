# Kravex AI Tester Feedback
*Gegenereerd: 2026-03-18 | App: https://coach-app-three-gamma.vercel.app*

---

## 🧑‍🎓 Thomas (22, beginner, 3 maanden gym)

**Positief:**
- App ziet er clean en modern uit — niet overweldigend bij het openen
- Onboarding is kort (3 stappen), niet te veel vragen
- "Muscle mass / Strength / Endurance" — begrijpelijke keuzes

**Verwarrend:**
- App staat op NL ingesteld maar bijna ALLES is in het Engels. "Good evening", "Time to get started", "Free training" — wat is dit, een Engelse app?
- Na onboarding: ik zie "Start training" en "Free training" maar ik heb geen idee wat het verschil is. Nergens uitgelegd.
- "RPE" in de onboarding-uitleg — ik heb geen idee wat dat is. De uitleg staat erbij maar het blijft jargon.
- De AI Coach zit verstopt op /coach maar staat NIET in de bottom nav. Had ik nooit gevonden.
- Lege Progress tab met alleen "No exercises found" — geen tip wat ik moet doen.

**Bugs:**
- Er staat bovenaan de hele tijd een balk "Training actief — Ga terug" die ik niet weg krijg. Ik heb nooit een training gestart. Spooky.
- De "Start training" knop in de onboarding is grijs — ik snap niet wat ik moet aanklikken om hem actief te maken.

**Mist:**
- Geen "Bodyweight only" keuze bij equipment in onboarding
- Geen welkomstworkout of suggestie "je bent nieuw, begin hiermee"
- Geen uitleg van het verschil tussen "Start training" en "Free training"

**Cijfer: 5/10** — Ziet er goed uit maar ik zou echt niet weten waar ik moet beginnen.

---

## 💪 Mark (34, powerlifter, 10 jaar ervaring)

**Positief:**
- Workout logger werkt snel, sets toevoegen gaat vlot
- RPE-optie zit erin — top, de meeste apps hebben dat niet
- Muscle tracking / fatigue systeem klinkt goed in concept
- De AI Coach die een next workout suggereert is slim (Legs na Chest)

**Wat mist voor gevorderde gebruikers:**
- **Geen percentage-based programming** — 5/3/1, Wendler, etc. werken met % van training max. Ik wil mijn TM invullen en percentages zien.
- **Geen geplande vs. actueel gewicht** — ik wil zien: "gepland: 180kg x 3, gedaan: 182.5kg x 3"
- **Geen RPE doelstelling per set** — ik kan RPE achteraf invullen maar niet als target instellen
- **Geen notities per oefening** (alleen per workout), ik wil bij squat kunnen noteren "feet wider today"
- **Geen bodyweight exercises met extra gewicht** — bijv. pull-ups +20kg is een pain om in te voeren
- **Geen programma-import** — ik wil mijn bestaande 5/3/1 programma importeren, niet opnieuw invoeren

**Irritaties:**
- De timer in de workout is niet zichtbaar als ik scroll — moet altijd omhoog scrollen
- Geen rest timer in de workout view
- Gewicht aanpassen gaat per 1kg stap — ik wil soms per 0.5kg of 2.5kg

**Bugs:**
- De stale "Training actief" banner van 129+ uur — dat is gewoon een crash geweest die nooit opgeruimd is.

**Cijfer: 5/10** — Voor een beginner oké, maar als serieuze lifter mis ik te veel.

---

## 🏃‍♀️ Sara (28, drukke professional, thuis dumbbells)

**Eerste indruk:**
- Mooi donker design, logo is strak. Voelt als een serieuze app, niet een gratis gimmick.
- Onboarding duurt minder dan 2 minuten — dat waardeer ik.

**AI Coach kwaliteit:**
- Ik vroeg in de coach om een 40-min dumbbell workout en de suggestie zag er solide uit
- De "Legs" suggestie na mijn vorige chest workout voelt slim — het houdt bij wat ik heb gedaan
- MAAR: de coach zit verstopt. Ik zie hem niet in de bottom nav. Ik had hem nooit gevonden als ik niet wist waar ik moest zoeken.

**Design & UX:**
- Bottom nav: TODAY / TRAIN / PROGRESS / PROFILE — geen COACH tab. Grootste gemis.
- De tijdsknoppen (45/60/75/90min) in de coach zijn duidelijk
- "Good evening / Time to get started" — in het Nederlands zou dit veel warmer voelen
- Progress tab met "No exercises found" — als nieuwe gebruiker denk ik dat er iets kapot is

**Wat me zou doen blijven:**
- Als de AI Coach in de nav zit
- Als het eerste scherm meteen vraagt "wat ga je vandaag doen?" in plaats van twee onduidelijke knoppen

**Dealbreakers:**
- Die eeuwige "Training actief" balk bovenaan — ik dacht dat mijn account corrupt was
- Geen push notificaties / reminders ingesteld kunnen worden

**Cijfer: 6/10** — Goede basis, de AI is slim, maar de navigatie laat me in de steek.

---

## 🧑‍💻 Kevin (31, developer, heeft alles geprobeerd)

**Vergelijking met Hevy / Fitbod:**

| Feature | Kravex | Hevy | Fitbod |
|---------|--------|------|--------|
| Workout logging | ✅ Snel | ✅ Snel | ✅ |
| AI workout suggestie | ✅ Uniek | ❌ | ✅ Basis |
| Social/friends | ❌ | ✅ | ❌ |
| Exercise library | ? | ✅ Groot | ✅ Groot |
| Templates | ? | ✅ | ✅ |
| Rest timer | ❌ Niet zichtbaar | ✅ | ✅ |
| Graphs/progress | Basis | ✅ Uitgebreid | ✅ |
| PWA | ✅ | ❌ | ❌ |

**UX problemen:**
- **AI Coach niet in nav** — dit is de USP van de app en hij zit verstopt op /coach. Fatale navigatiefout.
- **Stale active workout** — de `coach-active-workout` localStorage wordt niet gecleand. Classic bug.
- **Rest timer ontbreekt** in workout view — iedereen verwacht dit in 2026
- **Gewicht stappen** zijn vast op 1kg — minstens 0.5kg en 2.5kg opties nodig
- **Geen exercise library** te zien — hoe voeg ik een custom oefening toe?

**Technische observaties:**
- PWA werkt (goede keuze, Hevy heeft dit niet)
- Supabase realtime is snel, geen lag bij set opslaan
- Onboarding flow is clean maar mist experience level in step 3
- i18n implementatie heeft gaten — 'nl' users krijgen Engelse copy

**Unieke sterke punten van Kravex:**
- Fatigue/recovery tracking is genuinuine differentiator vs Hevy
- AI die de volgende workout suggereert op basis van recente trainingen — dit doet niemand anders goed
- PWA > native app voor veel gebruikers

**Priority fixes:**
1. AI Coach tab in bottom nav (dag 1 fix)
2. Rest timer in workout view
3. Stale training bug opruimen
4. i18n gaps fixen
5. Gewicht stap configureerbaar maken

**Cijfer: 7/10** — De AI differentiator is echt goed. Navigatie en polish moeten omhoog.

---

## 👩 Anna (45, complete beginner, niet tech-savvy)

**Eerste indruk:**
- Logo en naam zijn duidelijk. "Jouw persoonlijke training coach" — dat snap ik.
- Donker design ziet er wel serieus uit maar misschien een beetje intimiderend?

**Onboarding:**
- Stap 1 "Welcome" — simpel, duidelijk, prima.
- Stap 2 "How it works" — "RPE"? "Splits"? Ik weet niet wat een split is in de gym-context. De uitleg staat erbij maar ik moet lezen en dat haal ik snel over.
- Stap 3 "Your preferences" — oké, naam invullen is makkelijk. Maar "Muscle mass / Strength / Endurance" — wat moet ik kiezen als ik gewoon gezonder wil worden en gewicht wil verliezen? Er is geen "Afvallen" optie.
- Equipment: "Full gym / Home / dumbbells / Barbell at home" — ik heb niets. Geen optie voor bodyweight/geen equipment.

**Verwarrende momenten:**
- Na onboarding: twee knoppen — "Start training" en "Free training" — totaal onduidelijk verschil
- "Training actief — Ga terug" balk bovenaan de hele tijd — ik dacht dat ik iets fout had gedaan
- Progress tab: "No exercises found" — ziet eruit alsof de app kapot is
- AI Coach is niet te vinden in de navigatie — ik ben compleet afgedwaald

**Wat ik leuk vond:**
- Het ziet er mooi uit, niet nep
- De app vraagt niet om teveel persoonlijke informatie bij aanmelden

**Zou ik dit gebruiken?**
Waarschijnlijk niet na dag 1 — te veel onduidelijkheid, geen guidance voor beginners. Ik zou denken dat ik iets fout doe.

**Cijfer: 4/10** — Te veel aannames over voorkennis van de gebruiker.

---

## 📊 SAMENVATTENDE PRIORITEITENLIJST

### Kritiek (fix vóór launch)
1. **AI Coach in bottom nav** — de #1 feature is niet vindbaar
2. **Stale active workout bug** — localStorage `coach-active-workout` opruimen bij startup als timer > 6 uur
3. **i18n gaps** — "Good evening", "Time to get started", "Free training", onboarding copy
4. **"Bodyweight only" equipment optie** in onboarding
5. **"Weight loss / Healthier" doel** toevoegen naast Muscle/Strength/Endurance

### Hoog (week 1 na launch)
6. **Rest timer** zichtbaar in workout view (floating of sticky)
7. **Uitleg verschil** Start training vs Free training
8. **Welkomstworkout** voor nieuwe users (geen lege state)
9. **Gewicht stap** instelbaar (0.5 / 1 / 2.5 kg)
10. **Empty state Progress** verbeteren met CTA

### Wens (roadmap)
11. RPE als doelstelling per set (niet alleen achteraf)
12. Programma-import (CSV / Hevy export)
13. Notities per oefening
14. Push notifications voor trainingreminders
