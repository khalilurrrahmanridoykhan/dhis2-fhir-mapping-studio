# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet -- mapping-authoring work starts after the scaffold below.

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
