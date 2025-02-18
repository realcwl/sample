import { Column, NewsFeedData } from '@devhub/core'
import { RefObject, useCallback, useRef } from 'react'
import { useDispatch } from 'react-redux'

import { getCurrentFocusedColumnId } from '../components/context/ColumnFocusContext'
import { emitter } from '../libs/emitter'
import { OneList } from '../libs/one-list'
import { useEmitter } from './use-emitter'
import useKeyPressCallback from './use-key-press-callback'
import useMultiKeyPressCallback from './use-multi-key-press-callback'

export function useCardsKeyboard<ItemT extends NewsFeedData>(
  listRef: RefObject<typeof OneList>,
  {
    columnId,
    getItemByNodeIdOrId,
    itemNodeIdOrIds,
    type,
    visibleItemIndexesRef,
  }: {
    columnId: string
    getItemByNodeIdOrId: (nodeIdOrId: string) => ItemT | undefined
    itemNodeIdOrIds: string[]
    type: Column['type']
    visibleItemIndexesRef?: RefObject<{ from: number; to: number }> | undefined
  },
) {
  const isColumnFocusedRef = useRef(getCurrentFocusedColumnId() === columnId)
  const selectedItemNodeIdOrIdRef = useRef<string | null | undefined>(undefined)
  const selectedItemIndexRef = useRef<number>(-1)
  selectedItemIndexRef.current = itemNodeIdOrIds.findIndex(
    (id) => !!(id && id === selectedItemNodeIdOrIdRef.current),
  )

  const hasVisibleItems = () =>
    visibleItemIndexesRef &&
    visibleItemIndexesRef.current &&
    typeof visibleItemIndexesRef.current.from === 'number' &&
    typeof visibleItemIndexesRef.current.to === 'number' &&
    visibleItemIndexesRef.current.from >= 0 &&
    visibleItemIndexesRef.current.to >= visibleItemIndexesRef.current.from

  const getFirstVisibleItemIndex = (fallbackValue = 0) =>
    hasVisibleItems() ? visibleItemIndexesRef!.current!.from : fallbackValue

  const getFirstVisibleItemIndexOrSelected = (fallbackValue = 0) => {
    if (
      typeof selectedItemIndexRef.current === 'number' &&
      selectedItemIndexRef.current >= 0
    ) {
      if (
        hasVisibleItems() &&
        selectedItemIndexRef.current >= visibleItemIndexesRef!.current!.from &&
        selectedItemIndexRef.current <= visibleItemIndexesRef!.current!.to
      ) {
        return selectedItemIndexRef.current
      }
    }

    return getFirstVisibleItemIndex(fallbackValue)
  }

  const dispatch = useDispatch()

  useEmitter(
    'FOCUS_ON_COLUMN',
    (payload) => {
      if (!(listRef && listRef.current)) return
      if (columnId !== payload.columnId) {
        isColumnFocusedRef.current = false
        return
      }

      const index = payload.focusOnVisibleItem
        ? getFirstVisibleItemIndexOrSelected(-1)
        : -1
      const newIndex = Math.max(-1, Math.min(index, itemNodeIdOrIds.length - 1))
      const itemNodeIdOrId =
        newIndex >= 0 ? itemNodeIdOrIds[newIndex] : undefined

      const newValue = itemNodeIdOrId || null
      selectedItemNodeIdOrIdRef.current = newValue
      selectedItemIndexRef.current = newValue ? newIndex : -1

      isColumnFocusedRef.current = true

      if (payload.focusOnVisibleItem) {
        emitter.emit('FOCUS_ON_COLUMN_ITEM', {
          columnId,
          itemNodeIdOrId: selectedItemNodeIdOrIdRef.current,
        })
      }
    },
    [columnId, itemNodeIdOrIds],
  )

  useEmitter(
    'FOCUS_ON_COLUMN_ITEM',
    (payload) => {
      if (columnId !== payload.columnId) return

      selectedItemNodeIdOrIdRef.current = payload.itemNodeIdOrId
      selectedItemIndexRef.current = itemNodeIdOrIds.findIndex(
        (id) => !!(id && id === selectedItemNodeIdOrIdRef.current),
      )

      if (
        payload.scrollTo &&
        listRef.current &&
        selectedItemIndexRef.current >= 0
      )
        listRef.current.scrollToIndex(selectedItemIndexRef.current)
    },
    [columnId, itemNodeIdOrIds],
  )

  const firstItemNodeIdOrId = itemNodeIdOrIds && itemNodeIdOrIds[0]
  useEmitter(
    'SCROLL_TOP_COLUMN',
    (payload) => {
      if (payload.columnId !== columnId) return

      emitter.emit('FOCUS_ON_COLUMN_ITEM', {
        columnId,
        itemNodeIdOrId: firstItemNodeIdOrId || null,
        scrollTo: false,
      })

      if (listRef.current) {
        listRef.current.scrollToStart()
      }
    },
    [columnId, firstItemNodeIdOrId],
  )

  useEmitter(
    'SCROLL_UP_COLUMN',
    (payload: { columnId: string }) => {
      if (!(listRef && listRef.current)) return
      if (columnId !== payload.columnId) return

      const newIndex =
        selectedItemIndexRef.current >= 0
          ? Math.max(
              0,
              Math.min(
                selectedItemIndexRef.current - 1,
                itemNodeIdOrIds.length - 1,
              ),
            )
          : getFirstVisibleItemIndex()
      const itemNodeIdOrId = itemNodeIdOrIds[newIndex]

      const newValue = itemNodeIdOrId || null
      if (selectedItemNodeIdOrIdRef.current === newValue) {
        if (newIndex === 0) listRef.current.scrollToStart()
        return
      }
      selectedItemNodeIdOrIdRef.current = newValue
      selectedItemIndexRef.current = newValue ? newIndex : -1

      emitter.emit('FOCUS_ON_COLUMN_ITEM', {
        columnId,
        itemNodeIdOrId: selectedItemNodeIdOrIdRef.current,
        scrollTo: true,
      })
    },
    [columnId, itemNodeIdOrIds],
  )

  useEmitter(
    'SCROLL_DOWN_COLUMN',
    (payload: { columnId: string }) => {
      if (!(listRef && listRef.current)) return
      if (columnId !== payload.columnId) return

      const newIndex =
        selectedItemIndexRef.current >= 0
          ? Math.max(
              0,
              Math.min(
                selectedItemIndexRef.current + 1,
                itemNodeIdOrIds.length - 1,
              ),
            )
          : getFirstVisibleItemIndex()
      const itemNodeIdOrId = itemNodeIdOrIds[newIndex]

      const newValue = itemNodeIdOrId || null
      if (selectedItemNodeIdOrIdRef.current === newValue) {
        if (newIndex >= itemNodeIdOrIds.length - 1)
          listRef.current.scrollToEnd()
        return
      }

      selectedItemNodeIdOrIdRef.current = newValue
      selectedItemIndexRef.current = newValue ? newIndex : -1

      listRef.current.scrollToIndex(newIndex)

      emitter.emit('FOCUS_ON_COLUMN_ITEM', {
        columnId,
        itemNodeIdOrId: selectedItemNodeIdOrIdRef.current!,
      })
    },
    [columnId, itemNodeIdOrIds],
  )

  useKeyPressCallback(
    'Escape',
    useCallback(() => {
      if (!(listRef && listRef.current)) return
      if (!isColumnFocusedRef.current) return
      if (selectedItemNodeIdOrIdRef.current === null) return

      selectedItemNodeIdOrIdRef.current = null
      selectedItemIndexRef.current = -1
      emitter.emit('FOCUS_ON_COLUMN_ITEM', {
        columnId,
        itemNodeIdOrId: null,
      })
    }, []),
  )

  useKeyPressCallback(
    'Enter',
    useCallback(() => {
      if (!isColumnFocusedRef.current) return

      const selectedItemNodeIdOrId =
        !!selectedItemNodeIdOrIdRef.current &&
        itemNodeIdOrIds.find(
          (id) => id && id === selectedItemNodeIdOrIdRef.current,
        )
      if (!selectedItemNodeIdOrId) return

      const selectedItem = getItemByNodeIdOrId(selectedItemNodeIdOrId)
      if (!selectedItem) return
    }, [columnId, getItemByNodeIdOrId, itemNodeIdOrIds, type]),
  )

  useKeyPressCallback(
    's',
    useCallback(() => {
      if (!isColumnFocusedRef.current) return

      const selectedItemNodeIdOrId =
        !!selectedItemNodeIdOrIdRef.current &&
        itemNodeIdOrIds.find(
          (id) => id && id === selectedItemNodeIdOrIdRef.current,
        )
      if (!selectedItemNodeIdOrId) return

      const selectedItem = getItemByNodeIdOrId(selectedItemNodeIdOrId)
      if (!selectedItem) return
    }, [getItemByNodeIdOrId, itemNodeIdOrIds]),
  )

  useKeyPressCallback(
    'r',
    useCallback(() => {
      if (!isColumnFocusedRef.current) return

      const selectedItemNodeIdOrId =
        !!selectedItemNodeIdOrIdRef.current &&
        itemNodeIdOrIds.find(
          (id) => id && id === selectedItemNodeIdOrIdRef.current,
        )
      if (!selectedItemNodeIdOrId) return

      const selectedItem = getItemByNodeIdOrId(selectedItemNodeIdOrId)
      if (!selectedItem) return
    }, [getItemByNodeIdOrId, itemNodeIdOrIds]),
  )

  useMultiKeyPressCallback(
    ['Shift', 'r'],
    useCallback(() => {
      if (!isColumnFocusedRef.current) return
    }, [getItemByNodeIdOrId, itemNodeIdOrIds]),
  )

  useKeyPressCallback(
    ' ',
    useCallback(() => {
      if (!isColumnFocusedRef.current) return
      if (!(listRef && listRef.current)) return

      if (!hasVisibleItems()) {
        listRef.current.scrollToStart()
        return
      }

      const visibleItemsCount =
        visibleItemIndexesRef!.current!.to -
        visibleItemIndexesRef!.current!.from +
        1

      const scrollToIndex = Math.min(
        visibleItemIndexesRef!.current!.to + visibleItemsCount,
        itemNodeIdOrIds.length - 1,
      )

      listRef.current.scrollToIndex(scrollToIndex, { alignment: 'start' })

      if (itemNodeIdOrIds[scrollToIndex]) {
        emitter.emit('FOCUS_ON_COLUMN_ITEM', {
          columnId,
          itemNodeIdOrId: itemNodeIdOrIds[scrollToIndex],
          scrollTo: false,
        })
      }
    }, [itemNodeIdOrIds]),
  )

  useMultiKeyPressCallback(
    ['Shift', ' '],
    useCallback(() => {
      if (!isColumnFocusedRef.current) return
      if (!(listRef && listRef.current)) return

      if (!hasVisibleItems()) {
        listRef.current.scrollToStart()
        return
      }

      const visibleItemsCount =
        visibleItemIndexesRef!.current!.to -
        visibleItemIndexesRef!.current!.from +
        1

      const scrollToIndex = Math.max(
        0,
        visibleItemIndexesRef!.current!.from - visibleItemsCount,
      )
      listRef.current.scrollToIndex(scrollToIndex, { alignment: 'start' })

      if (itemNodeIdOrIds[scrollToIndex]) {
        emitter.emit('FOCUS_ON_COLUMN_ITEM', {
          columnId,
          itemNodeIdOrId: itemNodeIdOrIds[scrollToIndex],
          scrollTo: false,
        })
      }
    }, [itemNodeIdOrIds]),
  )
}
