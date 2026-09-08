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

Not yet built: actually fetching a FHIR resource through the connected
route, applying a saved Mapping Profile to it, previewing the result, and
writing it into DHIS2 Tracker.

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
