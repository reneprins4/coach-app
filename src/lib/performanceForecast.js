/**
 * Performance Forecast - Voorspelt wanneer een gebruiker een PR gaat halen
 * Gebruikt gewogen lineaire regressie met exponential smoothing
 */

const SMOOTHING_FACTOR = 0.85
const MIN_SESSIONS = 4
const PR_INCREMENT = 2.5 // kg improvement target

/**
 * Berekent gewogen lineaire regressie waar recente data zwaarder weegt
 * @param {Array<{x: number, y: number}>} points - Data punten
 * @param {number} smoothingFactor - Exponential smoothing factor (0-1)
 * @returns {{slope: number, intercept: number}}
 */
export function weightedLinearRegression(points, smoothingFactor = SMOOTHING_FACTOR) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 }

  // Calculate weights: more recent = higher weight
  // Weight for index i (0 = oldest): smoothingFactor^(n-1-i)
  const weights = points.map((_, i) => Math.pow(smoothingFactor, n - 1 - i))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  // Weighted means
  const meanX = points.reduce((s, p, i) => s + p.x * weights[i], 0) / totalWeight
  const meanY = points.reduce((s, p, i) => s + p.y * weights[i], 0) / totalWeight

  // Weighted slope calculation
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    const w = weights[i]
    numerator += w * (points[i].x - meanX) * (points[i].y - meanY)
    denominator += w * (points[i].x - meanX) * (points[i].x - meanX)
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = meanY - slope * meanX

  return { slope, intercept }
}

/**
 * Berekent gemiddelde trainingsfrequentie over de laatste 4 weken
 * @param {Array<{fullDate: string}>} sessions - Sessies met dates
 * @returns {number} - Sessies per week
 */
export function calculateTrainingFrequency(sessions) {
  if (sessions.length < 2) return 2 // default 2x per week

  const dates = sessions
    .map(s => new Date(s.fullDate || s.date))
    .sort((a, b) => a - b)

  const now = new Date()
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)

  const recentSessions = dates.filter(d => d >= fourWeeksAgo)
  
  if (recentSessions.length < 2) {
    // Fall back to overall frequency
    const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)
    const weeks = Math.max(1, totalDays / 7)
    return sessions.length / weeks
  }

  return recentSessions.length / 4 // sessions per week over 4 weeks
}

/**
 * Hoofdfunctie: berekent forecast voor een oefening
 * @param {Array<{date: string, bestE1rm: number, fullDate?: string}>} sessions
 * @returns {{status: string, forecastDate?: string, currentPR?: number, targetPR?: number, chartData?: Array, stale?: boolean}}
 */
export function calculateForecast(sessions) {
  // Check minimum sessions
  if (!sessions || sessions.length < MIN_SESSIONS) {
    return { status: 'insufficient' }
  }

  // Check recency of last session - ignore stale data
  const lastSession = sessions[sessions.length - 1]
  const lastDate = new Date(lastSession.fullDate || lastSession.date)
  const now = new Date()
  const daysSinceLastSession = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
  
  // If > 21 days since last session, forecast is unreliable
  if (daysSinceLastSession > 21) {
    return { status: 'plateau' }
  }
  
  // Track if data is getting stale (14-21 days)
  const isStale = daysSinceLastSession > 14

  // Extract e1rm values with indices
  const points = sessions.map((s, i) => ({
    x: i,
    y: s.bestE1rm || s.e1rm || 0
  }))

  // Calculate weighted linear regression
  const { slope, intercept } = weightedLinearRegression(points)

  // Current PR (highest e1RM ever)
  const currentPR = Math.max(...points.map(p => p.y))
  const targetPR = currentPR + PR_INCREMENT

  // Check if trend is positive enough
  // Slope should be positive and meaningful (at least 0.1kg per session on average)
  const MIN_SLOPE = 0.1
  if (slope <= MIN_SLOPE) {
    return { status: 'plateau' }
  }

  // Calculate sessions needed to reach target
  // Current predicted value at last point
  const lastX = points.length - 1
  const currentPredicted = slope * lastX + intercept
  
  // Sessions until target PR
  const sessionsNeeded = Math.ceil((targetPR - currentPredicted) / slope)
  
  if (sessionsNeeded <= 0) {
    // Already at or above target (shouldn't happen often)
    return { status: 'plateau' }
  }

  // Calculate training frequency and convert to date
  const frequency = calculateTrainingFrequency(sessions)
  const weeksNeeded = sessionsNeeded / Math.max(0.5, frequency)
  const daysNeeded = Math.round(weeksNeeded * 7)

  const forecastDate = new Date()
  forecastDate.setDate(forecastDate.getDate() + daysNeeded)

  // Format date string
  let forecastDateStr
  if (daysNeeded <= 7) {
    forecastDateStr = 'over ' + daysNeeded + ' dagen'
  } else if (daysNeeded <= 14) {
    forecastDateStr = 'over ' + Math.round(daysNeeded / 7) + ' week'
  } else {
    const weeks = Math.round(daysNeeded / 7)
    forecastDateStr = 'over ' + weeks + ' weken'
  }

  // Build chart data for visualization
  const chartData = []
  
  // Historical data points
  for (let i = 0; i < points.length; i++) {
    chartData.push({
      x: i,
      e1rm: points[i].y,
      forecast: null
    })
  }

  // Forecast data points (dashed line)
  const forecastPoints = Math.min(sessionsNeeded + 1, 10) // Max 10 forecast points
  for (let i = 0; i <= forecastPoints; i++) {
    const x = points.length - 1 + i
    const predicted = slope * x + intercept
    
    if (i === 0) {
      // Connect to last historical point
      chartData[chartData.length - 1].forecast = points[points.length - 1].y
    } else {
      chartData.push({
        x,
        e1rm: null,
        forecast: Math.min(predicted, targetPR + 1) // Cap at target
      })
    }
  }

  return {
    status: 'positive',
    forecastDate: forecastDateStr,
    currentPR,
    targetPR,
    sessionsNeeded,
    weeksNeeded,
    slope,
    chartData,
    stale: isStale
  }
}
