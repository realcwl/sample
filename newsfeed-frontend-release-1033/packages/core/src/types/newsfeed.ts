import { ThemeColors } from './themes'

// Although it seems unnecessary to do a one level indirect here, it gives us
// the extensability to expand this Column to be more than news feed. For
// example, in the future we might want to define a TrendingSearchColumn, and
// we could just expand Column to be
// export type Column =
// | NewsfeedColumn
// | TrendingSearchColumn;
export type Column = NewsFeedColumn

// Newsfeed column type.
export type NewsFeedColumnType = 'COLUMN_TYPE_NEWS_FEED'

// Visiblity of a feed, 'GLOBAL' means visible to all users across the website.
// PRIVATE by default.
export type FeedVisibility = 'GLOBAL' | 'PRIVATE'

// Each column extends the BaseColumn, where some common fields are defined.
export interface NewsFeedColumn extends BaseColumn {
  // Constant defined in another place.
  type: NewsFeedColumnType

  // column icon to render in SideOrBottomBar
  icon: {
    family: string
    name: string
  }

  // itemListIds is a list containing all Newsfeed data that are going to be
  // rendered inside this column. Only data ids are stored, the actual data
  // should be retrieved from the data reducer.
  //
  // !Note!: If this is updated, you should almost always update oldestItemId
  // and newestItemId.
  itemListIds: string[]
  // Id of the last item (oldest item) in this column. This should always be in
  // sync with itemListIds, otherwise column's state is broken.
  oldestItemId: string
  // Id of the first item (newest item) in this column. This should always be in
  // sync with itemListIds, otherwise column's state is broken.
  newestItemId: string

  // Each news column must also have multiple News Sources. Each source is
  // comprised of main type and subtype. E.g. (Weibo, <user_id>).
  sources: NewsFeedColumnSource[]

  // Each news column can have a data filter composed of a logical expression.
  // This is stored in the column so that it can pull new data with those
  // expression from backend. Note that frondend doesn't actually use this
  // expression, this expression is passed to backend as part of the pull
  // request, and backend filters data based on this expression.
  dataExpression?: NewsFeedDataExpressionWrapper

  // Different from NewsFeedDataExpression, filter is a purely frontend data
  // that is used to quickly filter column data to let user find useful
  // information.
  filters?: ColumnFilter

  // if creator != self, this is a feed shared by others and thus not editable
  creator?: User

  // Whethere this feed is publicly readable or private
  visibility: FeedVisibility

  // subscriberCount is the total subscribers to this feed (it is 1 if not shared b/c the current user is the only subscriber)
  subscriberCount: number

  // enable remote notification for mobile devices
  mobileNotification: boolean

  // first visible item id in column
  firstVisibleItemId?: string

  // last visible item id in column
  lastVisibleItemId?: string
}

export interface NewsFeedColumnSource {
  // Source is a predefined list of information sources, such as "weibo",
  // "twitter", "caixin".
  sourceId: string

  // Subtypes is a predefined list of subtypes of type string.
  subSourceIds: string[]
}

// Base column datastructure.
export interface BaseColumn {
  id: string

  // Title of the Column, user defined.
  title: string

  // Last update time in timestamp in micro seconds.
  updatedAt: string

  // timestamp of the last refresh in micro seconds.
  refreshedAt: string

  // the current state of the column.
  state: LoadState

  // ColumnOptions that can customize the behavior of a column.
  options: ColumnOptions
}

// Contains the actual news feed data expression.
export type NewsFeedDataExpression = AllOf | AnyOf | NotTrue | Predicate

// Wrap it up so we could achieve OneOf.
export interface NewsFeedDataExpressionWrapper {
  // id for this data expression, this is used to uniquely identity each
  // expression so that deletion of an expression can simply specify this id
  // without taking ownership of the parent. This id must be global unique so
  // that the deletion will not be dubious.
  id?: string

  // Expression can be any of the following:
  // 1. AnyOf
  // 2. AllOf
  // 3. NotTrue
  // 4. Predicate
  // 5. undefined. When this field is undefined, this is a very special type of
  // DataExpressionWrapper, where this wrapper is a place holder that should be
  // filled by a later expression created by user. We call this expression
  // Creator Expression.
  expr?: NewsFeedDataExpression
}

