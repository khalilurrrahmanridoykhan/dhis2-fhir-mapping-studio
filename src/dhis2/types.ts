/**
 * Shapes for the DHIS2-side metadata this app browses live -- never
 * creates. Field names and nesting match exactly what was live-verified
 * against play.im.dhis2.org/stable-2-43-1 (see useTargetPrograms.ts's own
 * query object), not assumed from the API docs alone.
 */

export interface DhisOptionSetOption {
  code: string
  name: string
}

export interface DhisOptionSet {
  id: string
  name: string
  options: DhisOptionSetOption[]
}

export interface DhisDataElement {
  id: string
  name: string
  valueType: string
  optionSet?: DhisOptionSet
}

export interface DhisProgramStageDataElement {
  dataElement: DhisDataElement
}

export interface DhisProgramStage {
  id: string
  name: string
  programStageDataElements: DhisProgramStageDataElement[]
}

export interface DhisTargetProgram {
  id: string
  name: string
  // WITHOUT_REGISTRATION programs are hard-limited by the platform to
  // exactly one stage -- confirmed and relied on elsewhere in this app
  // family already (see the AMR Stewardship Log's own README). This app
  // only targets that program type, so callers can safely read
  // programStages[0] without a separate stage picker.
  programStages: DhisProgramStage[]
}
