import { fetchImmunizationPreview, runFhirRoute } from './fhirRouteFetch'

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number; statusText?: string; contentType?: string } = {}) {
  const { ok = true, status = 200, statusText = 'OK', contentType = 'application/fhir+json' } = init
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }) as unknown as typeof fetch
}

describe('runFhirRoute', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('requests /api/routes/{id}/run/{subPath} with query params, same-origin, with credentials', async () => {
    mockFetchOnce({ resourceType: 'Bundle', entry: [] })

    await runFhirRoute('route1', 'Immunization', { _count: '5' })

    expect(global.fetch).toHaveBeenCalledWith(
      `${window.location.origin}/api/routes/route1/run/Immunization?_count=5`,
      expect.objectContaining({ credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    )
  })

  it('omits the trailing subPath segment when subPath is empty', async () => {
    mockFetchOnce({ resourceType: 'Bundle', entry: [] })

    await runFhirRoute('route1', '', {})

    expect(global.fetch).toHaveBeenCalledWith(`${window.location.origin}/api/routes/route1/run`, expect.anything())
  })

  // The real bug this ports the fix for: a FHIR server's real
  // Content-Type is `application/fhir+json`, not `application/json` --
  // @dhis2/data-engine's own fetch path only parses the body when it's
  // exactly the latter. This function must parse JSON regardless.
  it('parses the response body as JSON regardless of the declared content type', async () => {
    mockFetchOnce({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Immunization', id: 'i1' } }] }, {
      contentType: 'application/fhir+json',
    })

    const bundle = await runFhirRoute('route1', 'Immunization', {})

    expect(bundle.entry).toHaveLength(1)
    expect(bundle.entry?.[0].resource?.id).toBe('i1')
  })

  it('throws a clear error on a non-ok response instead of returning an empty bundle', async () => {
    mockFetchOnce({}, { ok: false, status: 502, statusText: 'Bad Gateway' })

    await expect(runFhirRoute('route1', 'Immunization', {})).rejects.toThrow('FHIR route request failed: 502 Bad Gateway')
  })
})

describe('fetchImmunizationPreview', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('requests the given count and returns the resources, unwrapped from their bundle entries', async () => {
    mockFetchOnce({
      resourceType: 'Bundle',
      entry: [
        { resource: { resourceType: 'Immunization', id: 'i1', status: 'completed' } },
        { resource: { resourceType: 'Immunization', id: 'i2', status: 'completed' } },
      ],
    })

    const resources = await fetchImmunizationPreview('route1', 3)

    expect(global.fetch).toHaveBeenCalledWith(
      `${window.location.origin}/api/routes/route1/run/Immunization?_count=3`,
      expect.anything()
    )
    expect(resources).toEqual([
      { resourceType: 'Immunization', id: 'i1', status: 'completed' },
      { resourceType: 'Immunization', id: 'i2', status: 'completed' },
    ])
  })

  it('returns an empty array, not a throw, when the bundle has no entries', async () => {
    mockFetchOnce({ resourceType: 'Bundle', entry: [] })
    const resources = await fetchImmunizationPreview('route1', 3)
    expect(resources).toEqual([])
  })

  it('filters out bundle entries with no resource (e.g. a deleted-entry tombstone)', async () => {
    mockFetchOnce({
      resourceType: 'Bundle',
      entry: [{ fullUrl: 'Immunization/gone' }, { resource: { resourceType: 'Immunization', id: 'i1' } }],
    })
    const resources = await fetchImmunizationPreview('route1', 3)
    expect(resources).toEqual([{ resourceType: 'Immunization', id: 'i1' }])
  })
})