export interface LiteralPredicate {
  // PredicateType is a predefined list of string.
  type: 'LITERAL'
  // A PredicateParam is a predefined list of params matching the predicate.
  param?: { text: string }
}

// All possible predicates should be added as OR here.
// e.g. ... = LiteralPredicate | SourcePredicate
// All predicate must have type and params.
export type DataExpressionPredicate = LiteralPredicate

export interface Predicate {
  // The actual predicate that
  pred: DataExpressionPredicate
}

export interface AllOf {
  // AllOf contains a list of objects. A content is valid if all of the
  // expressions are evaluated to true.
  allOf: NewsFeedDataExpressionWrapper[]
}

export interface AnyOf {
  // AnyOf contains a list of objects. A content is valid if any of the
  // expression is evaluated to true.
  anyOf: NewsFeedDataExpressionWrapper[]
}

export interface NotTrue {
  // A content is valid if the expression is evaluated false.
  notTrue: NewsFeedDataExpressionWrapper
}

export interface ColumnFilter {
  // Render the data only when the content string.Contains(query).
  query?: string
  // Show only saved data.
  saved?: boolean
  // Show only unread data.
  unread?: boolean
  // more filters when needed...
}

// Identify key attribute of souce or sub source
export interface SourceOrSubSource {
  id: string
  name: string
  // Required for subsource, this leads to the sub source image.
  avatarURL?: string
  // profile URL leads to the home page.
  profileURL?: string
  state?: LoadState

  // record subsource's parent source id
  parentSourceId?: string
  // User's external id in the original website.
  externalId?: string

  customizedCrawlConfig?: CustomizedCrawlerSpec
}

export interface ColumnOptions {
  enableAppIconUnreadIndicator?: boolean
  notifyOnNewPosts?: boolean
}

export interface NewsFeedData {
  id: string
  // message shown to user.
  title?: string
  // message shown to user.
  text?: string
  // author info, aka subsource, ex. weibo/twitter users
  subSource?: SourceOrSubSource
  // if this is not null, user can click a card to go to original page.
  url?: string
  // A list of attachment that will be rendered together with this card.
  attachments?: Attachment[]
  // This is the timestamp of original post
  postTime?: string
  // We might not be able to get postTimestamp
  // in which case we use crawledTimestamp as alternative
  crawledTime?: string
  // It is a linked list of all repost/retweet
  repostedFrom?: NewsFeedData
  // When this field is a string,
  // which is the parent data ID, don't render it
  parentId?: string
  // cursor associated with this feed that backend uses.
  cursor: number
  // Indicate that whether this item is already saved by user.
  isSaved?: boolean
  // Indicate whether this card has been read by the user.
  isRead?: boolean
  // Semantic Hashing for this single data.
  semanticHashing?: string
  // All data that are semantically duplicated with this data, stored by id.
  duplicateIds?: string[]
  // Set to true if the duplication tray are all read.
  isDuplicationRead?: boolean
  // tags indicating Feed content
  tags?: string[]
  // Ordered thread this data is *replying to*, by NewsFeedData it self.
  thread?: NewsFeedData[]
}

export interface Attachment {
  id: string
  dataType: 'img' | 'file' | 'other'
  name?: string
  url: string
}

export interface User {
  // User's id, used when retrieving personalized content (e.g. User's sharing)
  id: string

  // User name, created during the account creation process.
  name: string

  // User's email address, used for login.
  email: string

  // User's avartar. If not provided we'll use a random default icon.
  avatarUrl?: string
}

export type ModalPayload =
  | {
      name: 'ADD_COLUMN'
      params?: undefined
    }
  | {
      name: 'ADD_COLUMN_DETAILS'
      params?: {
        // If columnId is provided, it means we're modifying existing column's
        // attribute. In this case, the existing settings should be rendered by
        // default.
        columnId: string
      }
    }
  | {
      name: 'ADVANCED_SETTINGS'
      params?: undefined
    }
  | {
      name: 'KEYBOARD_SHORTCUTS'
      params?: undefined
    }
  | {
      name: 'SETTINGS'
      params?: undefined
    }

export interface HeaderDetails {
  avatarProps?: { imageURL: string; linkURL: string }
  icon?: GenericIconProp
  subtitle?: string
  title: string
}

