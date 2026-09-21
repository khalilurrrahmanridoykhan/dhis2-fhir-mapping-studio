# FHIR Mapping Studio

[![CI](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Map FHIR Immunization data onto your own DHIS2 programme, preview exactly what will be written, and write it to Tracker.

The FHIR side is fixed: the fields of the [WHO SMART Guidelines Immunization Implementation Guide](https://worldhealthorganization.github.io/smart-immunizations/). The DHIS2 side is yours: you decide which of your programme's data elements corresponds to which IG field. The app fetches a real resource from a FHIR server through a DHIS2 Route, shows what your mapping produces, and writes it as a Tracker event.

## Requirements

- DHIS2 2.40 or later.
- An **event programme** (a programme without registration) with the data elements you want to fill.
- A **FHIR server** with Immunization resources, reachable through a DHIS2 Route. You can pick an existing Route or create one in the app.
- Permissions:
  - To create a Route: the `ALL` authority, or `F_ROUTE_PUBLIC_ADD` / `F_ROUTE_PRIVATE_ADD`. Picking an existing Route needs no special authority.
  - To write an event: data-entry access to the programme at the org unit you choose.

## Install

Install from the DHIS2 App Hub, or build the app and upload it:

```bash
npm install
npm run build        # writes build/bundle/*.zip
```

Then in DHIS2 go to **Apps → App Management → Install app → Upload a ZIP file**.

## Use it

The app has five steps. Steps 3 to 5 appear as you go: once you have picked a programme, and once you have previewed a resource.

**1. Connect to a FHIR server.** Pick a Route to your FHIR server, or choose **Create a route here** and enter its base URL and authentication (none, basic, bearer token, or API token). Only Routes whose URL ends in `/**` are listed, because a FHIR server needs sub-paths and query strings. Your choice is remembered.

**2. Pick a programme.** Choose the event programme to write into.

**3. Map its data elements.** For each data element in the programme, choose the IG field it corresponds to, or leave it as *Not mapped*. The IG has 22 fields, 10 of them required by the guide; the app lists any required field you have not mapped. That is a guide, not a block: you can save and write with any mapping. Choose **Save mapping** to keep it. It is saved per programme and loads the next time you pick that programme.

**4. Preview.** Choose **Fetch a resource and preview the mapping**. The app fetches one Immunization resource and shows, for every data element, the value its mapped IG field holds on that resource.
  - **Coded fields.** If a data element has an option set and its mapped field holds a code (or just a text label), the preview shows that code and lets you choose which of the data element's options it stands for. Choose **Save mapping** again to keep these choices with the mapping. A code you have not mapped is left out of what gets written.
  - **Compulsory data elements.** If the programme stage requires a value that this mapping and resource would not provide, the preview names it, because DHIS2 will reject the write.

**5. Write.** Pick the org unit and choose **Write this event to DHIS2**. The app writes exactly the resource you previewed as one completed event, dated from the resource's `occurrenceDateTime`. It shows the new event's id, or DHIS2's own message if it is rejected.

## What gets written

- One event per write, with a value for each mapped data element that the resource has a value for. Unmapped data elements and fields the resource does not carry are left out.
- Coded fields mapped to an option-set data element are written as the option code you chose. Other values are written as text: a coded value as its display text, code, or label, a reference as its reference string.
- The resource must have an `occurrenceDateTime`; without one the app reports that it cannot build the event.

## Good to know

- **One resource at a time.** The app is for building and checking a mapping. It does not sync a whole result set.
- **No changes to your metadata.** It does not create or alter programmes, data elements, or org units. It reads them, and stores your saved mappings and chosen Route in the data store.

## External connections

The app talks only to your DHIS2 instance. It reaches the FHIR server **only through a DHIS2 Route**, so the request is made by DHIS2, not your browser. Credentials for the FHIR server are held by the Route on the server and are never returned to the app. The app makes no other external requests and loads no external scripts or styles.

## Data storage

Saved mappings and the chosen Route are stored in the data store under the namespace `fhirMappingStudio`: one key per programme, plus one key for the connection.

## Development

```bash
npm start            # dev server
npm test             # unit and component tests
npm run typecheck    # TypeScript
npm run build        # production bundle
```

Design notes and the record of what was checked against a live instance are in [docs/DEVELOPMENT_NOTES.md](docs/DEVELOPMENT_NOTES.md). See [SECURITY.md](SECURITY.md) for how the app handles credentials and dependencies.

## License

MIT. See [LICENSE](LICENSE).
