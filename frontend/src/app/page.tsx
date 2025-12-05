/**
 * === NEXT.JS - STRONA GŁÓWNA ===
 *
 * W Next.js 13+ (App Router):
 * - Każdy folder w src/app to route
 * - page.tsx to główny komponent strony
 * - layout.tsx to wrapper (navbar, footer)
 *
 * 'use client' - oznacza że komponent działa po stronie klienta
 * (potrzebne dla useState, useEffect, onClick itp.)
 */

'use client'

import { useState } from 'react'

export default function Home() {
  // Stan komponentu
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">
        Scenariusze Jutra
      </h1>
      <p className="text-gray-600 mb-8">
        AI do przewidywania scenariuszy geopolitycznych
      </p>

      {/* TODO: Implementacja UI */}
      <div className="p-4 bg-gray-100 rounded">
        <p>Region: {selectedRegion || 'nie wybrano'}</p>
        <p>Temat: {selectedTopic || 'nie wybrano'}</p>
      </div>
    </main>
  )
}
