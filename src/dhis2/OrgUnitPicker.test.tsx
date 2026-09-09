import { CustomDataProvider } from '@dhis2/app-runtime'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { OrgUnitPicker } from './OrgUnitPicker'

// CustomDataProvider matches mock data by the query's `resource` string,
// not the query object's own top-level key -- confirmed directly (not
// assumed) since this file's own root-listing query AND
// @dhis2-ui/organisation-unit-tree's own per-node fetch both use resource
// 'organisationUnits', so one mock function here has to serve both:
// the tree's per-node fetch always carries an `id`, this component's own
// listing query never does.
function organisationUnitsMock(rootIds: string[]) {
  return (_type: string, query: { id?: string }) => {
    if (query.id) {
      return Promise.resolve({ id: query.id, displayName: 'National level', path: `/${query.id}`, children: [] })
    }
    return Promise.resolve({ organisationUnits: rootIds.map((id) => ({ id })) })
  }
}

describe('OrgUnitPicker', () => {
  it('shows a NoticeBox, not a crash, when the instance has no level-1 organisation units', async () => {
    render(
      <CustomDataProvider data={{ organisationUnits: organisationUnitsMock([]) }}>
        <OrgUnitPicker onSelect={jest.fn()} />
      </CustomDataProvider>
    )
    expect(await screen.findByText('No organisation units found')).toBeInTheDocument()
  })

  it('selecting the root node calls onSelect with its id', async () => {
    const onSelect = jest.fn()

    render(
      <CustomDataProvider data={{ organisationUnits: organisationUnitsMock(['root1']) }}>
        <OrgUnitPicker onSelect={onSelect} />
      </CustomDataProvider>
    )

    const node = await screen.findByText('National level')
    fireEvent.click(node)

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('root1'))
  })
})
