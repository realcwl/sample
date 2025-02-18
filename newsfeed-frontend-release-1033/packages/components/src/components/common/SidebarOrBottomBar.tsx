import { constants, ModalPayload, ThemeColors } from '@devhub/core'
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  FlatList,
  FlatListProps,
  ImageStyle,
  PixelRatio,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native'
import { useDispatch } from 'react-redux'

import { useColumn } from '../../hooks/use-column'
import { useColumnData } from '../../hooks/use-column-data'
import { shouldRenderFAB } from '../../hooks/use-fab'
import { useForceRerender } from '../../hooks/use-force-rerender'
import { useHover } from '../../hooks/use-hover'
import { useIsColumnFocused } from '../../hooks/use-is-column-focused'
import { useReduxState } from '../../hooks/use-redux-state'
import { emitter } from '../../libs/emitter'
import { Platform } from '../../libs/platform'
import { useSafeArea } from '../../libs/safe-area-view'
import { IconProp } from '../../libs/vector-icons'
import * as actions from '../../redux/actions'
import * as selectors from '../../redux/selectors'
import { sharedStyles } from '../../styles/shared'
import {
  contentPadding,
  mutedOpacity,
  scaleFactor,
  smallerTextSize,
} from '../../styles/variables'
import {
  columnHeaderHeight,
  getColumnHeaderThemeColors,
} from '../columns/ColumnHeader'
import { useAppLayout } from '../context/LayoutContext'
import { getTheme } from '../context/ThemeContext'
import { ThemedIcon } from '../themed/ThemedIcon'
import { ThemedText } from '../themed/ThemedText'
import { ThemedTouchableOpacity } from '../themed/ThemedTouchableOpacity'
import { ThemedView } from '../themed/ThemedView'
import { Avatar } from './Avatar'
import { ConditionalWrap } from './ConditionalWrap'
import {
  FlatListWithOverlay,
  FlatListWithOverlayProps,
} from './FlatListWithOverlay'
import { Link } from './Link'
import { Separator } from './Separator'
import { Spacer } from './Spacer'
import { defaultUnreadIndicatorSize, UnreadDot } from './UnreadDot'

export interface SidebarOrBottomBarProps {
  type: 'sidebar' | 'bottombar'
}

export const sidebarIconSize = 20 * scaleFactor
export const sidebarAvatarSize = sidebarIconSize
export const sidebarUnreadIndicatorSize = defaultUnreadIndicatorSize
export const sidebarItemHeight = sidebarIconSize + (contentPadding * 3) / 2
export const sidebarWidth = 50 * scaleFactor

export const bottomBarIconSize = 20 * scaleFactor
export const bottomBarAvatarSize = bottomBarIconSize
export const bottomBarLabelSize = smallerTextSize - 2
export const bottomBarUnreadIndicatorSize = defaultUnreadIndicatorSize
export const bottomBarItemWidth =
  sidebarIconSize + (contentPadding * 3) / 2 + 16 * scaleFactor
export const bottomBarLabelContainerHeight =
  bottomBarLabelSize + contentPadding / 3
export const bottomBarHeight = 50 + bottomBarLabelContainerHeight

interface SidebarHoverItemContextValue {
  HoverContent: React.ReactNode
  hoveredColumnId: string | null
}
const SidebarHoverItemContext = React.createContext<
  SidebarHoverItemContextValue & {
    setValue(value: SidebarHoverItemContextValue): void
  }
>({
  HoverContent: null,
  hoveredColumnId: null,
  setValue: () => {
    if (__DEV__) {
      throw new Error('SidebarHoverItemContext not initialized.')
    }
  },
})

const keyExtractor: FlatListProps<string>['keyExtractor'] = (item) =>
  `sidebar-column-${item}`

const keyExtractorOverlay: FlatListProps<string>['keyExtractor'] = (item) =>
  `sidebar-column-${item}`

