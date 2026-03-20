import { useTranslation } from 'react-i18next'
import { X, Share2 } from 'lucide-react'
import { useStoryNavigation } from './useStoryNavigation'
import TitleCard from './cards/TitleCard'
import OverviewCard from './cards/OverviewCard'
import ConsistencyCard from './cards/ConsistencyCard'
import StrengthCard from './cards/StrengthCard'
import VolumeCard from './cards/VolumeCard'
import FavoriteCard from './cards/FavoriteCard'
import SplitCard from './cards/SplitCard'
import FunStatsCard from './cards/FunStatsCard'
import PersonalityCard from './cards/PersonalityCard'
import FinalCard from './cards/FinalCard'
import type { TrainingStoryData } from '../../lib/trainingStory'

const TOTAL_CARDS = 10
const AUTO_ADVANCE_MS = 5000

interface TrainingStoryProps {
  data: TrainingStoryData
  onClose: () => void
  onShare?: () => void
}

/**
 * Progress bar with 10 segments.
 * Done = bg-white/60, Active = animated fill, Todo = bg-white/20.
 */
function ProgressBar({ currentCard }: { currentCard: number }) {
  return (
    <div className="flex gap-1 px-3" role="progressbar" aria-valuenow={currentCard + 1} aria-valuemax={TOTAL_CARDS}>
      {Array.from({ length: TOTAL_CARDS }, (_, i) => {
        const isDone = i < currentCard
        const isActive = i === currentCard

        return (
          <div
            key={i}
            className="h-[3px] flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {isDone && (
              <div className="h-full w-full rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }} />
            )}
            {isActive && (
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: 'rgba(255,255,255,1)',
                  animation: `story-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TrainingStory({ data, onClose, onShare }: TrainingStoryProps) {
  const { t } = useTranslation()

  const {
    currentCard,
    handleTouchStart,
    handleTouchEnd,
    handleClick,
    pause,
    resume,
  } = useStoryNavigation({
    totalCards: TOTAL_CARDS,
    autoAdvanceMs: AUTO_ADVANCE_MS,
    onComplete: onClose,
  })

  // Whether to show the share button overlay (not on final card, it has its own)
  const showShareButton = onShare && currentCard !== TOTAL_CARDS - 1

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #020509 100%)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* Progress bar - top */}
      <div className="relative z-10 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <ProgressBar currentCard={currentCard} />
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-800/60 text-gray-400"
        style={{ top: 'max(2.5rem, calc(env(safe-area-inset-top) + 1.25rem))' }}
        aria-label={t('common.close')}
      >
        <X size={18} aria-hidden="true" />
      </button>

      {/* Card area */}
      <div className="relative flex-1">
        <TitleCard       data={data} isActive={currentCard === 0} />
        <OverviewCard    data={data} isActive={currentCard === 1} />
        <ConsistencyCard data={data} isActive={currentCard === 2} />
        <StrengthCard    data={data} isActive={currentCard === 3} />
        <VolumeCard      data={data} isActive={currentCard === 4} />
        <FavoriteCard    data={data} isActive={currentCard === 5} />
        <SplitCard       data={data} isActive={currentCard === 6} />
        <FunStatsCard    data={data} isActive={currentCard === 7} />
        <PersonalityCard data={data} isActive={currentCard === 8} />
        <FinalCard       isActive={currentCard === 9} onShare={onShare} />
      </div>

      {/* Share button overlay (bottom-right, except on final card) */}
      {showShareButton && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onShare()
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseEnter={pause}
          onMouseLeave={resume}
          className="absolute bottom-6 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60 text-gray-400 transition-colors hover:text-white"
          aria-label={t('story.final.share')}
        >
          <Share2 size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
