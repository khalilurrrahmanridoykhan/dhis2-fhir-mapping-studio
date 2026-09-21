# Development notes

Design decisions and the record of what was checked against a live DHIS2
instance. This is background for maintainers and reviewers. For what the app
does and how to use it, see the [README](../README.md).

## Design

**Everything runs inside the app, through a DHIS2 Route.** Mapping, browsing,
preview and write are all done by the app itself. The FHIR server is reached
only through `/api/routes/{id}/run/...`, so DHIS2 makes the outbound call and
holds the credentials. There is no separate backend service.

**Fixed FHIR side, human-chosen DHIS2 side.** The FHIR fields come from the
WHO SMART Guidelines Immunization IG profile (`IMMZ.Immunization`), bundled at
build time in `src/fhir/immunizationIgFields.ts` and checked against the
published StructureDefinition by a test. What each of a programme's data
elements *means* is instance-specific, so the mapping is authored by a person,
never inferred.

**A mapping profile is saved per programme**, in the data store under
`fhirMappingStudio`, and holds the field mappings plus any code translations.

### Fetching through a Route

The FHIR response is read with a direct `fetch()` and `response.json()`, not
`@dhis2/app-runtime`'s `engine.query()`. A FHIR server answers with
`Content-Type: application/fhir+json`, and the data engine only parses a body
as JSON when the type is exactly `application/json`; anything else comes back
as an unparsed `Blob`.

Only Routes whose URL ends in `/**` are usable, because a paginated FHIR API
needs sub-paths and query strings. A newly created Route is private to its
creator by default, so the app grants public read access on it after creating
it (`r-------`). A Route's `auth` block is write-only: DHIS2 never returns it
from a `GET`.

### Writing

The event is posted to `tracker?async=false`, so the response carries the real
result. `occurredAt` is the resource's own `occurrenceDateTime` (DHIS2 accepts
the FHIR date-time format as is). The app returns an error rather than
defaulting to "now" when a resource has no `occurrenceDateTime`.

### Coded fields

A data element is treated as coded when it has an **option set**, not when its
`valueType` says `OPTION_SET`: an option-set element reports `valueType: TEXT`
with a non-null `optionSet`.

For such a field the value written is the option code the user chose for the
observed code, or the observed text when the FHIR value is a text-only
`CodeableConcept` (`{"text": "..."}`, which real servers send). With no
translation the value is omitted. Sending the raw text instead is rejected by
DHIS2 as not a valid option code, so omitting is the more honest behaviour.

### Compulsory data elements

A programme stage can mark data elements compulsory, and DHIS2 rejects an
event without them (`E1303`). The preview computes, per row, whether a value
will actually be written and warns about compulsory rows that will not get one.

### Translations

Translatable strings must not contain a colon. The extractor in
`d2-app-scripts` does not disable the namespace separator, so `Step 1: ...`
is split into a bogus namespace and key. Strings use ` -- ` instead.

## Checked against a live instance

Every request the app depends on was run against a DHIS2 2.42.5 instance with a
Route to a public FHIR server, using the app's own payloads:

- Route creation and sharing both succeed, and the Route's `auth` block is not
  returned by a `GET`.
- Fetching `Immunization` through the Route returns a FHIR `Bundle`
  (`application/fhir+json`).
- A fetched resource, mapped and written, produces a Tracker event whose stored
  data values match the mapping.
- Against a programme with an option-set data element: with no translation the
  value is omitted and the event still writes; sending the raw text is rejected
  as not a valid option code; the translated option code is accepted and stored.
- A programme with compulsory data elements rejects an event that does not
  fill them.

The full flow (connect, map, preview, write) was also run in a browser against
that instance.

## Limitations

- One resource at a time; there is no multi-resource sync.
- The mapping is by field, with code translation for option-set fields. There is
  no expression language.
- Only the Immunization resource and the WHO SMART Guidelines IG profile are
  covered.
