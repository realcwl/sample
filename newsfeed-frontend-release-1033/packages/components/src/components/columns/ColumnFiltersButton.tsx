import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { emitter } from '../../libs/emitter'
import { contentPadding } from '../../styles/variables'
import { IconButton } from '../common/IconButton'
import * as actions from '../../redux/actions'

export interface ColumnFiltersButtonProps {
  columnId: string
}

export const ColumnFiltersButton = React.memo(
  (props: ColumnFiltersButtonProps) => {
    const { columnId } = props

    const dispatch = useDispatch()

    const focusColumn = useCallback(() => {
      emitter.emit('FOCUS_ON_COLUMN', {
        columnId,
        highlight: false,
        scrollTo: false,
      })
    }, [columnId])

    const toggleColumnFilters = useCallback(() => {
      emitter.emit('TOGGLE_COLUMN_FILTERS', { columnId })
    }, [columnId])

    // const onPress = useCallback(() => {
    //   focusColumn()
    //   toggleColumnFilters()
    // }, [focusColumn, toggleColumnFilters])

    const onPress = () => {
      dispatch(
        actions.replaceModal({
          name: 'ADD_COLUMN_DETAILS',
          params: {
            // Modifying existing column's attribute.
            columnId,
          },
        }),
      )
    }

    const style = useMemo(
      () => ({
        paddingHorizontal: contentPadding / 3,
      }),
      [],
    )

    return (
      <IconButton
        key="column-filters-toggle-button"
        analyticsAction="toggle"
        analyticsLabel="column_filters"
        family="octicon"
        name="filter"
        onPress={onPress}
        style={style}
        tooltip="Filters"
      />
    )
  },
)

ColumnFiltersButton.displayName = 'ColumnFiltersButton'
