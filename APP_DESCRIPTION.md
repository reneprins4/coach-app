# Kravex — App Beschrijving

## Wat is het?

Kravex is een intelligente fitness app die krachttraining combineert met AI-gestuurde coaching en wetenschappelijke periodisering. De app genereert gepersonaliseerde trainingsschema's op basis van je herstelstatus, trainingsgeschiedenis en doelen. Het is een complete workout tracker die verder gaat dan alleen sets en reps loggen — het analyseert patronen, voorspelt prestaties en waarschuwt proactief voor overtraining en blessurerisico's.

## Doelgroep

De ideale gebruiker is een serieuze krachtsporter (18-45 jaar) die:
- Al enige ervaring heeft met krachttraining (beginner tot gevorderd)
- Structuur en progressie wil in hun training
- Data-gedreven beslissingen wil nemen over hun training
- Bereid is RPE en sets consistent te loggen
- Streeft naar spieropbouw (hypertrofie) of krachtverbetering
- Nederlands spreekt (de hele UI is in het Nederlands)

## Kernfunctionaliteiten

### 1. Dashboard (Home)
Het startscherm toont een persoonlijke begroeting op basis van tijdstip, weekstatistieken (trainingen deze week, streak), en de voortgang van het actieve trainingsblok. Nieuwe gebruikers zien een duidelijke empty state met knoppen om hun eerste training te starten. Recente trainingen worden compact weergegeven met datum, oefeningen en aantal sets.

### 2. AI Coach — Gepersonaliseerde Workout Generator
Het hart van de app. De AI Coach analyseert:
- **Spierherstel per spiergroep**: Berekent recovery percentages op basis van tijd sinds laatste training, RPE en volume
- **Weekstructuur**: Toont een weekplan (Push/Pull/Legs) afgestemd op je frequentie (3-6x per week)
- **Trainingsblok context**: Houdt rekening met of je in een opbouw-, intensificatie-, kracht- of deloadfase zit
- **Energieniveau**: Je kunt aangeven of je energie laag/gemiddeld/hoog is
- **Beschikbare tijd**: 45, 60, 75 of 90 minuten selecteerbaar
- **Spier-focus**: Optioneel kun je spiergroepen aanvinken voor extra aandacht

Op basis hiervan genereert de AI een complete workout met:
- Oefeningen per spiergroep
- Exacte sets, reps, gewicht en RPE targets
- Rusttijden
- Vergelijking met vorige sessie (omhoog/omlaag/nieuw)
- Onderbouwing waarom deze training is gekozen

### 3. Workout Logger (Trainen)
Een uitgebreide training-logger met:
- **Live workout timer**: Toont verstreken tijd, totaal volume en aantal sets
- **Per-oefening tracking**: Gewicht (met +/- knoppen per 2.5kg), herhalingen, optionele RPE
- **Vorige sessie referentie**: "Vorige keer: 80kg x 8"
- **Adaptieve rusttimer**: Past rusttijd aan op basis van RPE en oefening type (compounds krijgen meer rust)
- **Plate Calculator**: Visuele weergave welke schijven je moet laden
- **Superset modus**: Koppel oefeningen aan elkaar voor efficiënter trainen
- **Oefening wisselen (Swap)**: AI zoekt een alternatief als een machine bezet is of je wilt variëren
- **Junk Volume Alert**: Waarschuwt als je sets doet die niet meer effectief zijn
- **Momentum Indicator**: Real-time feedback of je in de zone bent, vermoeid raakt of een PR-moment hebt
- **Training templates**: Sla favoriete workouts op en herlaad ze met één klik
- **Notities**: Vrij tekstveld voor persoonlijke opmerkingen

### 4. Trainingsplan (Periodisering)
Gestructureerde trainingsblokken gebaseerd op sportwetenschappelijke principes:
- **Opbouw (Accumulation)**: 4 weken, hogere volumes, RPE 7-8
- **Intensificatie**: 4 weken, hogere intensiteit, RPE 8-9
- **Kracht (Peaking)**: 3 weken, maximale kracht, RPE 9-10
- **Deload**: 1 week herstel, lage volumes, RPE 6

De Block Wizard helpt bij het kiezen van een programma op basis van je doel (spieren/kracht/beide) en toont een visuele timeline.

### 5. Voortgang — Analytics & Inzichten
Uitgebreide data-analyse met vier tabs:

**Per oefening:**
- Zoek en selecteer oefeningen
- All-time geschat 1RM (estimated one-rep max via Epley-formule)
- E1RM trendgrafiek over tijd
- Volume per sessie grafiek
- Recente sessies met details

**Spiergroepen:**
- Gestapelde bargraph van volume per spiergroep (laatste 4 weken)
- Totale statistieken: trainingen, volume, favoriete oefening

**Analyse (Form Detective):**
- AI-gestuurde analyse van trainingspatronen
- Detecteert problemen zoals inconsistent volume, RPE-drift
- Geeft concrete aanbevelingen per oefening

**Balans (Weakness Hunter):**
- Volume-verdeling per spiergroep met visuele bars
- Detecteert imbalances (push vs pull, quads vs hamstrings)
- Waarschuwingen met ernst-niveau en advies

