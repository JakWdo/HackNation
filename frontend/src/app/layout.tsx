/**
 * === NEXT.JS - LAYOUT ===
 *
 * Layout to komponent opakowujący wszystkie strony.
 * Używany do:
 * - Wspólnych elementów (navbar, footer)
 * - Globalnych stylów
 * - Metadata (tytuł, opis)
 */

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scenariusze Jutra | MSZ',
  description: 'AI do przewidywania scenariuszy geopolitycznych',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
