import { Button, CircularLoader, InputField, NoticeBox, Radio, SingleSelect, SingleSelectOption } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC, useState } from 'react'
import type { CurrentUserAuthorities } from './useCurrentUserAuthorities'
import type { UseFhirRouteResult } from './useFhirRoute'
import type { CreateRouteInput, FhirAuthType } from './types'
import classes from './RoutePicker.module.css'

interface RoutePickerProps {
  fhirRoute: UseFhirRouteResult
  authorities: CurrentUserAuthorities
  selectedRouteId: string | null
  onSelect: (id: string) => void
}

/**
 * Lets an admin pick an existing DHIS2 Route to a FHIR server, or create
 * one -- the "Connect" step from the design doc, and the actual gap
 * between this app and a real preview/sync pipeline. Every outbound call
 * to the FHIR server runs through the chosen Route, never straight from
 * the browser (see useFhirRoute.ts).
 */
export const RoutePicker: FC<RoutePickerProps> = ({ fhirRoute, authorities, selectedRouteId, onSelect }) => {
  const [showCreateForm, setShowCreateForm] = useState(false)

  if (fhirRoute.loading) {
    return <CircularLoader small />
  }

  if (fhirRoute.error) {
    return (
      <NoticeBox error title={i18n.t('Could not load routes')}>
        {fhirRoute.error}
      </NoticeBox>
    )
  }

  return (
    <div className={classes.stack}>
      {fhirRoute.wildcardRoutes.length > 0 ? (
        <SingleSelect
          selected={selectedRouteId ?? undefined}
          placeholder={i18n.t('Select a route to a FHIR server')}
          onChange={({ selected }) => onSelect(selected)}
        >
          {fhirRoute.wildcardRoutes.map((route) => (
            <SingleSelectOption key={route.id} value={route.id} label={route.name} />
          ))}
        </SingleSelect>
      ) : (
        <NoticeBox title={i18n.t('No routes to a FHIR server found yet')}>
          {i18n.t('Set one up in the Route Manager app, or create one here.')}
        </NoticeBox>
      )}

      <div className={classes.buttonRow}>
        <Button
          small
          onClick={() => window.open('../route-manager/index.html', '_blank', 'noopener,noreferrer')}
        >
          {i18n.t('Open Route Manager')}
        </Button>
        {authorities.canCreateRoutes && (
          <Button small onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? i18n.t('Cancel') : i18n.t('Create a route here')}
          </Button>
        )}
      </div>

      {!authorities.canCreateRoutes && fhirRoute.wildcardRoutes.length === 0 && (
        <NoticeBox warning title={i18n.t('You may not have permission to create a route')}>
          {i18n.t(
            'Creating a route needs the Route-create authority (or a superuser role). Ask your DHIS2 administrator, or use Route Manager if you already have access there.'
          )}
        </NoticeBox>
      )}

      {showCreateForm && authorities.canCreateRoutes && (
        <CreateRouteForm
          fhirRoute={fhirRoute}
          onCreated={(id) => {
            onSelect(id)
            setShowCreateForm(false)
          }}
        />
      )}
    </div>
  )
}

interface CreateRouteFormProps {
  fhirRoute: UseFhirRouteResult
  onCreated: (id: string) => void
}

const CreateRouteForm: FC<CreateRouteFormProps> = ({ fhirRoute, onCreated }) => {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [authType, setAuthType] = useState<FhirAuthType>('none')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [timeoutSeconds, setTimeoutSeconds] = useState('30')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || !baseUrl.trim()) {
      setError(i18n.t('Name and FHIR base URL are required.'))
      return
    }
    setError(null)
    setCreating(true)
    try {
      const input: CreateRouteInput = {
        name: name.trim(),
        code: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        baseUrl: baseUrl.trim(),
        authType,
        responseTimeoutSeconds: Number(timeoutSeconds) || 30,
        authConfig:
          authType === 'http-basic'
            ? { username, password }
            : authType === 'api-token' || authType === 'api-headers'
              ? { token }
              : undefined,
      }
      const id = await fhirRoute.createRoute(input)
      onCreated(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={classes.createForm}>
      {error && (
        <NoticeBox error title={i18n.t('Could not create route')}>
          {error}
        </NoticeBox>
      )}
      <InputField
        label={i18n.t('Route name')}
        value={name}
        onChange={({ value }) => setName(value ?? '')}
        placeholder={i18n.t('e.g. Clinic FHIR server')}
      />
      <InputField
        label={i18n.t('FHIR base URL')}
        value={baseUrl}
        onChange={({ value }) => setBaseUrl(value ?? '')}
        placeholder={`${i18n.t('e.g.')} https://hapi.fhir.org/baseR4`}
        helpText={i18n.t(
          'A "/**" wildcard suffix is added automatically -- required to proxy a paginated FHIR API through this route.'
        )}
      />
      <InputField
        label={i18n.t('Response timeout (seconds)')}
        type="number"
        value={timeoutSeconds}
        onChange={({ value }) => setTimeoutSeconds(value ?? '30')}
      />

      <div>
        <div>{i18n.t('Authentication')}</div>
        <div className={classes.authOptions}>
          <Radio label={i18n.t('None (public server)')} checked={authType === 'none'} onChange={() => setAuthType('none')} />
          <Radio
            label={i18n.t('Basic auth (username/password)')}
            checked={authType === 'http-basic'}
            onChange={() => setAuthType('http-basic')}
          />
          <Radio
            label={i18n.t('Bearer token (incl. SMART on FHIR static token)')}
            checked={authType === 'api-headers'}
            onChange={() => setAuthType('api-headers')}
          />
          <Radio label={i18n.t('API token')} checked={authType === 'api-token'} onChange={() => setAuthType('api-token')} />
        </div>
      </div>

      {authType === 'http-basic' && (
        <>
          <InputField label={i18n.t('Username')} value={username} onChange={({ value }) => setUsername(value ?? '')} />
          <InputField
            label={i18n.t('Password')}
            type="password"
            value={password}
            onChange={({ value }) => setPassword(value ?? '')}
          />
        </>
      )}
      {(authType === 'api-token' || authType === 'api-headers') && (
        <InputField
          label={authType === 'api-headers' ? i18n.t('Bearer token') : i18n.t('API token')}
          type="password"
          value={token}
          onChange={({ value }) => setToken(value ?? '')}
          helpText={
            authType === 'api-headers'
              ? i18n.t('Sent as an Authorization header, "Bearer <token>". Not auto-refreshed -- rotate manually if it expires.')
              : undefined
          }
        />
      )}

      <Button primary small onClick={handleCreate} loading={creating}>
        {i18n.t('Create route')}
      </Button>
    </div>
  )
}
