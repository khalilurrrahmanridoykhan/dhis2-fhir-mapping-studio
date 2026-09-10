# FHIR Mapping Studio

[![CI](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DHIS2 2.40+](https://img.shields.io/badge/DHIS2-2.40%2B-2C6693.svg)](d2.config.js)

A native DHIS2 App for authoring a **DHIS2-side mapping** from a FHIR resource --
anchored on Immunization against the [WHO SMART Guidelines Immunization
Implementation Guide](https://worldhealthorganization.github.io/smart-immunizations/)
-- onto an instance's own **existing** programme, data elements, and org units, then
fetching a real resource through a DHIS2 Route, previewing exactly what the mapping
produces, and writing it into Tracker.

No separate backend service. Everything runs inside the app.

## What it does

A five-step flow, each step gated on the one before it:

1. **Connect** -- pick an existing DHIS2 Route to a FHIR server, or create one
   (none / basic auth / bearer token / API token). Every call to the FHIR server
   goes through the Route, so credentials never touch the browser. The choice is
   saved to the instance's dataStore and reloads automatically.
2. **Pick a programme** -- browse the instance's own `WITHOUT_REGISTRATION`
   programmes. The app never creates DHIS2 metadata, only reads what an admin
   already configured.
3. **Map fields** -- pair each of the programme's data elements with one of the
   22 fields of the WHO SG Immunization IG profile (verified against the real
   published `StructureDefinition`). A live count shows which required IG fields
   are still unmapped. Saved per-programme to the dataStore.
4. **Preview** -- fetch one real Immunization resource through the connected Route
   and see, per data element, exactly what value its mapped field reads from that
   resource. For a coded field (a FHIR `CodeableConcept`) mapped onto an
   option-set data element, map each observed code (or text label) to one of the
   data element's own options, inline. The preview also warns, by name, when a
   **compulsory** data element would have no value -- before the write fails.
5. **Write** -- pick a target org unit and write *exactly* the previewed resource
   as one Tracker event. Coded fields are written as the real option code, never
   raw display text. The created event id, or DHIS2's own rejection message, is
   shown.

### What it deliberately does not do (yet)

- **Multi-resource batch sync.** One resource at a time -- enough to author and
  prove a mapping. A full sync loop is roadmap.
- **Automatic mapping inference.** The DHIS2 side is per-deployment and a human
  decides its semantics; the app is a mapping *editor*, not a guesser.

## Why it exists

Grew out of a real review of [FHIR Sync
Console](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-sync-console) with
DHIS2's Extensibility Team: that app was declined for the App Hub not for quality
but because it depended on a separate backend service the Hub can't host. The
reviewer's framing of the harder problem: DHIS2 metadata is "a schema-building
kit, not a schema" -- the same construct can mean a person, a student, a water
point, or an animal depending on how an instance configured it, so no
fully-automatic FHIR-to-DHIS2 mapping can be generic. A human has to decide the
semantics per deployment.

Full design reasoning -- including two rounds of direct reviewer feedback and the
live verification of the WHO SG Immunization IG against a real OpenMRS FHIR2
instance -- is in [`AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool —
Design.md`](../plan/Generic%20FHIR-to-DHIS2%20Mapping%20Tool%20%E2%80%94%20Design.md).

## The architectural rule that matters most

Everything -- mapping authoring, metadata browsing, preview, and write -- runs
inside this DHIS2 app, reaching any FHIR server only through a DHIS2 Route, with
zero separate backend. That constraint has to hold for the *whole* pipeline, or
the app inherits FHIR Sync Console's exact App Hub outcome regardless of how good
the UI is.

## Verification

Every DHIS2 and FHIR API contract the app depends on has been exercised against a
real DHIS2 2.42.5 instance with a real Route to a real FHIR server -- not just
mocks. See [`CHANGELOG.md`](CHANGELOG.md) for the specifics (route creation and
sharing, fetch-through-route including the `application/fhir+json` content type,
the full fetch-map-write path, and all three code-mapping behaviours). On top of
that, 198 component and unit tests run in CI on every push.

## Running it

```bash
npm install
npm start          # dev server; enter your DHIS2 URL + login when prompted
```

```bash
npm test           # unit + component tests
npm run build      # production bundle + .zip for App Hub
npm run deploy     # deploy to a configured instance
```

## License

MIT