const SidebarHoverItemContextProvider = React.memo(
  (props: { children: React.ReactNode }) => {
    const { children } = props

    const [_value, _setValue] = useState<SidebarHoverItemContextValue>({
      HoverContent: null,
      hoveredColumnId: null,
    })

    const value = useMemo(
      () => ({
        HoverContent: _value.HoverContent,
        hoveredColumnId: _value.hoveredColumnId,
        setValue: _setValue,
      }),
      [_value.HoverContent, _value.hoveredColumnId],
    )

    return (
      <SidebarHoverItemContext.Provider value={value}>
        {children}
      </SidebarHoverItemContext.Provider>
    )
  },
)

export const SidebarOrBottomBar = React.memo(
  (props: SidebarOrBottomBarProps) => {
    const { type } = props

    const horizontal = type === 'bottombar'

    const forceRerender = useForceRerender()

    const hoverListRef = useRef<FlatList<string>>(null)
    const listContentDimensionsRef = useRef({ width: 0, height: 0 })
    const visibleItemsRef = useRef({ fromIndex: -1, toIndex: -1 })
    const columnIndexUnreadMapperRef = useRef<
      Map<number, boolean | keyof ThemeColors>
    >(new Map())
    const overlayThemeColorsRef = useRef<{
      topOrLeft: FlatListWithOverlayProps<string>['topOrLeftOverlayThemeColor']
      bottomOrRight: FlatListWithOverlayProps<string>['bottomOrRightOverlayThemeColor']
    }>({
      topOrLeft: getColumnHeaderThemeColors().normal,
      bottomOrRight: getColumnHeaderThemeColors().normal,
    })

    const { sizename } = useAppLayout()
    const safeAreaInsets = useSafeArea()

    const dispatch = useDispatch()
    const bannerMessage = useReduxState(selectors.bannerMessageSelector)
    const columnIds = useReduxState(selectors.columnIdsSelector)
    const currentOpenedModal = useReduxState(selectors.currentOpenedModal)
    const modalStack = useReduxState(selectors.modalStack)
    const user = useReduxState(selectors.currentUserSelector)

    const small = sizename <= '2-medium'

    function isModalOpen(modalName: ModalPayload['name']) {
      return !!modalStack && modalStack.some((m) => m && m.name === modalName)
    }

    const styles = horizontal ? horizontalStyles : verticalStyles

    const renderItem = useCallback<
      NonNullable<FlatListWithOverlayProps<string>['renderItem']>
    >(
      ({ item: columnId }) => {
        return (
          <SidebarOrBottomBarColumnItem
            key={`sidebar-or-bottom-bar-item-${columnId}`}
            columnId={columnId}
            columnIndexUnreadMapperRef={columnIndexUnreadMapperRef}
            horizontal={horizontal}
            hoverListRef={hoverListRef}
          />
        )
      },
      [horizontal],
    )

    const renderHoverItem = useCallback<
      NonNullable<FlatListWithOverlayProps<string>['renderItem']>
    >(
      ({ item: columnId }) => {
        return (
          <SidebarHoverItemContext.Consumer
            key={`sidebar-or-bottom-bar-hover-item-${columnId}`}
          >
            {({ hoveredColumnId, HoverContent }) =>
              hoveredColumnId === columnId ? (
                HoverContent
              ) : (
                <View style={styles.itemPlaceholder} />
              )
            }
          </SidebarHoverItemContext.Consumer>
        )
      },
      [styles],
    )

    const updateOverlayColors = useCallback(() => {
      let unreadHiddenAtTopOrLeft: boolean | keyof ThemeColors | undefined
      let unreadHiddenAtBottomOrRight: boolean | keyof ThemeColors | undefined

      for (let i = 0; i < visibleItemsRef.current.fromIndex; i++) {
        const value = columnIndexUnreadMapperRef.current.get(i)
        unreadHiddenAtTopOrLeft =
          value && typeof value === 'string'
            ? value
            : unreadHiddenAtTopOrLeft || value
      }
      for (
        let i = visibleItemsRef.current.toIndex + 1;
        i < columnIds.length;
        i++
      ) {
        const value = columnIndexUnreadMapperRef.current.get(i)
        unreadHiddenAtBottomOrRight =
          value && typeof value === 'string'
            ? value
            : unreadHiddenAtBottomOrRight || value
      }

      const topOrLeftOverlayThemeColor = unreadHiddenAtTopOrLeft
        ? typeof unreadHiddenAtTopOrLeft === 'string'
          ? unreadHiddenAtTopOrLeft
          : 'primaryBackgroundColor'
        : getColumnHeaderThemeColors().normal
      const bottomOrRightOverlayThemeColor = unreadHiddenAtBottomOrRight
        ? typeof unreadHiddenAtBottomOrRight === 'string'
          ? unreadHiddenAtBottomOrRight
          : 'primaryBackgroundColor'
        : getColumnHeaderThemeColors().normal
      if (
        overlayThemeColorsRef.current.topOrLeft !==
          topOrLeftOverlayThemeColor ||
        overlayThemeColorsRef.current.bottomOrRight !==
          bottomOrRightOverlayThemeColor
      ) {
        overlayThemeColorsRef.current.topOrLeft = topOrLeftOverlayThemeColor
        overlayThemeColorsRef.current.bottomOrRight =
          bottomOrRightOverlayThemeColor
        forceRerender()
      }
    }, [columnIds.length])

    const onLayout = useCallback<
      NonNullable<FlatListProps<string>['onLayout']>
    >(
      (e) => {
        listContentDimensionsRef.current = {
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        }
        updateOverlayColors()
      },
      [updateOverlayColors],
    )

    const onScroll = useCallback<
      NonNullable<FlatListProps<string>['onScroll']>
    >(
      (e) => {
        if (hoverListRef.current && e) {
          hoverListRef.current.scrollToOffset({
            animated: false,
            offset: horizontal
              ? e.nativeEvent.contentOffset.x
              : e.nativeEvent.contentOffset.y,
          })
        }

        updateOverlayColors()
      },
      [horizontal, updateOverlayColors],
    )

    const listContentContainerStyle = useMemo(
      () => [
        styles.listContentContainer,
        ...(small && horizontal
          ? [sharedStyles.fullMinWidth, sharedStyles.justifyContentSpaceEvenly]
          : []),
      ],
      [horizontal, small, styles],
    )

    const onViewableItemsChanged = useMemo<
      FlatListProps<string>['onViewableItemsChanged']
    >(() => {
      return ({ viewableItems }) => {
        const visibleIndexes = viewableItems
          .filter((v) => v.isViewable && typeof v.index === 'number')
          .map((v) => v.index!)

        visibleItemsRef.current = {
          fromIndex: Math.min(...visibleIndexes),
          toIndex: Math.max(...visibleIndexes),
        }

        updateOverlayColors()
      }
    }, [])

    const viewabilityConfig = useMemo(
      () => ({
        itemVisiblePercentThreshold: 80,
      }),
      [],
    )

    const PreferencesItem = useCallback(
      () => (
        <SidebarOrBottomBarItem
          horizontal={horizontal}
          icon={{ family: 'octicon', name: 'settings' }}
          onPress={() =>
            small &&
            currentOpenedModal &&
            currentOpenedModal.name === 'SETTINGS'
              ? columnIds.length === 0
                ? dispatch(actions.closeAllModals())
                : undefined
              : dispatch(actions.replaceModal({ name: 'SETTINGS' }))
          }
          showUnreadIndicator={false}
          unreadIndicatorColor={'red'}
          selected={isModalOpen('SETTINGS')}
          title="Preferences"
        />
      ),
      [
        horizontal,
        small,
        currentOpenedModal && currentOpenedModal.name === 'SETTINGS',
        columnIds.length === 0,
        isModalOpen('SETTINGS'),
      ],
    )
    const renderPreferencesItemInline = !!(
      horizontal &&
      small &&
      columnIds.length <= 3
    )

    return (
      <SidebarHoverItemContextProvider>
        <ThemedView
          backgroundColor={getColumnHeaderThemeColors().normal}
          style={[
            styles.container,
            horizontal
              ? {
                  paddingBottom: safeAreaInsets.bottom,
                  paddingLeft: safeAreaInsets.left,
                  paddingRight: safeAreaInsets.right,
                }
              : {
                  paddingTop:
                    bannerMessage && bannerMessage.message
                      ? 0
                      : safeAreaInsets.top,
                  paddingBottom: safeAreaInsets.bottom,
                  paddingLeft: safeAreaInsets.left,
                },
          ]}
        >
          <View style={styles.contentContainer}>
            {!horizontal && (
              <>
                <View
                  style={[sharedStyles.center, { height: columnHeaderHeight }]}
                >
                  <SidebarOrBottomBarItem horizontal={horizontal} title="">
                    <Link
                      analyticsLabel="sidebar_user_avatar"
                      href={'https://www.google.com'}
                      openOnNewTab
                      style={[
                        sharedStyles.center,
                        sharedStyles.fullWidth,
                        sharedStyles.fullHeight,
                      ]}
                    >
                      <Avatar
                        avatarUrl={user?.avatarUrl ?? undefined}
                        disableLink
                        shape="circle"
                        size={sidebarWidth * (3 / 5)}
                      />
                    </Link>
                  </SidebarOrBottomBarItem>
                </View>

                <Separator horizontal />
              </>
            )}

            <View
              style={[
                sharedStyles.flex,
                horizontal
                  ? sharedStyles.verticalReverse
                  : sharedStyles.horizontal,
              ]}
            >
              <FlatListWithOverlay
                ListFooterComponent={
                  renderPreferencesItemInline ? PreferencesItem : null
                }
                bottomOrRightOverlayThemeColor={
                  overlayThemeColorsRef.current.bottomOrRight
                }
                containerStyle={styles.listContainer}
                contentContainerStyle={listContentContainerStyle}
                data={columnIds}
                horizontal={horizontal}
                keyExtractor={keyExtractor}
                onLayout={onLayout}
                onScroll={onScroll}
                renderItem={renderItem}
                scrollEventThrottle={16}
                style={styles.list}
                topOrLeftOverlayThemeColor={
                  overlayThemeColorsRef.current.topOrLeft
                }
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
              />

              {!horizontal && (
                <FlatListWithOverlay
                  ref={hoverListRef}
                  bottomOrRightOverlayThemeColor="backgroundColor"
                  data={columnIds}
                  keyExtractor={keyExtractorOverlay}
                  horizontal={horizontal}
                  pointerEvents="none"
                  renderItem={renderHoverItem}
                  scrollEnabled={false}
                  style={styles.hoverList}
                  topOrLeftOverlayThemeColor="backgroundColor"
                />
              )}
            </View>

            {!(horizontal && shouldRenderFAB({ sizename })) && (
              <SidebarOrBottomBarItem
                horizontal={horizontal}
                icon={{ family: 'octicon', name: 'plus' }}
                onPress={() =>
                  dispatch(actions.replaceModal({ name: 'ADD_COLUMN' }))
                }
                selected={isModalOpen('ADD_COLUMN')}
                title="Add column"
              />
            )}

            {!renderPreferencesItemInline && <PreferencesItem />}
          </View>
        </ThemedView>
      </SidebarHoverItemContextProvider>
    )
  },
)

