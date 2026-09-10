import { CustomDataProvider } from '@dhis2/app-runtime'
import type { CustomData } from '@dhis2/data-engine'
import React from 'react'

/**
 * Mock data for CustomDataProvider -- one entry per DHIS2 resource
 * string, each value either a static JSON-ish response or a
 * `(type, query) => result` resolver. Typed loosely (test fixtures are
 * inherently loose) with the single cast to CustomData contained here, so
 * every test file doesn't repeat a `Record<string, unknown>` that
 * TypeScript then refuses to hand to CustomDataProvider.
 */
export type MockData = Record<string, unknown>

export function customDataWrapper(data: MockData) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <CustomDataProvider data={data as CustomData}>{children}</CustomDataProvider>
  )
  return Wrapper
}