export type ModalPayloadWithIndex = ModalPayload & { index: number }

export type LoadState = 'error' | 'loaded' | 'loading' | 'not_loaded'

export type EnhancedLoadState = LoadState | 'loading_first' | 'loading_more'

export type EnhancementCache = Map<
  string,
  false | { timestamp: number; data: any }
>

export type AppViewMode = 'single-column' | 'multi-column'

export type BannerType =
  | 'BANNER_TYPE_ERROR'
  | 'BANNER_TYPE_SUCCESS'
  | 'BANNER_TYPE_MESSAGE'
export type BannerId = 'fail_initial_connection' | 'clipboard'

export interface BannerMessage {
  // Uniquely identifies a banner
  id: BannerId

  // banner type, which determines the banner style. E.g. Error type will have
  // red background, while promo banner will have normal background.
  type: BannerType

  // What to show in the banner
  message: string

  // If provided, the banner is clickable
  href?: string

  // If provided, banners with the same signature will be collapsed and show
  // only one. Otherwise default signature will be used: "${id}#${type}"
  signature?: string

  // if set to true, banner will be automatically closed after 3 seconds. Most
  // error banner should set this to true, while promo banner we want user to
  // explicitly close it.
  autoClose: boolean

  openOnNewTab?: boolean
  disableOnSmallScreens?: boolean
  minLoginCount?: number

  // TODO(chenweilunster): The original devhub uses this field to perform "soft"
  // deletion and log it for analysis, we should reconsider whether this field
  // is neccessary or not since closure in the new implementation is simply
  // a removal from the banner array.
  closedAt?: string | undefined
  createdAt?: string
}

export interface ItemFilterCountMetadata {
  read: 0
  unread: 0
  saved: 0
  total: 0
}

export type DesktopOS = 'macos' | 'windows' | 'linux'
export type MobileOS = 'ios' | 'android'
export type OS = DesktopOS | MobileOS

export interface ItemPushNotification<
  A extends { type: string; payload: any } = { type: string; payload: any },
> {
  title: string
  subtitle?: string
  body: string
  imageURL?: string
  onClickDispatchAction?: A
}

export interface GenericIconProp {
  family: string
  name: string
  color?: keyof ThemeColors
}

export interface AddColumnDetailsPayload {
  // Title of the sub option.
  title: string

  // Identifies a single icon for the column details.
  icon: GenericIconProp

  // FeedId of shared feeds
  columnId?: string
}

// Identifies a single column creation activity. For not it only extends
// NewsFeedColumn but in the future there can be multiple column types.
export type GenericColumnCreation<ColumnType extends NewsFeedColumn> = Omit<
  ColumnType,
  'createdAt' | 'updatedAt' | 'refreshedAt'
> & {
  isUpdate?: boolean
  subscribeOnly?: boolean
  createdAt?: string
  updatedAt?: string
}

// Identifies a column creation activity for a news feed column.
export type NewsFeedColumnCreation = GenericColumnCreation<NewsFeedColumn>

// Identifies a Column Creation, in the future there can be multiple Column
// creation types.
export type ColumnCreation = NewsFeedColumnCreation

// SeedState is defined in https://concise-worm-036.notion.site/Sync-Up-Down-fdde83e019b540a1ba1b6af8125b7814
// Where it represents the core data structure of the App. This should match
// the definition on the server side.
export interface SeedState {
  userSeedState: UserSeedState
  feedSeedState: FeedSeedState[]
}

export interface UserSeedState {
  id: string
  name: string
  avatarUrl: string
}

export interface FeedSeedState {
  id: string
  name: string
}

export type SignalType = 'SEED_STATE' | 'SET_ITEMS_READ_STATUS'

export interface Signal {
  signalType: SignalType
  signalPayload: string
}

export interface TryCustomizedCrawlerPost {
  // Source is a predefined list of information sources, such as "weibo",
  // "twitter", "caixin".
  title: string

  // Subtypes is a predefined list of subtypes of type string.
  content: string

  images: string[]

  baseHtml: string

  originUrl: string
}

export interface CustomizedCrawlerSpec {
  startUrl: string
  base: string
  title: string
  content: string
  externalId: string
  time: string
  image: string
  postUrl: string
  postUrlIsRelativePath: boolean
}