SidebarOrBottomBar.displayName = 'SidebarOrBottomBar'

export interface SidebarOrBottomBarColumnItemProps {
  columnId: string
  horizontal: boolean | undefined
  hoverListRef: React.RefObject<FlatList<string>>
  columnIndexUnreadMapperRef: React.MutableRefObject<
    Map<number, boolean | keyof ThemeColors>
  >
}

export const SidebarOrBottomBarColumnItem = React.memo(
  (props: SidebarOrBottomBarColumnItemProps) => {
    const { columnId, columnIndexUnreadMapperRef, horizontal, hoverListRef } =
      props

    const { sizename } = useAppLayout()

    const dispatch = useDispatch()
    const currentOpenedModal = useReduxState(selectors.currentOpenedModal)

    const small = sizename <= '2-medium'

    const { column, columnIndex, hasCrossedColumnsLimit, headerDetails } =
      useColumn(columnId)

    const isColumnFocused = useIsColumnFocused(columnId)

    const avatarAndIconProps = useMemo(() => {
      if (
        headerDetails &&
        headerDetails.avatarProps &&
        headerDetails.avatarProps.imageURL
      )
        return {
          avatar: headerDetails.avatarProps.imageURL,
        }

      return {
        icon:
          (headerDetails && headerDetails.icon) ||
          ({
            family: column?.icon?.family,
            name: column?.icon?.name,
          } as IconProp),
      }
    }, [
      headerDetails &&
        headerDetails.avatarProps &&
        headerDetails.avatarProps.imageURL,
      headerDetails && headerDetails.icon,
      column && column.icon,
    ])

    const onPress = useCallback(() => {
      if (currentOpenedModal) dispatch(actions.closeAllModals())

      if (isColumnFocused) {
        if (!currentOpenedModal) emitter.emit('SCROLL_TOP_COLUMN', { columnId })
      } else {
        emitter.emit('FOCUS_ON_COLUMN', {
          animated: !currentOpenedModal,
          columnId,
          highlight: !small,
          scrollTo: true,
        })
      }
    }, [columnId, !!currentOpenedModal, isColumnFocused, small])

    const { filteredItemsIds, getItemByNodeIdOrId } = useColumnData(columnId, {
      mergeSimilar: false,
    })

    const showUnreadIndicator =
      !!column &&
      !!column.options &&
      !!column.options.enableAppIconUnreadIndicator &&
      filteredItemsIds.some((itemId) => {
        const item = getItemByNodeIdOrId(itemId)
        return item && !item.isRead
      })

    const unreadIndicatorColor = 'lightRed'

    useEffect(() => {
      columnIndexUnreadMapperRef.current.set(columnIndex, showUnreadIndicator)
    }, [columnIndex, showUnreadIndicator])

    if (!(column && columnIndex >= 0 && headerDetails)) return null

    return (
      <SidebarOrBottomBarItem
        key={`sidebar-or-bottom-bar-column-item-${columnId}-inner`}
        {...(avatarAndIconProps as any)}
        columnId={columnId}
        horizontal={horizontal}
        hoverListRef={hoverListRef}
        number={columnIndex + 1}
        onPress={onPress}
        selected={isColumnFocused && !currentOpenedModal}
        showUnreadIndicator={showUnreadIndicator}
        subtitle={headerDetails.subtitle}
        title={headerDetails.title}
        unreadIndicatorColor={unreadIndicatorColor}
      />
    )
  },
)

