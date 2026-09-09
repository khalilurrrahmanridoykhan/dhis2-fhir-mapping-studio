# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- WHO SMART Guidelines Immunization IG field reference (22 fields, verified
  against the real published `StructureDefinition`), plus a hand-crafted
  IG-conformant sample Immunization resource for development.
- Browse an instance's own `WITHOUT_REGISTRATION` programs and pick one to
  map onto (`ProgramPicker`).
- Author a Mapping Profile: a table pairing each of the picked program's
  data elements with a WHO SG IG field (`MappingTable`), with a live count
  of required IG fields still unmapped.
- Persist one Mapping Profile per program to `dataStore`, loaded
  automatically the next time that program is picked.
- Connect to a FHIR server: list and select an existing DHIS2 Route, or
  create one (with basic auth, bearer token, or API token). Every call to
  the FHIR server runs through the Route -- never straight from the
  browser -- so credentials never touch the client. The chosen connection
  persists to `dataStore` and auto-loads on reopen.

- Preview a mapping against a real fetched resource (Step 4): fetch one
  Immunization resource through the connected Route and see, for every
  DHIS2 data element, exactly what value its mapped WHO SG IG field reads
  from that resource -- before anything is ever written to DHIS2.

- Write the previewed resource to DHIS2 Tracker (Step 5): pick a target
  organisation unit, then write exactly the resource Step 4 already
  fetched and showed -- never a second, independent fetch -- as one real
  Tracker event, via `/api/tracker`. Shows the created event's real id on
  success, or DHIS2's own rejection message on failure.

Known, deliberate limitations: one resource at a time (no multi-resource
batch sync yet), and the CodeableConcept-to-OPTION_SET code-mapping step
for coded fields is still unbuilt -- writing a coded field onto an
OPTION_SET data element may be rejected by DHIS2 until that exists, and
that rejection surfaces as a normal, visible error rather than silently.

## [0.1.0] - 2026-09-08

### Added

- DHIS2 App Platform TypeScript scaffold (`@dhis2/cli-app-scripts`).
- `/api/me` connectivity check as the scaffold-stage verification that the
  app can reach a connected DHIS2 instance.
- `minDHIS2Version: '2.40'` declared in `d2.config.js`.
- MIT `LICENSE`.
- CI workflow: install, test, build on every push and pull request.

No mapping features yet. Full design and rationale live in
[`Generic FHIR-to-DHIS2 Mapping Tool — Design.md`](../plan/Generic%20FHIR-to-DHIS2%20Mapping%20Tool%20%E2%80%94%20Design.md).
