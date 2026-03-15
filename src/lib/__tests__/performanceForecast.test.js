import { describe, it, expect } from 'vitest'
import {
  weightedLinearRegression,
  calculateTrainingFrequency,
  calculateForecast
} from '../performanceForecast'

describe('weightedLinearRegression', () => {
  it('calculates positive slope for increasing data', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 102 },
      { x: 2, y: 105 },
      { x: 3, y: 108 },
      { x: 4, y: 110 }
    ]
    
    const result = weightedLinearRegression(points)
    
    expect(result.slope).toBeGreaterThan(0)
    expect(result.slope).toBeCloseTo(2.5, 0) // roughly 2.5kg per session
  })

  it('calculates negative slope for decreasing data', () => {
    const points = [
      { x: 0, y: 110 },
      { x: 1, y: 108 },
      { x: 2, y: 105 },
      { x: 3, y: 102 },
      { x: 4, y: 100 }
    ]
    
    const result = weightedLinearRegression(points)
    
    expect(result.slope).toBeLessThan(0)
  })

  it('weights recent data more heavily', () => {
    // Data that was increasing but recently decreased
    const points = [
      { x: 0, y: 100 },
      { x: 1, y: 105 },
      { x: 2, y: 110 },
      { x: 3, y: 105 },  // drop
      { x: 4, y: 102 }   // another drop
    ]
    
    const weightedResult = weightedLinearRegression(points, 0.85)
    const unweightedResult = weightedLinearRegression(points, 1.0) // equal weights
    
    // Weighted should show more negative/less positive trend due to recent drops
    expect(weightedResult.slope).toBeLessThan(unweightedResult.slope)
  })

  it('handles single point', () => {
    const points = [{ x: 0, y: 100 }]
    
    const result = weightedLinearRegression(points)
    
    expect(result.slope).toBe(0)
    expect(result.intercept).toBe(100)
  })
})

describe('calculateTrainingFrequency', () => {
  it('calculates frequency from session dates', () => {
    const now = new Date()
    const sessions = []
    
    // 8 sessions over 4 weeks = 2 per week
    for (let i = 0; i < 8; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - (i * 3.5)) // roughly every 3.5 days
      sessions.push({ fullDate: d.toISOString() })
    }
    
    const frequency = calculateTrainingFrequency(sessions)
    
    expect(frequency).toBeGreaterThan(1.5)
    expect(frequency).toBeLessThan(3)
  })

  it('returns default for single session', () => {
    const sessions = [{ fullDate: new Date().toISOString() }]
    
    const frequency = calculateTrainingFrequency(sessions)
    
    expect(frequency).toBe(2) // default
  })
})

describe('calculateForecast', () => {
  it('returns insufficient status for less than 4 sessions', () => {
    const sessions = [
      { bestE1rm: 100 },
      { bestE1rm: 102 },
      { bestE1rm: 104 }
    ]
    
    const result = calculateForecast(sessions)
    
    expect(result.status).toBe('insufficient')
  })

  it('returns plateau status for flat/declining trend', () => {
    const sessions = [
      { bestE1rm: 100 },
      { bestE1rm: 100 },
      { bestE1rm: 99 },
      { bestE1rm: 100 },
      { bestE1rm: 99 }
    ]
    
    const result = calculateForecast(sessions)
    
    expect(result.status).toBe('plateau')
  })

  it('returns positive forecast for increasing trend', () => {
    const now = new Date()
    const sessions = []
    
    // Create sessions with increasing e1RM
    for (let i = 0; i < 8; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - ((7 - i) * 3)) // sessions spread over time
      sessions.push({
        bestE1rm: 100 + i * 2.5, // increasing by 2.5kg each session
        fullDate: d.toISOString()
      })
    }
    
    const result = calculateForecast(sessions)
    
    expect(result.status).toBe('positive')
    expect(result.currentPR).toBe(117.5) // last value
    expect(result.targetPR).toBe(120) // +2.5kg
    expect(result.forecastDate).toBeDefined()
    expect(result.chartData).toBeDefined()
    expect(result.chartData.length).toBeGreaterThan(sessions.length)
  })

  it('correctly identifies current PR from non-monotonic data', () => {
    const sessions = [
      { bestE1rm: 100 },
      { bestE1rm: 105 },
      { bestE1rm: 110 }, // PR
      { bestE1rm: 108 },
      { bestE1rm: 109 }
    ]
    
    const result = calculateForecast(sessions)
    
    // Should find 110 as current PR even though it's not the last value
    expect(result.currentPR).toBe(110)
    expect(result.targetPR).toBe(112.5)
  })

  it('calculates forecast date in weeks for longer timeframes', () => {
    const now = new Date()
    const sessions = []
    
    // Slow progress: only 0.5kg per session
    for (let i = 0; i < 6; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - ((5 - i) * 7)) // weekly sessions
      sessions.push({
        bestE1rm: 100 + i * 0.5,
        fullDate: d.toISOString()
      })
    }
    
    const result = calculateForecast(sessions)
    
    if (result.status === 'positive') {
      // With slow progress, forecast should be multiple weeks out
      expect(result.forecastDate).toMatch(/over \d+ weken?/)
    }
  })

  it('handles empty sessions array', () => {
    const result = calculateForecast([])
    
    expect(result.status).toBe('insufficient')
  })

  it('handles null sessions', () => {
    const result = calculateForecast(null)
    
    expect(result.status).toBe('insufficient')
  })

  it('includes chartData with both historical and forecast points', () => {
    const now = new Date()
    const sessions = []
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - ((5 - i) * 3))
      sessions.push({
        bestE1rm: 100 + i * 3,
        fullDate: d.toISOString()
      })
    }
    
    const result = calculateForecast(sessions)
    
    if (result.status === 'positive') {
      // Check historical points have e1rm values
      const historicalPoints = result.chartData.filter(p => p.e1rm !== null)
      expect(historicalPoints.length).toBe(sessions.length)
      
      // Check forecast points exist
      const forecastPoints = result.chartData.filter(p => p.forecast !== null)
      expect(forecastPoints.length).toBeGreaterThan(0)
    }
  })
})
