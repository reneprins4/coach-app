import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
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

      <h1 className="mb-2 text-2xl font-bold text-white">Gebruiksvoorwaarden</h1>
      <p className="mb-8 text-sm text-gray-500">Laatst bijgewerkt: 15 maart 2026</p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">1. Aanvaarding</h2>
          <div className="text-sm leading-relaxed text-gray-300">
            <p>
              Door de Kravex app te gebruiken ga je akkoord met deze gebruiksvoorwaarden.
              Als je niet akkoord gaat met deze voorwaarden, verzoeken wij je de app niet te gebruiken.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">2. Gebruik van de app</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>Kravex is bedoeld voor persoonlijk gebruik om je trainingen bij te houden en te verbeteren.</p>
            <p className="text-gray-400">
              Je bent zelf verantwoordelijk voor je training en gezondheid. Raadpleeg altijd een arts
              voordat je begint met een nieuw trainingsprogramma, vooral als je gezondheidsproblemen hebt
              of na een blessure.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">3. Account</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>
              Je bent verantwoordelijk voor de beveiliging van je account en alle activiteiten die
              via jouw account plaatsvinden.
            </p>
            <p className="text-gray-400">
              Je mag je account niet delen met anderen of overdragen aan derden.
              Elk account is strikt persoonlijk.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">4. Intellectueel eigendom</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>
              Alle content, algoritmen, ontwerpen en technologie in Kravex zijn eigendom van Kravex
              en worden beschermd door auteursrecht en andere intellectuele eigendomsrechten.
            </p>
            <p className="text-gray-400">
              Je mag de app niet kopieren, reverse-engineeren, decompileren of afgeleide werken maken
              zonder uitdrukkelijke schriftelijke toestemming.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">5. Aansprakelijkheid</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>
              Kravex is niet aansprakelijk voor blessures, letsel of schade voortvloeiend uit het
              gebruik van de app of het opvolgen van trainingsadviezen.
            </p>
            <p className="text-gray-400">
              Trainingsadviezen gegenereerd door de AI coach zijn algemeen van aard en vormen geen
              medisch advies. De app vervangt geen professionele begeleiding van een arts,
              fysiotherapeut of gecertificeerde personal trainer.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">6. Beeindiging</h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-300">
            <p>
              We behouden het recht om accounts op te schorten of te beeindigen bij misbruik van de app,
              schending van deze voorwaarden of gedrag dat schadelijk is voor andere gebruikers.
            </p>
            <p className="text-gray-400">
              Jij kunt je account op elk moment verwijderen via de Profiel pagina. Na verwijdering worden
              al je gegevens permanent gewist.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">7. Contact</h2>
          <div className="text-sm leading-relaxed text-gray-300">
            <p>Heb je vragen over deze gebruiksvoorwaarden? Neem contact met ons op:</p>
            <p className="mt-2 text-cyan-400">support@kravex.app</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-cyan-400">8. Toepasselijk recht</h2>
          <div className="text-sm leading-relaxed text-gray-300">
            <p>
              Op deze gebruiksvoorwaarden is Nederlands recht van toepassing. Geschillen worden
              voorgelegd aan de bevoegde rechter in Nederland.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
