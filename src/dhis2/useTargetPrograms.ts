import { useDataQuery } from '@dhis2/app-runtime'
import type { DhisTargetProgram } from './types'

/**
 * Live-browses the connected instance's own existing WITHOUT_REGISTRATION
 * programs and their data elements -- this app never creates DHIS2
 * metadata, only reads what an admin already has, per the design's core
 * constraint (Johan's "schema-building kit, not a schema" point: the
 * DHIS2 side is per-deployment and has to be picked by a human, not
 * inferred).
 *
 * Query shape verified live against play.im.dhis2.org/stable-2-43-1
 * before being written here -- confirmed programs, programStages, and
 * per-stage dataElement (id/name/valueType/optionSet) all resolve exactly
 * as nested below, not assumed from documentation.
 */
interface TargetProgramsQueryResult {
  programs: {
    programs: DhisTargetProgram[]
  }
}

const query = {
  programs: {
    resource: 'programs',
    params: {
      filter: 'programType:eq:WITHOUT_REGISTRATION',
      fields: [
        'id,name',
        'programStages[id,name,programStageDataElements[dataElement[id,name,valueType,optionSet[id,name,options[code,name]]]]]',
      ].join(','),
      pageSize: 100,
    },
  },
}

export function useTargetPrograms() {
  const { error, loading, data } = useDataQuery<TargetProgramsQueryResult>(query)

  return {
    error,
    loading,
    programs: data?.programs.programs ?? [],
  }
}
