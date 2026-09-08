# FHIR Mapping Studio

[![CI](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DHIS2 2.40+](https://img.shields.io/badge/DHIS2-2.40%2B-2C6693.svg)](d2.config.js)
[![Status: scaffold](https://img.shields.io/badge/status-scaffold-orange.svg)](CHANGELOG.md)

A native DHIS2 App for authoring a **DHIS2-side mapping** from a FHIR resource -- anchored on Immunization against the [WHO SMART Guidelines Immunization Implementation Guide](https://worldhealthorganization.github.io/smart-immunizations/) -- onto an instance's own **existing** programme, data elements, and org units.

## Status: scaffold only

This repo currently contains the bare DHIS2 App Platform scaffold and a connectivity check (`src/App.tsx` queries `/api/me` to confirm the app can reach the connected instance). No mapping features exist yet. Nothing here should be read as more built than it is.

## Why this exists

Grew out of a real review conversation on [FHIR Sync Console](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-sync-console) with DHIS2's own Extensibility Team: that app was declined for the DHIS2 App Hub not for quality but because it's tied to one fixed use case and depends on a separate backend service the Hub can't host. The reviewer's own framing of the real, harder problem: DHIS2 metadata is "a schema-building kit, not a schema" -- the same Tracked Entity type can mean a person, a student, a water point, or an animal depending on how a given instance configured it, so no fully-automatic FHIR-to-DHIS2 mapping can ever be generic. A human has to decide the semantics per deployment, every time.

The full design reasoning -- including two rounds of direct feedback from that reviewer, live verification of the WHO SG Immunization IG's actual profile requirements against a real OpenMRS FHIR2 instance, and the architectural constraint that keeps this App-Hub-eligible -- lives in [`AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool — Design.md`](../plan/Generic%20FHIR-to-DHIS2%20Mapping%20Tool%20%E2%80%94%20Design.md), not duplicated here.

## The one architectural rule that matters most

Everything -- mapping authoring, metadata browsing, preview, and sync execution -- runs inside this DHIS2 app itself, talking to any FHIR server only through a DHIS2 Route, with zero separate backend service. This is what FHIR Sync Console got right for its own FHIR fetch; the constraint here is that it has to hold for the *entire* pipeline, not most of it, or this app inherits FHIR Sync Console's exact App Hub outcome regardless of how good the mapping UI is.

## Running it

```bash
npm install
npm start
# http://localhost:3000
```

```bash
npm test    # runs available tests in src/
npm run build
npm run deploy
```

## License

MIT
