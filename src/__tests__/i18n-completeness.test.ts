/**
 * Comprehensive i18n completeness audit.
 *
 * Ensures:
 * 1. nl.json and en.json have identical key sets (parity).
 * 2. No empty-string values in either locale.
 * 3. Every t() call found in source code references a key that exists in both locales.
 *
 * This replaces the earlier narrow BUG-001 PlateauAlert key check.
 */
import { describe, it, expect } from 'vitest'
import nl from '../locales/nl.json'
import en from '../locales/en.json'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively flatten a nested JSON object into dot-notation keys. */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

/** Resolve a dot-separated key path against a nested JSON object. */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

// ---------------------------------------------------------------------------
// Key sets
// ---------------------------------------------------------------------------

const nlKeys = flattenKeys(nl as Record<string, unknown>).sort()
const enKeys = flattenKeys(en as Record<string, unknown>).sort()
const nlSet = new Set(nlKeys)
const enSet = new Set(enKeys)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('i18n Completeness', () => {
  // --- Key parity -----------------------------------------------------------

  it('nl.json and en.json have the same number of keys', () => {
    expect(nlKeys.length).toBe(enKeys.length)
  })

  it('every NL key exists in EN', () => {
    const missingInEn = nlKeys.filter((k) => !enSet.has(k))
    expect(missingInEn).toEqual([])
  })

  it('every EN key exists in NL', () => {
    const missingInNl = enKeys.filter((k) => !nlSet.has(k))
    expect(missingInNl).toEqual([])
  })

  // --- No empty values ------------------------------------------------------

  it('no empty string values in NL', () => {
    const empties = nlKeys.filter(
      (k) => getNestedValue(nl as Record<string, unknown>, k) === '',
    )
    expect(empties).toEqual([])
  })

  it('no empty string values in EN', () => {
    const empties = enKeys.filter(
      (k) => getNestedValue(en as Record<string, unknown>, k) === '',
    )
    expect(empties).toEqual([])
  })

  // --- All t() keys from source must exist in locales -----------------------

  /**
   * Every key referenced via t('key') in .ts/.tsx source files.
   * Extracted by scanning the codebase; kept as a hardcoded snapshot so the
   * test runs without filesystem access at runtime. Regenerate this list
   * whenever new t() calls are added by running:
   *
   *   rg -o "t\(['\"]([a-zA-Z0-9_.]+)['\"]" --no-filename \
   *     -g '*.tsx' -g '*.ts' --no-line-number src/ \
   *     | sed "s/t(['\"]//; s/['\"]$//" | sort -u
   *
   * then filter for valid i18n key patterns (namespace.key or root_level_key).
   */
  const T_KEYS_IN_SOURCE: string[] = [
    'achievements.title',
    'achievements.unlocked',
    'aicoach.adjust',
    'aicoach.auth_error',
    'aicoach.deload_hint',
    'aicoach.energy_today',
    'aicoach.error',
    'aicoach.first_training',
    'aicoach.first_training_advanced',
    'aicoach.how_long',
    'aicoach.loading',
    'aicoach.loading_sub',
    'aicoach.make_training',
    'aicoach.profile_banner',
    'aicoach.ready',
    'aicoach.recovery',
    'aicoach.retry',
    'aicoach.start_workout',
    'aicoach.today',
    'aicoach.trained_hours_ago',
    'aicoach.training_type',
    'aicoach.want_extra',
    'aicoach.why_this_training',
    'aicoach.your_training',
    'analyse.all_clear',
    'analyse.all_clear_sub',
    'analyse.cta_sub',
    'analyse.cta_title',
    'analyse.failed',
    'analyse.insight_one',
    'analyse.insight_other',
    'analyse.loading',
    'analyse.loading_sub',
    'analyse.need_min_workouts',
    'analyse.need_more',
    'analyse.reanalyse',
    'analyse.rec_label',
    'analyse.refresh',
    'analyse.retry',
    'analyse.run_btn',
    'analyse.subtitle',
    'analyse.title',
    'auth.session_expired',
    'block_wizard.end',
    'block_wizard.end_date',
    'block_wizard.goal_question',
    'block_wizard.goal_sub',
    'block_wizard.program_duration',
    'block_wizard.program_sub',
    'block_wizard.start',
    'block_wizard.start_date',
    'block_wizard.start_program',
    'block_wizard.title',
    'block_wizard.view_program',
    'block_wizard.weeks_program',
    'block_wizard.when_start',
    'block_wizard.when_sub',
    'block_wizard.your_program',
    'calendar.calendar',
    'calendar.heatmap_title',
    'calendar.less',
    'calendar.more',
    'calendar.more_label',
    'calendar.no_workouts',
    'calendar.overview',
    'calendar.rest_day',
    'calendar.start_first',
    'calendar.tap_day_hint',
    'calendar.this_month',
    'calendar.this_year',
    'calendar.view_full_workout',
    'calendar.volume_label',
    'common.back',
    'common.cancel',
    'common.close',
    'common.confirm',
    'common.delete',
    'common.exercises',
    'common.loading',
    'common.next',
    'common.reps',
    'common.retry',
    'common.sets',
    'common.show_less',
    'common.show_more',
    'common.skip',
    'common.volume',
    'dashboard.free_training',
    'dashboard.no_exercises',
    'dashboard.recent',
    'dashboard.recovery',
    'dashboard.start_training',
    'dashboard.streak',
    'dashboard.time_to_start',
    'dashboard.title',
    'dashboard.todays_workout',
    'dashboard.view_all',
    'dashboard.workouts',
    'deload.action',
    'deload.deload_hint',
    'deload.later',
    'deload.recovery_desc',
    'deload.recovery_title',
    'deload.signal_frequency',
    'deload.signal_rpe',
    'deload.signal_volume',
    'deload.urgent_desc',
    'deload.urgent_title',
    'exercise_guide.common_mistakes',
    'exercise_guide.execution',
    'exercise_guide.loading',
    'exercise_guide.muscles',
    'exercise_guide.youtube',
    'exercise_picker.all',
    'exercise_picker.no_results',
    'exercise_picker.search_placeholder',
    'export.csv_measurements',
    'export.csv_workouts',
    'export.json_full',
    'finish_modal.done',
    'finish_modal.minutes',
    'finish_modal.new_pr',
    'finish_modal.next_workout',
    'finish_modal.plan_next',
    'finish_modal.recovery',
    'finish_modal.save',
    'finish_modal.save_template',
    'finish_modal.template_name_placeholder',
    'finish_modal.template_save_error',
    'finish_modal.template_saved',
    'finish_modal.title',
    'finish_modal.volume',
    'first_workout.start',
    'first_workout.subtitle',
    'first_workout.tip',
    'first_workout.title',
    'forecast.current',
    'forecast.expected_pr',
    'forecast.insufficient',
    'forecast.plateau',
    'forecast.stale',
    'forecast.target',
    'forecast.title',
    'gender.female',
    'gender.label',
    'gender.male',
    'gender.other',
    'history.delete_confirm',
    'history.delete_confirm_sub',
    'history.load_more',
    'history.no_results',
    'history.no_workouts',
    'history.search_placeholder',
    'history.start_first',
    'history.subtitle',
    'history.title',
    'injury.check_in_prompt',
    'injury.check_in_title',
    'injury.days_ago',
    'injury.injuries_title',
    'injury.no_injuries',
    'injury.rehab_exercises',
    'injury.report_injury',
    'injury.resolve',
    'injury.resolve_confirm',
    'injury.risky',
    'injury.select_area',
    'injury.select_severity',
    'injury.select_side',
    'injury.show_all',
    'injury.show_less',
    'injury_radar.high',
    'injury_radar.moderate',
    'injury_radar.title',
    'junk_volume.dismiss',
    'junk_volume.stop',
    'junk_volume.warning',
    'logger.add_exercise',
    'logger.add_exercise_hint',
    'logger.advanced_options',
    'logger.ai_generating',
    'logger.ai_suggest',
    'logger.analysis_required',
    'logger.analyzing',
    'logger.available_time',
    'logger.change_split',
    'logger.choose_exercises',
    'logger.choose_split',
    'logger.choose_template',
    'logger.confirm_finish',
    'logger.confirm_finish_sub',
    'logger.empty_training',
    'logger.exercise_done',
    'logger.extra_set',
    'logger.finding_alternative',
    'logger.finish',
    'logger.free_training_sub',
    'logger.generate_workout',
    'logger.generation_failed',
    'logger.how_many_exercises',
    'logger.last_session',
    'logger.less_time',
    'logger.loading_workout',
    'logger.log_set',
    'logger.menu',
    'logger.more_options',
    'logger.no_rest',
    'logger.notes',
    'logger.notes_placeholder',
    'logger.plates',
    'logger.ready',
    'logger.remove',
    'logger.repeat_last',
    'logger.repeat_set',
    'logger.replacing',
    'logger.reps_label',
    'logger.rest_after',
    'logger.rpe_hint',
    'logger.saving',
    'logger.select_time_first',
    'logger.set_removed',
    'logger.start_empty',
    'logger.stop',
    'logger.stop_confirm',
    'logger.stop_confirm_sub',
    'logger.stop_workout',
    'logger.superset_active',
    'logger.superset_exit',
    'logger.superset_link',
    'logger.superset_mode',
    'logger.superset_mode_active',
    'logger.swap_ai_failed',
    'logger.swap_already_in_workout',
    'logger.swap_exercise',
    'logger.swap_no_options',
    'logger.technique',
    'logger.template',
    'logger.template_delete_error',
    'logger.template_deleted',
    'logger.template_loaded',
    'logger.templates_saved',
    'logger.train',
    'logger.trimmed',
    'logger.try',
    'logger.try_later',
    'logger.undo',
    'logger.view_details',
    'logger.weight',
    'main_lift.bench',
    'main_lift.current_max',
    'main_lift.deadlift',
    'main_lift.goal_date',
    'main_lift.goal_kg',
    'main_lift.main_badge',
    'main_lift.ohp',
    'main_lift.section_hint',
    'main_lift.section_title',
    'main_lift.set_main',
    'main_lift.squat',
    'measurements.add',
    'measurements.no_data',
    'measurements.save',
    'measurements.trend_down',
    'measurements.trend_stable',
    'measurements.trend_up',
    'momentum.pr_moment',
    'muscle_map.back',
    'muscle_map.front',
    'muscles.back',
    'muscles.biceps',
    'muscles.chest',
    'muscles.core',
    'muscles.glutes',
    'muscles.hamstrings',
    'muscles.quads',
    'muscles.shoulders',
    'muscles.triceps',
    'nav.profile',
    'nav.progress',
    'nav.today',
    'nav.train',
    'onboarding.beginners.begin',
    'onboarding.beginners.concept_recovery',
    'onboarding.beginners.concept_recovery_desc',
    'onboarding.beginners.concept_rpe',
    'onboarding.beginners.concept_rpe_desc',
    'onboarding.beginners.concept_splits',
    'onboarding.beginners.concept_splits_desc',
    'onboarding.beginners.equip_barbell',
    'onboarding.beginners.equip_dumbbells',
    'onboarding.beginners.equip_full',
    'onboarding.beginners.equipment_label',
    'onboarding.beginners.goal_endurance',
    'onboarding.beginners.goal_label',
    'onboarding.beginners.goal_muscle',
    'onboarding.beginners.goal_strength',
    'onboarding.beginners.how_title',
    'onboarding.beginners.name_label',
    'onboarding.beginners.pref_title',
    'onboarding.beginners.start_training',
    'onboarding.beginners.step_indicator',
    'onboarding.beginners.time_label',
    'onboarding.beginners.welcome_sub',
    'onboarding.beginners.welcome_title',
    'onboarding.continue',
    'onboarding.equip_bodyweight',
    'onboarding.equip_bodyweight_sub',
    'onboarding.equip_dumbbells',
    'onboarding.equip_dumbbells_sub',
    'onboarding.equip_full',
    'onboarding.equip_full_sub',
    'onboarding.equipment_question',
    'onboarding.equipment_sub',
    'onboarding.exp_advanced',
    'onboarding.exp_advanced_sub',
    'onboarding.exp_beginner',
    'onboarding.exp_beginner_sub',
    'onboarding.exp_intermediate',
    'onboarding.exp_intermediate_sub',
    'onboarding.exp_returning',
    'onboarding.exp_returning_sub',
    'onboarding.experience_question',
    'onboarding.experience_sub',
    'onboarding.freq_2x',
    'onboarding.freq_2x_sub',
    'onboarding.freq_3x',
    'onboarding.freq_3x_sub',
    'onboarding.freq_4x',
    'onboarding.freq_4x_sub',
    'onboarding.freq_5x',
    'onboarding.freq_5x_sub',
    'onboarding.frequency_question',
    'onboarding.frequency_sub',
    'onboarding.goal_endurance',
    'onboarding.goal_endurance_sub',
    'onboarding.goal_muscle',
    'onboarding.goal_muscle_sub',
    'onboarding.goal_question',
    'onboarding.goal_strength',
    'onboarding.goal_strength_sub',
    'onboarding.goal_sub',
    'onboarding.name_label',
    'onboarding.name_placeholder',
    'onboarding.profile_sub',
    'onboarding.profile_title',
    'onboarding.ready',
    'onboarding.ready_sub',
    'onboarding.skip',
    'onboarding.start_first',
    'onboarding.weight_hint',
    'onboarding.weight_label',
    'plan.active_block',
    'plan.after_block_hint',
    'plan.choose_phase',
    'plan.deload_week',
    'plan.end_block',
    'plan.end_block_confirm',
    'plan.end_block_hint',
    'plan.fatigue_signals',
    'plan.fatigue_urgent',
    'plan.generate_today',
    'plan.new_hint',
    'plan.new_hint_sub',
    'plan.next_phase_auto',
    'plan.now',
    'plan.periodization',
    'plan.program',
    'plan.recommended_order',
    'plan.rep_range',
    'plan.start_block',
    'plan.target_rpe',
    'plan.title',
    'plan.volume_note',
    'plan.week',
    'plan.week_based_on_start',
    'plan.week_focus',
    'plan.weeks',
    'plan.why_periodization',
    'plan.why_periodization_desc',
    'plate_calc.bar_only',
    'plate_calc.bar_weight',
    'plate_calc.not_exact',
    'plate_calc.per_side',
    'plate_calc.title',
    'plate_calc.too_light',
    'plate_calc.total_weight',
    'plateau_alert.exercise_count',
    'plateau_alert.title',
    'pr.all_time_bests',
    'pr.e1rm_label',
    'pr.new_record',
    'pr.no_records',
    'pr_goals.add',
    'pr_goals.date',
    'pr_goals.days_left',
    'pr_goals.duplicate',
    'pr_goals.exercise',
    'pr_goals.max_reached',
    'pr_goals.no_goals',
    'pr_goals.remove',
    'pr_goals.target',
    'pr_goals.title',
    'priority_muscles.focus_badge',
    'priority_muscles.subtitle',
    'priority_muscles.title',
    'priority_muscles.until',
    'profile.autosaved',
    'profile.confirm_delete',
    'profile.danger_zone',
    'profile.delete_account',
    'profile.delete_confirm_text',
    'profile.delete_failed',
    'profile.deleting',
    'profile.equipment_dumbbells',
    'profile.equipment_full_gym',
    'profile.equipment_home_gym',
    'profile.equipment_label',
    'profile.experience_advanced',
    'profile.experience_beginner',
    'profile.experience_complete_beginner',
    'profile.experience_complete_beginner_sub',
    'profile.experience_intermediate',
    'profile.experience_label',
    'profile.experience_returning',
    'profile.experience_returning_sub',
    'profile.export_data',
    'profile.export_sub',
    'profile.frequency_hint',
    'profile.frequency_label',
    'profile.incomplete_banner',
    'profile.language_label',
    'profile.logging_out',
    'profile.logout',
    'profile.member_since_label',
    'profile.name_label',
    'profile.name_placeholder',
    'profile.no_export',
    'profile.optional',
    'profile.privacy',
    'profile.rest_hint',
    'profile.rest_label',
    'profile.session_error',
    'profile.stats_volume',
    'profile.stats_workouts',
    'profile.subtitle',
    'profile.tab_account',
    'profile.tab_personal',
    'profile.tab_training',
    'profile.terms_label',
    'profile.title',
    'profile.unknown',
    'profile.week_abbr',
    'profile.weight_hint',
    'profile.weight_label',
    'profile.weight_placeholder',
    'progress.all_time_e1rm',
    'progress.estimated_1rm',
    'progress.favorite_stat',
    'progress.no_exercises',
    'progress.recent_sessions',
    'progress.search_exercise',
    'progress.stats',
    'progress.title',
    'progress.volume_per_muscle',
    'progress.volume_per_session',
    'progress.volume_stat',
    'progress.workouts_stat',
    'progress.workouts_until_analysis',
    'rest_timer.heavy_set',
    'rest_timer.intense_set',
    'rest_timer.light_set',
    'rest_timer.rest',
    'rest_timer.skip',
    'rest_timer.stop',
    'resume_banner.confirm_discard',
    'resume_banner.discard',
    'resume_banner.resume',
    'resume_banner.title',
    'review.your_ai_workout',
    'rpe.beginner_explanation_easy',
    'rpe.beginner_explanation_hard',
    'rpe.beginner_explanation_medium',
    'rpe.beginner_explanation_summary',
    'rpe.beginner_explanation_title',
    'rpe.explanation_10',
    'rpe.explanation_6',
    'rpe.explanation_7',
    'rpe.explanation_8',
    'rpe.explanation_9',
    'rpe.explanation_summary',
    'rpe.explanation_title',
    'rpe.info',
    'rpe_simple_easy',
    'rpe_simple_hard',
    'rpe_simple_medium',
    'share.more_exercises',
    'share.new_records',
    'share.screenshot_hint',
    'share.share_button',
    'share.streak',
    'share.title',
    'story.banner.cta',
    'story.banner.subtitle',
    'story.banner.title',
    'story.consistency.days_streak',
    'story.consistency.score',
    'story.consistency.title',
    'story.favorite.most_trained_muscle',
    'story.favorite.title',
    'story.favorite.total_sets',
    'story.final.share',
    'story.final.title',
    'story.fun_stats.heaviest_set',
    'story.fun_stats.longest_workout',
    'story.fun_stats.minutes',
    'story.fun_stats.most_reps',
    'story.fun_stats.shortest_workout',
    'story.fun_stats.title',
    'story.overview.sets',
    'story.overview.time',
    'story.overview.title',
    'story.overview.volume',
    'story.overview.workouts',
    'story.personality.subtitle',
    'story.split.title',
    'story.strength.new_prs',
    'story.strength.no_prs',
    'story.strength.no_prs_sub',
    'story.strength.title',
    'story.title_card.in_review',
    'story.title_card.your_month',
    'story.view_story',
    'story.volume_trend.title',
    'story.volume_trend.vs_last_month',
    'superset_modal.activate',
    'superset_modal.antagonist_hint',
    'superset_modal.back',
    'superset_modal.close',
    'superset_modal.confirm',
    'superset_modal.faster',
    'superset_modal.no_pairs',
    'superset_modal.rest_after',
    'superset_modal.rest_complete',
    'superset_modal.solo',
    'superset_modal.superset',
    'superset_modal.swap_hint',
    'superset_modal.title',
    'template_library.exercises',
    'template_library.load',
    'template_library.no_templates',
    'template_library.no_templates_sub',
    'template_library.title',
    'training_goal.conditioning',
    'training_goal.conditioning_sub',
    'training_goal.hypertrophy',
    'training_goal.hypertrophy_sub',
    'training_goal.phase_build',
    'training_goal.phase_deload',
    'training_goal.phase_peak',
    'training_goal.phase_strength',
    'training_goal.powerbuilding',
    'training_goal.powerbuilding_sub',
    'training_goal.strength',
    'training_goal.strength_sub',
    'training_goal.title',
    'volume.avg_per_week',
    'volume.best_week',
    'volume.muscle_breakdown',
    'volume.no_data',
    'volume.sets_label',
    'volume.title',
    'volume.total_volume',
    'volume.trend',
    'warmup.bar_only',
    'warmup.calculate',
    'warmup.done_btn',
    'warmup.hide',
    'warmup.title',
    'weakness.good_balance',
    'weakness.insufficient_data',
    'weakness.insufficient_sub',
    'weakness.needs_attention',
    'weakness.no_imbalances',
    'weakness.title',
    'weakness.volume_per_group',
    'workout_detail.exercises',
    'workout_detail.history',
    'workout_detail.not_found',
    'workout_detail.notes',
    'workout_detail.volume',
    'workout_detail.workout',
  ]

  it('every t() key used in source exists in NL locale', () => {
    const missing = T_KEYS_IN_SOURCE.filter((k) => !nlSet.has(k))
    expect(missing).toEqual([])
  })

  it('every t() key used in source exists in EN locale', () => {
    const missing = T_KEYS_IN_SOURCE.filter((k) => !enSet.has(k))
    expect(missing).toEqual([])
  })

  // --- Structural sanity ----------------------------------------------------

  it('all values are strings (no nested objects at leaf level)', () => {
    const nonStringsNl = nlKeys.filter(
      (k) => typeof getNestedValue(nl as Record<string, unknown>, k) !== 'string',
    )
    const nonStringsEn = enKeys.filter(
      (k) => typeof getNestedValue(en as Record<string, unknown>, k) !== 'string',
    )
    expect(nonStringsNl).toEqual([])
    expect(nonStringsEn).toEqual([])
  })

  it('interpolation placeholders match between NL and EN', () => {
    const placeholderRegex = /\{\{(\w+)\}\}/g
    const mismatches: string[] = []

    for (const key of nlKeys) {
      if (!enSet.has(key)) continue
      const nlVal = String(getNestedValue(nl as Record<string, unknown>, key) ?? '')
      const enVal = String(getNestedValue(en as Record<string, unknown>, key) ?? '')

      const nlPlaceholders = [...nlVal.matchAll(placeholderRegex)]
        .map((m) => m[1])
        .sort()
      const enPlaceholders = [...enVal.matchAll(placeholderRegex)]
        .map((m) => m[1])
        .sort()

      if (JSON.stringify(nlPlaceholders) !== JSON.stringify(enPlaceholders)) {
        mismatches.push(
          `${key}: NL={{${nlPlaceholders.join(',')}}} EN={{${enPlaceholders.join(',')}}}`,
        )
      }
    }
    expect(mismatches).toEqual([])
  })
})
