/**
 * The fixed FHIR-side field list for the WHO SMART Guidelines Immunization
 * Implementation Guide's IMMZ.Immunization profile -- the "fixed" half of
 * the mapping, per Johan's own framing: once a source is IG-conformant,
 * this side no longer varies per deployment. Only the DHIS2 side does.
 *
 * Source of truth: fetched and parsed directly from the IG's own
 * machine-readable StructureDefinition --
 * https://worldhealthorganization.github.io/smart-immunizations/StructureDefinition-IMMZ.Immunization.json
 * (canonical URL: http://smart.who.int/immunizations/StructureDefinition/IMMZ.Immunization,
 * built on base FHIR R4 Immunization, IG version 0.2.0) -- not transcribed
 * from a rendered/summarized page. Every path, cardinality, and slice name
 * below was read from that JSON's `differential.element` array directly.
 *
 * Fields inherited unchanged from base FHIR R4 Immunization (status,
 * vaccineCode, patient, occurrenceDateTime, statusReason) are marked
 * origin: 'base' -- this profile's differential doesn't restate their
 * cardinality, so the values here reflect the base FHIR R4 spec, not an
 * IG-specific constraint. Everything marked 'ig-extension' is a real
 * extension slice this profile's differential defines, each with its own
 * canonical StructureDefinition URL.
 *
 * Deliberately NOT included: any base Immunization field this profile's
 * differential doesn't mention (e.g. isSubpotent) -- an earlier
 * AI-summarized read of the rendered profile page claimed isSubpotent was
 * part of this profile; the raw differential doesn't contain it at all.
 * Caught by checking the actual JSON instead of trusting that summary --
 * left out here rather than carried forward as an error.
 */

export type ImmunizationIgFieldOrigin = 'base' | 'ig-extension'

export interface ImmunizationIgField {
  /** Dot-path within the FHIR Immunization resource. */
  path: string
  origin: ImmunizationIgFieldOrigin
  /** Set only for origin === 'ig-extension' -- the slice name in the profile's differential. */
  sliceName?: string
  /** Set only for origin === 'ig-extension' -- the extension's own canonical StructureDefinition URL. */
  extensionUrl?: string
  /** e.g. '1..1', '0..1', '1..*'. */
  cardinality: string
  required: boolean
  /** Short, human-readable label for the mapping-table UI. */
  label: string
  /** One or two sentences of real context, not a restatement of the label. */
  description: string
}

export const IMMZ_IMMUNIZATION_PROFILE_URL =
  'http://smart.who.int/immunizations/StructureDefinition/IMMZ.Immunization'