SidebarOrBottomBarColumnItem.displayName = 'SidebarOrBottomBarColumnItem'

export type SidebarOrBottomBarItemProps = {
  horizontal: boolean | undefined
  hoverListRef?: React.RefObject<FlatList<string>>
  number?: number
  selected?: boolean
  showUnreadIndicator?: boolean
  subtitle?: string | undefined
  title: string
  unreadIndicatorColor?: keyof ThemeColors
} & (
  | { columnId: string; onPress: () => void }
  | { columnId?: string; onPress?: () => void }
) &
  (
    | { children: React.ReactNode; icon?: undefined; avatar?: undefined }
    | { children?: undefined; icon: IconProp; avatar?: undefined }
    | { children?: undefined; avatar: string; icon?: undefined }
  )

export const SidebarOrBottomBarItem = React.memo(
  (props: SidebarOrBottomBarItemProps) => {
    const {
      avatar,
      children,
      columnId,
      horizontal,
      hoverListRef,
      icon,
      number: n,
      onPress,
      selected,
      showUnreadIndicator,
      subtitle,
      title,
      unreadIndicatorColor = 'primaryBackgroundColor',
    } = props

    const innerViewRef = useRef<View>(null)
    const dotViewRef = useRef<View>(null)

    const hoverItemContext = useContext(SidebarHoverItemContext)

    const styles = horizontal ? horizontalStyles : verticalStyles

    const HoverContent = useMemo(
      () =>
        !horizontal &&
        !!(n || title || subtitle) && (
          <ThemedView
            backgroundColor={
              selected
                ? getColumnHeaderThemeColors().selected
                : getColumnHeaderThemeColors().hover
            }
            style={styles.hoverContent}
          >
            {!!n && (
              <>
                <ThemedText color="foregroundColorMuted65" selectable={false}>
                  {n}
                </ThemedText>
                <Spacer width={contentPadding / 2} />
              </>
            )}

            {!!title && (
              <>
                <ThemedText color="foregroundColor" selectable={false}>
                  {title.toLowerCase()}
                </ThemedText>
                <Spacer width={contentPadding / 2} />
              </>
            )}

            {!!subtitle && (
              <>
                <ThemedText color="foregroundColorMuted65" selectable={false}>
                  {subtitle.toLowerCase()}
                </ThemedText>
                <Spacer width={contentPadding / 2} />
              </>
            )}

            {!!(n || title || subtitle) && (
              <Spacer width={contentPadding / 2} />
            )}
          </ThemedView>
        ),
      [horizontal, n, selected, styles, subtitle, title],
    )

    useHover(
      innerViewRef,
      useCallback(
        (isHovered) => {
          hoverItemContext.setValue({
            hoveredColumnId: (!horizontal && isHovered && columnId) || null,
            HoverContent: isHovered && !horizontal ? HoverContent : null,
          })

          if (hoverListRef && hoverListRef.current) {
            ;(hoverListRef.current as any).setNativeProps({
              style: {
                display: isHovered && !horizontal ? 'flex' : 'none',
              },
            })
          }
          if (innerViewRef.current) {
            innerViewRef.current.setNativeProps({
              style: {
                backgroundColor:
                  isHovered && !horizontal
                    ? selected
                      ? getTheme()[getColumnHeaderThemeColors().selected]
                      : getTheme()[getColumnHeaderThemeColors().hover]
                    : 'transparent',
                opacity: horizontal
                  ? isHovered || selected
                    ? undefined
                    : mutedOpacity
                  : undefined,
              },
            })
          }

          if (dotViewRef.current) {
            dotViewRef.current.setNativeProps({
              style: {
                borderColor: selected
                  ? getTheme()[getColumnHeaderThemeColors().selected]
                  : isHovered && !horizontal
                  ? getTheme()[getColumnHeaderThemeColors().hover]
                  : getTheme()[getColumnHeaderThemeColors().normal],
              },
            })
          }
        },
        [columnId, horizontal, selected],
      ),
    )

    return (
      <ConditionalWrap
        condition
        wrap={(c) =>
          onPress ? (
            <ThemedTouchableOpacity
              key={`sidebar-or-bottom-bar-item-${columnId}-inner`}
              backgroundColor={
                selected && !horizontal
                  ? getColumnHeaderThemeColors().selected
                  : getColumnHeaderThemeColors().normal
              }
              onPress={onPress}
              style={styles.itemContainer}
            >
              {c}
            </ThemedTouchableOpacity>
          ) : (
            <ThemedView
              key={`sidebar-or-bottom-bar-item-${columnId}-inner`}
              backgroundColor={
                selected && !horizontal
                  ? getColumnHeaderThemeColors().selected
                  : getColumnHeaderThemeColors().normal
              }
              style={styles.itemContainer}
            >
              {c}
            </ThemedView>
          )
        }
      >
        <View
          ref={innerViewRef}
          style={[
            styles.itemInnerContainer,
            !(!horizontal && !!columnId && !!(n || title || subtitle)) &&
              styles.itemInnerContainer__rounded,
            horizontal && !selected && sharedStyles.muted,
          ]}
        >
          <View style={styles.itemInnerIconOrAvatarContainer}>
            {children ? (
              children
            ) : avatar ? (
              <Avatar
                avatarUrl={avatar}
                disableLink
                shape="circle"
                size={sidebarAvatarSize}
                style={styles.avatar}
              />
            ) : icon ? (
              <ThemedIcon
                {...icon}
                color="foregroundColor"
                style={styles.icon}
              />
            ) : null}

            {!!showUnreadIndicator && (
              <UnreadDot
                ref={dotViewRef}
                backgroundColor={unreadIndicatorColor}
                borderColor={
                  selected
                    ? getColumnHeaderThemeColors().selected
                    : getColumnHeaderThemeColors().normal
                }
                style={styles.unreadIndicator}
              />
            )}
          </View>

          {!!horizontal && (
            <>
              <Spacer height={contentPadding / 3} />

              <ThemedText
                color="foregroundColor"
                numberOfLines={1}
                style={styles.labelText}
              >
                {(title || subtitle || ' ').toLowerCase()}
              </ThemedText>
            </>
          )}
        </View>
      </ConditionalWrap>
    )
  },
)

