import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MEASUREMENT_TYPES, validateMeasurement } from '../lib/measurements'
import { getLocalDateString } from '../lib/dateUtils'
import type { MeasurementType } from '../lib/measurements'

interface MeasurementInputProps {
  onSave: (type: MeasurementType, value: number, date: string) => void
}

export default function MeasurementInput({ onSave }: MeasurementInputProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<MeasurementType>('weight')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(() => getLocalDateString(new Date()))
  const [error, setError] = useState<string | null>(null)

  const selectedType = MEASUREMENT_TYPES.find(m => m.type === type)
  const unit = selectedType?.unit ?? 'cm'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numValue = Number(value)
    const validationError = validateMeasurement(type, numValue)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onSave(type, numValue, date)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <p className="label-caps mb-3">{t('measurements.add')}</p>

      {/* Row 1: Type + Value */}
      <div className="flex gap-2 mb-2">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value as MeasurementType); setError(null) }}
          className="h-11 flex-1 rounded-xl px-3 text-sm text-white outline-none"
        >
          {MEASUREMENT_TYPES.map(m => (
            <option key={m.type} value={m.type}>{t(m.labelKey)}</option>
          ))}
        </select>

        <div className="relative flex-1">
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null) }}
            placeholder="0"
            aria-label={`${t(selectedType?.labelKey ?? 'measurements.weight')} (${unit})`}
            className="h-11 w-full rounded-xl px-3 pr-10 text-sm text-white placeholder-gray-600 outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {unit}
          </span>
        </div>
      </div>

      {/* Row 2: Date + Save */}
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 flex-1 rounded-xl px-3 text-sm text-white outline-none"
        />
        <button
          type="submit"
          aria-label={t('measurements.save')}
          className="btn-primary h-11 px-6 text-sm"
        >
          {t('measurements.save')}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </form>
  )
}
