/**
 * === API CLIENT ===
 *
 * Centralny klient do komunikacji z backendem.
 * Używamy axios dla prostoty, ale można też użyć fetch.
 */

import axios from 'axios'

// Bazowy URL backendu
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Instancja axios z domyślną konfiguracją
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// === TYPY ===
// Powinny odpowiadać modelom Pydantic z backendu

export interface ScenarioRequest {
  region: string
  topic: string
  timeframe?: string
  context?: string
}

export interface ScenarioItem {
  name: string
  probability: number
  description: string
  key_factors: string[]
}

export interface ScenarioResponse {
  scenario_id: string
  region: string
  topic: string
  scenarios: ScenarioItem[]
  confidence: number
  sources: string[]
  generated_at: string
}

// === FUNKCJE API ===

export async function generateScenario(
  request: ScenarioRequest
): Promise<ScenarioResponse> {
  const response = await api.post('/api/scenarios/generate', request)
  return response.data
}

export async function getRegions() {
  const response = await api.get('/api/scenarios/regions')
  return response.data
}

export async function getTopics() {
  const response = await api.get('/api/scenarios/topics')
  return response.data
}

export async function healthCheck() {
  const response = await api.get('/health')
  return response.data
}