SidebarOrBottomBarItem.displayName = 'SidebarOrBottomBarItem'

const verticalStyles = StyleSheet.create({
  container: {
    minWidth: sidebarWidth,
    height: '100%',
    zIndex: 1001,
  },

  contentContainer: {
    position: 'relative',
    flexDirection: 'column',
    width: sidebarWidth,
    height: '100%',
    zIndex: 1001,
  },

  listContainer: {
    width: sidebarWidth,
    height: '100%',
  },

  list: {
    width: sidebarWidth,
    height: '100%',
  },

  hoverList: {
    display: 'none',
    minWidth: sidebarWidth + 200,
    height: '100%',
  },

  listContentContainer: {
    width: sidebarWidth,
    zIndex: 1001,
  },

  itemPlaceholder: {
    height: sidebarItemHeight,
  },

  itemContainer: {
    width: sidebarWidth,
    height: sidebarItemHeight,
    borderRadius: sidebarItemHeight / 2,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  itemInnerContainer: {
    position: 'absolute',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: sidebarWidth,
    height: sidebarItemHeight,
  },

  itemInnerContainer__rounded: {
    borderRadius: sidebarItemHeight / 2,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  itemInnerIconOrAvatarContainer: {
    position: 'relative',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: sidebarWidth,
    height: sidebarItemHeight,
  },

  hoverContent: {
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    width: 'auto',
    height: sidebarItemHeight,
    borderRadius: sidebarItemHeight / 2,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  avatar: {},

  icon: {
    fontSize: sidebarIconSize,
  },

  unreadIndicator: {
    position: 'absolute',
    bottom:
      (sidebarItemHeight - sidebarIconSize) / 2 -
      sidebarUnreadIndicatorSize / 4,
    right:
      (sidebarWidth - sidebarIconSize) / 2 - sidebarUnreadIndicatorSize / 2,
    width: sidebarUnreadIndicatorSize,
    height: sidebarUnreadIndicatorSize,
    borderWidth: 2,
    borderRadius: sidebarUnreadIndicatorSize / 2,
  },

  labelText: {
    display: 'none',
  },
})

const horizontalStyles = StyleSheet.create<
  { [P in keyof typeof verticalStyles]: ViewStyle | TextStyle | ImageStyle }
>({
  container: {
    width: '100%',
    minHeight: bottomBarHeight,
    zIndex: 1001,
  },

  contentContainer: {
    position: 'relative',
    flexDirection: 'row',
    width: '100%',
    height: bottomBarHeight,
    zIndex: 1001,
  },

  listContainer: {
    width: '100%',
    height: bottomBarHeight,
  },

  list: {
    width: '100%',
    height: bottomBarHeight,
  },

  hoverList: {
    display: 'none',
  },

  listContentContainer: {
    height: bottomBarHeight,
    zIndex: 1001,
  },

  itemPlaceholder: {
    width: bottomBarItemWidth,
  },

  itemContainer: {
    width: bottomBarItemWidth,
    height: bottomBarHeight,
    borderRadius: bottomBarItemWidth / 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  itemInnerContainer: {
    position: 'absolute',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: bottomBarItemWidth,
    height: bottomBarHeight,
  },

  itemInnerContainer__rounded: {
    borderRadius: bottomBarItemWidth / 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  itemInnerIconOrAvatarContainer: {
    position: 'relative',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: bottomBarItemWidth,
    height: sidebarAvatarSize,
  },

  hoverContent: {
    display: 'none',
  },

  avatar: {},

  icon: {
    fontSize: bottomBarIconSize,
  },

  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right:
      (bottomBarItemWidth - bottomBarIconSize) / 2 -
      bottomBarUnreadIndicatorSize / 2,
    width: bottomBarUnreadIndicatorSize,
    height: bottomBarUnreadIndicatorSize,
    borderWidth: 2,
    borderRadius: bottomBarUnreadIndicatorSize / 2,
  },

  labelText: {
    paddingHorizontal: 2,
    letterSpacing: -0.5,
    fontSize: bottomBarLabelSize,
    textAlign: 'center',
  },
})