export const immunizationIgFields: ImmunizationIgField[] = [
  // -- Base FHIR R4 fields (cardinality per base spec; this profile's own
  //    differential doesn't restate them) --
  {
    path: 'status',
    origin: 'base',
    cardinality: '1..1',
    required: true,
    label: 'Status',
    description: 'completed | entered-in-error | not-done.',
  },
  {
    path: 'vaccineCode',
    origin: 'base',
    cardinality: '1..1',
    required: true,
    label: 'Vaccine code',
    description:
      'The vaccine administered. Required-strength binding to the IG\'s own ' +
      'IMMZ.Z.VS value set (http://smart.who.int/immunizations/ValueSet/IMMZ.Z.VS), ' +
      'confirmed directly from the StructureDefinition\'s binding element.',
  },
  {
    path: 'patient',
    origin: 'base',
    cardinality: '1..1',
    required: true,
    label: 'Patient',
    description: 'Reference to who received the vaccine.',
  },
  {
    path: 'occurrenceDateTime',
    origin: 'base',
    cardinality: '1..1',
    required: true,
    label: 'Occurrence date/time',
    description:
      'Vaccination date. This profile\'s differential constrains occurrence[x] ' +
      'to the dateTime choice specifically (not occurrenceString).',
  },
  {
    path: 'statusReason',
    origin: 'base',
    cardinality: '0..1',
    required: false,
    label: 'Status reason',
    description: 'Reason the vaccine was not administered, when status is not-done.',
  },
  {
    path: 'protocolApplied',
    origin: 'base',
    cardinality: '1..*',
    required: true,
    label: 'Protocol applied',
    description: 'At least one protocol entry is required by this profile.',
  },
  {
    path: 'protocolApplied.series',
    origin: 'base',
    cardinality: '1..1',
    required: true,
    label: 'Series',
    description: 'Required within each protocolApplied entry -- the vaccination series/target disease name.',
  },
  {
    path: 'protocolApplied.doseNumberString',
    origin: 'base',
    cardinality: '1..1',
    required: true,
    label: 'Dose number',
    description: 'This profile constrains doseNumber[x] to the string choice specifically.',
  },

  // -- IG-specific extensions, each a real slice in the profile's differential --
  {
    path: 'extension:vaccineBrand',
    origin: 'ig-extension',
    sliceName: 'vaccineBrand',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZVaccineBrand',
    cardinality: '1..1',
    required: true,
    label: 'Vaccine brand',
    description: 'Required. Data type per IMMZVaccineBrand\'s own StructureDefinition, not independently checked here.',
  },
  {
    path: 'extension:marketAuthorizationHolder',
    origin: 'ig-extension',
    sliceName: 'marketAuthorizationHolder',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZMarketAuthorization',
    cardinality: '1..1',
    required: true,
    label: 'Market authorization holder',
    description: 'Required. Manufacturer/market-authorization information.',
  },
  {
    path: 'extension:liveVaccine',
    origin: 'ig-extension',
    sliceName: 'liveVaccine',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZLiveVaccine',
    cardinality: '0..1',
    required: false,
    label: 'Live vaccine',
    description: 'Optional boolean indicator.',
  },
  {
    path: 'extension:typeOfPolio',
    origin: 'ig-extension',
    sliceName: 'typeOfPolio',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- polio',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfJe',
    origin: 'ig-extension',
    sliceName: 'typeOfJe',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- Japanese encephalitis',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfTbe',
    origin: 'ig-extension',
    sliceName: 'typeOfTbe',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- tick-borne encephalitis',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfTyphoid',
    origin: 'ig-extension',
    sliceName: 'typeOfTyphoid',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- typhoid',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfCholera',
    origin: 'ig-extension',
    sliceName: 'typeOfCholera',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- cholera',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfMeningococcal',
    origin: 'ig-extension',
    sliceName: 'typeOfMeningococcal',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- meningococcal',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfHepatitisA',
    origin: 'ig-extension',
    sliceName: 'typeOfHepatitisA',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- hepatitis A',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'extension:typeOfHepatitisB',
    origin: 'ig-extension',
    sliceName: 'typeOfHepatitisB',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZTypeOfDose',
    cardinality: '0..1',
    required: false,
    label: 'Type of dose -- hepatitis B',
    description: 'Disease-specific slice of the shared IMMZTypeOfDose extension.',
  },
  {
    path: 'protocolApplied.extension:dueDateOfNextDose',
    origin: 'ig-extension',
    sliceName: 'dueDateOfNextDose',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZDueDateOfNextDose',
    cardinality: '0..1',
    required: false,
    label: 'Due date of next dose',
    description: 'Optional, nested within each protocolApplied entry.',
  },
  {
    path: 'location.extension:countryOfVaccination',
    origin: 'ig-extension',
    sliceName: 'countryOfVaccination',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZCountryOfVaccination',
    cardinality: '1..1',
    required: true,
    label: 'Country of vaccination',
    description: 'Required. ISO 3166-1 country code, nested under location.',
  },
  {
    path: 'location.extension:administrativeArea',
    origin: 'ig-extension',
    sliceName: 'administrativeArea',
    extensionUrl: 'http://smart.who.int/immunizations/StructureDefinition/IMMZAdministrativeArea',
    cardinality: '0..1',
    required: false,
    label: 'Administrative area',
    description: 'Optional administrative subdivision, nested under location.',
  },
]

export const requiredImmunizationIgFields = (): ImmunizationIgField[] =>
  immunizationIgFields.filter((field) => field.required)
