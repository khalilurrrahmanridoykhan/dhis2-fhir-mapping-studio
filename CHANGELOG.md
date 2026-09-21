# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-11

First release.

### Added

- Connect to a FHIR server through a DHIS2 Route: pick an existing Route or
  create one (no authentication, basic, bearer token, or API token). The
  choice is remembered.
- Browse the instance's event programmes and pick one to map onto.
- Map the programme's data elements to the 22 fields of the WHO SMART
  Guidelines Immunization IG. Required fields not yet mapped are listed.
  Mappings are saved per programme.
- Preview a mapping against a real resource fetched through the Route, with a
  warning when a compulsory data element would have no value.
- Map observed FHIR codes, or text labels, to the options of an option-set
  data element.
- Write the previewed resource as one Tracker event, showing the new event's
  id or DHIS2's own rejection message.

## [0.1.0] - 2026-09-08

Initial project scaffold.
