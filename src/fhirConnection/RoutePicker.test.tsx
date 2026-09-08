import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { RoutePicker } from './RoutePicker'
import type { CurrentUserAuthorities } from './useCurrentUserAuthorities'
import type { UseFhirRouteResult } from './useFhirRoute'

function makeFhirRoute(overrides: Partial<UseFhirRouteResult> = {}): UseFhirRouteResult {
  return {
    loading: false,
    error: null,
    wildcardRoutes: [],
    refresh: jest.fn(),
    createRoute: jest.fn(),
    ...overrides,
  }
}

function makeAuthorities(overrides: Partial<CurrentUserAuthorities> = {}): CurrentUserAuthorities {
  return { loading: false, error: null, username: 'admin', canCreateRoutes: true, ...overrides }
}

describe('RoutePicker', () => {
  it('shows a loader while routes are loading', () => {
    render(
      <RoutePicker
        fhirRoute={makeFhirRoute({ loading: true })}
        authorities={makeAuthorities()}
        selectedRouteId={null}
        onSelect={jest.fn()}
      />
    )
    expect(screen.queryByText('Select a route to a FHIR server')).not.toBeInTheDocument()
  })

  it('lists existing wildcard routes and calls onSelect with the picked id', async () => {
    const onSelect = jest.fn()
    render(
      <RoutePicker
        fhirRoute={makeFhirRoute({
          wildcardRoutes: [{ id: 'r1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' }],
        })}
        authorities={makeAuthorities()}
        selectedRouteId={null}
        onSelect={onSelect}
      />
    )

    fireEvent.click(await screen.findByText('Select a route to a FHIR server'))
    fireEvent.click(await screen.findByText('Clinic FHIR server'))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('r1'))
  })

  it('shows a NoticeBox instead of a picker when there are no routes yet', () => {
    render(
      <RoutePicker fhirRoute={makeFhirRoute()} authorities={makeAuthorities()} selectedRouteId={null} onSelect={jest.fn()} />
    )
    expect(screen.getByText('No routes to a FHIR server found yet')).toBeInTheDocument()
  })

  it('offers "Create a route here" only to a user with a real route-create authority', () => {
    const { rerender } = render(
      <RoutePicker
        fhirRoute={makeFhirRoute()}
        authorities={makeAuthorities({ canCreateRoutes: false })}
        selectedRouteId={null}
        onSelect={jest.fn()}
      />
    )
    expect(screen.queryByText('Create a route here')).not.toBeInTheDocument()
    expect(screen.getByText('You may not have permission to create a route')).toBeInTheDocument()

    rerender(
      <RoutePicker
        fhirRoute={makeFhirRoute()}
        authorities={makeAuthorities({ canCreateRoutes: true })}
        selectedRouteId={null}
        onSelect={jest.fn()}
      />
    )
    expect(screen.getByText('Create a route here')).toBeInTheDocument()
  })

  it('creating a route calls createRoute with a "/**"-free base URL passed through, then selects the new id', async () => {
    const createRoute = jest.fn().mockResolvedValue('newRouteId')
    const onSelect = jest.fn()
    render(
      <RoutePicker
        fhirRoute={makeFhirRoute({ createRoute })}
        authorities={makeAuthorities()}
        selectedRouteId={null}
        onSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByText('Create a route here'))

    // @dhis2/ui's InputField doesn't wire a "for"/"id" association between
    // its visible label and the underlying <input> (confirmed by reading
    // the actual rendered DOM -- getByLabelText fails with "no form
    // control was found associated to that label"), so these are found by
    // their real placeholder text instead, same fix as ProgramPicker.test.tsx
    // needed for SingleSelect's placeholder.
    fireEvent.change(screen.getByPlaceholderText('e.g. Clinic FHIR server'), { target: { value: 'Clinic FHIR server' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. https://hapi.fhir.org/baseR4'), {
      target: { value: 'https://hapi.fhir.org/baseR4' },
    })

    fireEvent.click(screen.getByText('Create route'))

    await waitFor(() => expect(createRoute).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: 'https://hapi.fhir.org/baseR4' })))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('newRouteId'))
  })

  it('rejects submitting the create form with no name or base URL', async () => {
    const createRoute = jest.fn()
    render(
      <RoutePicker
        fhirRoute={makeFhirRoute({ createRoute })}
        authorities={makeAuthorities()}
        selectedRouteId={null}
        onSelect={jest.fn()}
      />
    )

    fireEvent.click(screen.getByText('Create a route here'))
    fireEvent.click(screen.getByText('Create route'))

    expect(await screen.findByText('Name and FHIR base URL are required.')).toBeInTheDocument()
    expect(createRoute).not.toHaveBeenCalled()
  })
})