### 6. Trainingsgeschiedenis
Chronologisch overzicht van alle trainingen met:
- Zoekfunctie op oefening
- Totaal volume per training
- Aantal sets
- Klikbaar voor details
- Verwijderen met bevestiging

### 7. Kalender
Visuele maandweergave van trainingsactiviteit:
- Dagen met training krijgen een marker
- Statistieken: trainingen deze maand, streak, dit jaar
- Klik op een dag om workout details te zien

### 8. Profiel
Complete gebruikersinstellingen:
- Naam en lichaamsgewicht
- Ervaringsniveau (beginner/gemiddeld/gevorderd)
- Trainingsdoel (spieren/kracht/conditie)
- Uitrusting (volledige gym/thuisgym/dumbbells)
- Bekende 1RM voor bench/squat/deadlift
- Trainingsfrequentie (3-6x per week)
- Standaard rusttijd
- Trainingsstatistieken
- Data export naar CSV
- Account verwijderen

## AI-functies

### Workout Generatie
De app gebruikt Claude (Anthropic) om complete trainingsplannen te genereren. Het model ontvangt:
- Volledige spierherstel-status per spiergroep
- Trainingsgeschiedenis van de laatste 3 weken
- Gebruikersinstellingen (niveau, doel, uitrusting)
- Huidige trainingsfase en week-targets
- Energieniveau en beschikbare tijd

Het resultaat is een JSON met oefeningen inclusief sets, reps, gewicht, RPE, rusttijden en onderbouwing.

### Oefening Substitutie
Als een machine bezet is of je wilt variëren, geeft de AI een intelligent alternatief op basis van:
- Dezelfde spiergroep
- Beschikbare apparatuur
- Ervaringsniveau
- Reden voor de wissel

### Form Detective
AI-analyse van trainingspatronen die problemen detecteert zoals:
- Stagnerende progressie
- Inconsistent volume
- RPE-drift (zelfde gewicht voelt zwaarder)
- Suboptimale oefening-keuzes

### Performance Forecast
Voorspelt wanneer je een nieuw PR kunt verwachten op basis van trendanalyse van e1RM progressie.

## Onderscheidend vermogen

**Vergeleken met MyFitnessPal:**
- Kravex is specifiek voor krachttraining, niet voor voeding/calorieën
- Veel diepere training-analyse en periodisering

**Vergeleken met Hevy/Strong:**
- AI-gegenereerde workouts (niet alleen templates)
- Wetenschappelijke periodisering ingebouwd
- Proactieve blessure- en vermoeidheidswaarschuwingen
- Intelligente spiergroep-recovery tracking
- Performance forecasting

**Unieke features:**
- **Injury Radar**: Detecteert blessurerisico's door volume-spikes, imbalances, hoge RPE zonder deload, en onvoldoende herstel
- **Deload Alert**: Automatische vermoeidheidsdetectie met aanbeveling voor herstelweek
- **Plateau Alert**: Detecteert wanneer progressie stagneert per oefening
- **Junk Volume Detection**: Waarschuwt als extra sets niet meer effectief zijn
- **Momentum Indicator**: Real-time feedback tijdens de training
- **Block Wizard**: Begeleide setup van periodisatie-programma's
- **Adaptieve rusttijden**: Rust past zich aan op basis van RPE en oefening type

## Technische kwaliteit

**Aanwezig:**
- Supabase authenticatie (email login)
- Realtime data sync naar Supabase database
- React + Vite moderne stack
- Tailwind CSS voor styling
- Recharts voor grafieken
- Local storage fallback voor offline gebruik
- PWA-klaar (responsive mobile-first design)
- API integratie met Anthropic Claude

**Volwassenheid:**
- Productie-klare code met error handling
- Loading states en empty states overal
- Toast notifications voor feedback
- Modals voor confirmatie van destructieve acties
- CSV export functionaliteit
- Account verwijdering met cascade delete

## Beperkingen / wat ontbreekt nog

1. **Geen offline mode**: Zonder internet kun je geen AI workouts genereren
2. **Geen sociale features**: Geen vrienden, delen van workouts, of community
3. **Geen video's/animaties**: Oefeningen hebben geen visuele instructies (wel "Uitleg" knop die waarschijnlijk tekst geeft)
4. **Geen workout history import**: Kan geen data importeren uit andere apps
5. **Geen Apple Watch / Wear OS**: Geen smartwatch companion app
6. **Geen custom exercises**: Je kunt geen eigen oefeningen toevoegen (afhankelijk van database)
7. **Geen barcode scanner**: Geen integratie met voedingsapps
8. **Geen personal records tracker**: Wel e1RM berekening maar geen expliciete PR-viering
9. **Geen progressie-foto's**: Geen body tracking features
10. **Geen multi-language**: Alleen Nederlands
11. **Geen betaalmodel zichtbaar**: Onduidelijk of er premium features zijn
12. **Geen dark/light mode toggle**: Alleen dark mode
13. **Geen rest-day recommendations**: Focust alleen op trainingsdagen

---

*Geschreven op basis van code-analyse van de React app in /root/clawd/coach-app/src/*
