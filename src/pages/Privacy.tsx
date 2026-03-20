import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Terug
      </button>

      <h1 className="mb-2 text-2xl font-bold text-white">Privacybeleid</h1>
      <p className="mb-8 text-sm text-gray-500">Laatst bijgewerkt: 15 maart 2026</p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">Welke gegevens verzamelen we?</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>Kravex verzamelt alleen gegevens die nodig zijn om de app te laten functioneren:</p>
            <ul className="ml-4 list-disc space-y-1 text-gray-400">
              <li>Trainingsdata: workouts, sets, herhalingen, gewichten en RPE-waarden</li>
              <li>Accountgegevens: e-mailadres voor authenticatie</li>
              <li>App-instellingen: trainingsdoel, lichaamsgewicht en ervaringsniveau</li>
            </ul>
            <p className="mt-3 text-gray-400">
              Wij verzamelen geen locatiegegevens, gebruiken geen tracking pixels en werken niet samen met advertentienetwerken.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">Hoe gebruiken we je gegevens?</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>
              Je trainingsdata wordt uitsluitend gebruikt om gepersonaliseerde AI-aanbevelingen binnen de app te genereren.
              Dit omvat trainingsschema's, herstelanalyses en voortgangsvoorspellingen.
            </p>
            <p className="text-gray-400">
              Je gegevens worden nooit verkocht, verhuurd of gedeeld met derden voor commerciele doeleinden.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">Hoe bewaren we je gegevens?</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>Al je gegevens worden opgeslagen op beveiligde servers van Supabase, gehost op AWS-infrastructuur.</p>
            <ul className="ml-4 list-disc space-y-1 text-gray-400">
              <li>Alle verbindingen zijn versleuteld via HTTPS (in transit)</li>
              <li>Gegevens worden versleuteld opgeslagen (in rust)</li>
              <li>Toegang is beperkt tot geautoriseerde systemen</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">Jouw rechten</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>Je hebt volledige controle over je gegevens:</p>
            <ul className="ml-4 list-disc space-y-1 text-gray-400">
              <li>
                <span className="text-gray-300">Account verwijderen:</span> Via Profiel en Account verwijderen kun je je volledige account en alle bijbehorende data permanent verwijderen
              </li>
              <li>
                <span className="text-gray-300">Data exporteren:</span> Neem contact op met support om een kopie van al je gegevens op te vragen
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">Contact</h2>
          <div className="text-sm leading-relaxed text-gray-300">
            <p>Heb je vragen over ons privacybeleid of je gegevens? Neem contact met ons op:</p>
            <p className="mt-2 text-cyan-400">privacy@kravex.app</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">Wijzigingen</h2>
          <div className="text-sm leading-relaxed text-gray-300">
            <p>
              Bij materiele wijzigingen in dit privacybeleid informeren wij je via de app of per e-mail.
              We raden aan dit beleid periodiek te controleren.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
