import _ from 'lodash'
import moment, { MomentInput } from 'moment'
import { Column, ColumnOptions } from '..'
import { SourceOrSubSource } from '..'
import { NewsFeedData } from '../types'
import {
  SIMILARITY_THRESHOLD,
  SIMILARITY_WINDOW_MILLISECOND,
} from '../utils/constants'

export function capitalize(str: string) {
  return str.toLowerCase().replace(/^.| ./g, _.toUpper)
}

export function capitalizeFirstLetter(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

export function memoizeMultipleArgs<FN extends (...args: any[]) => any>(
  fn: FN,
): FN {
  return _.memoize(fn, (...args) => JSON.stringify(args))
}

// Randomly generate a ID, which could be assigned to ColumnId or DataId
export function guid() {
  const str4 = () =>
    (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1) // eslint-disable-line
  return `${
    str4() + str4()
  }-${str4()}-${str4()}-${str4()}-${str4()}${str4()}${str4()}`
}

export function isNight() {
  const hours = new Date().getHours()
  return hours >= 18 || hours < 6
}

export function getFullDateText(date: MomentInput) {
  if (!date) return ''

  const momentDate = moment(date)
  if (!momentDate.isValid()) return ''

  return momentDate.format('llll')
}

export function getDateSmallText(
  date: MomentInput,
  {
    includeExactTime = false,

    pastPrefix = '',
    pastSuffix = '',
    showPrefixOnFullDate = false,

    futurePrefix = '',
    futureSuffix = '',
    showSuffixOnFullDate = false,
  } = {
    futurePrefix: 'in',
  },
) {
  if (!date) return ''

  const momentDate = moment(date)
  if (!momentDate.isValid()) return ''

  const momentNow = moment(new Date())
  const timeText = momentDate.format('HH:mm')

  const _secondsDiff = momentNow.diff(momentDate, 'seconds')
  const isInFuture = _secondsDiff < 0
  const prefix =
    (isInFuture
      ? futurePrefix && `${futurePrefix} `
      : pastPrefix && `${pastPrefix} `) || ''
  const suffix =
    (isInFuture
      ? futureSuffix && ` ${futureSuffix}`
      : pastSuffix && ` ${pastSuffix}`) || ''
  const fullDatePrefix = showPrefixOnFullDate ? prefix : ''
  const fullDateSuffix = showSuffixOnFullDate ? suffix : ''

  const secondsDiff = Math.abs(_secondsDiff)
  const minutesDiff = Math.abs(momentNow.diff(momentDate, 'minutes'))
  const hoursDiff = Math.abs(
    momentNow.diff(momentDate, 'minutes') >= 60
      ? Math.round(secondsDiff / (60 * 60))
      : Math.floor(secondsDiff / (60 * 60)),
  )
  const daysDiff = Math.abs(
    momentNow.diff(momentDate, 'hours') >= 24
      ? Math.round(secondsDiff / (24 * 60 * 60))
      : Math.floor(secondsDiff / (24 * 60 * 60)),
  )

  if (daysDiff < 1) {
    if (hoursDiff < 1) {
      if (minutesDiff < 1) {
        if (secondsDiff <= 1) {
          return `${fullDatePrefix}now${fullDateSuffix}`
        }

        return `${prefix}${secondsDiff}s${suffix}`
      }

      return `${prefix}${minutesDiff}m${suffix}${
        includeExactTime ? ` (${timeText})` : ''
      }`
    }

    return `${prefix}${hoursDiff}h${suffix}${
      includeExactTime ? ` (${timeText})` : ''
    }`
  }

  if (momentDate.year() !== moment().year()) {
    return `${fullDatePrefix}${momentDate.format(
      'YYYY-M-D hh:mm',
    )}${fullDateSuffix}`
  }

  return `${fullDatePrefix}${momentDate.format('M-D hh:mm')}${fullDateSuffix}`
}

// sizes will be multiples of 50 for caching (e.g 50, 100, 150, ...)
export function getSteppedSize(
  size: number | undefined,
  sizeSteps: number | undefined = 50,
  getPixelSizeForLayoutSizeFn: ((size: number) => number) | undefined,
) {
  const steppedSize =
    typeof size === 'number'
      ? sizeSteps * Math.max(1, Math.ceil(size / sizeSteps))
      : sizeSteps

  return getPixelSizeForLayoutSizeFn
    ? getPixelSizeForLayoutSizeFn(steppedSize)
    : steppedSize
}

export function randomBetween(minNumber: number, maxNumber: number) {
  return Math.floor(Math.random() * maxNumber) + minNumber
}

export function trimNewLinesAndSpaces(text?: string, maxLength = 120) {
  if (!text || typeof text !== 'string') return ''

  let newText = text.replace(/\s+/g, ' ').trim()
  if (maxLength > 0 && newText.length > maxLength) {
    newText = `${newText.substr(0, maxLength).trim()}...`
  }

  return newText
}

export function deepMapper<T extends object, R = T>(
  obj: T,
  mapper: (obj: T) => any,
): R {
  if (!(obj && _.isPlainObject(obj))) return obj as any

  return mapper(
    _.mapValues(obj, (v) =>
      _.isPlainObject(v) ? deepMapper(v as any, mapper) : v,
    ) as any,
  )
}

const urlsToKeep = ['url', 'html_url', 'avatar_url', 'latest_comment_url']
export function removeUselessURLsFromResponseItem<
  T extends Record<string, any>,
>(item: T) {
  let hasChanged = false
  const result = deepMapper(item, (obj) => {
    const keys = Object.keys(obj)

    keys.forEach((key) => {
      if (!(key && typeof key === 'string')) return
      if (
        !(key.includes('_url') || key.includes('_link') || key.includes('href'))
      )
        return

      if (!urlsToKeep.includes(key)) {
        hasChanged = true
        delete (obj as any)[key]
      }
    })

    return obj
  })

  if (!hasChanged) return item
  return result
}

// Modified version of: https://github.com/stiang/remove-markdown
// License: MIT
export function stripMarkdown(
  md: string,
  _options?: {
    listUnicodeChar?: boolean
    stripListLeaders?: boolean
    githubFlavoredMarkdown?: boolean
    useImgAltText?: boolean
  },
) {
  if (!(md && typeof md === 'string')) return ''

  const options = _options || {}

  options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar')
    ? options.listUnicodeChar
    : false

  options.stripListLeaders = options.hasOwnProperty('stripListLeaders')
    ? options.stripListLeaders
    : true

  options.githubFlavoredMarkdown = options.hasOwnProperty('gfm')
    ? options.githubFlavoredMarkdown
    : true

  options.useImgAltText = options.hasOwnProperty('useImgAltText')
    ? options.useImgAltText
    : true

  let output = md || ''

  // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
  output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, '')

  try {
    if (options.stripListLeaders) {
      if (options.listUnicodeChar)
        output = output.replace(
          /^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm,
          `${options.listUnicodeChar} $1`,
        )
      else output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1')
    }
    if (options.githubFlavoredMarkdown) {
      output = output
        // Header
        .replace(/\n={2,}/g, '\n')
        // Fenced codeblocks
        .replace(/~{3}.*\n/g, '')
        // Strikethrough
        .replace(/~~/g, '')
        // Fenced codeblocks
        .replace(/`{3}.*\n/g, '')
    }
    output = output
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove Comments
      .replace(/<[^>]*>/g, '')
      .replace(/\>(.*)([\r\n]+|$)/g, '')
      // Remove setext-style headers
      .replace(/^[=\-]{2,}\s*$/g, '')
      // Remove footnotes?
      .replace(/\[\^.+?\](\: .*?$)?/g, '')
      .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
      // Remove images
      .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
      // Remove inline links
      .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1')
      // Remove blockquotes
      .replace(/^\s{0,3}>\s?/g, '')
      // Remove reference-style links?
      .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
      // Remove atx-style headers
      .replace(
        /^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm,
        '$1$2$3',
      )
      // Remove emphasis (repeat the line to remove double emphasis)
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
      .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
      // Remove code blocks
      .replace(/(`{3,})(.*?)\1/gm, '$2')
      // Remove inline code
      .replace(/`(.+?)`/g, '$1')
      .replace(/`/g, '')
      // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
      .replace(/\n{2,}/g, '\n\n')
  } catch (e) {
    console.error(e)
    return md
  }
  return output
}

export function normalizeUsername(username: string | undefined) {
  if (!username || typeof username !== 'string') return undefined
  return username.trim().toLowerCase()
}

export function convertObjectKeysToCamelCase<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  return _.mapKeys(obj, (_value, key) => _.camelCase(key))
}

export function genericGitHubResponseMapper(
  response: Record<string, any> | undefined,
): Record<string, any> | undefined {
  if (!(response && _.isPlainObject(response))) return response

  return _.mapValues(convertObjectKeysToCamelCase(response), (obj) => {
    if (_.isPlainObject(obj)) return genericGitHubResponseMapper(obj)
    return obj
  })
}

export function intercalateWithArray<T extends any[], U>(arr: T, separator: U) {
  return _.flatMap(arr, (item, index) =>
    index === 0 ? item : [separator, item],
  )
}

export function getSearchQueryFromFilter(): string {
  return ''
}

export function getQueryStringFromQueryTerms(
  queryTerms: ([string, boolean] | [string, string, boolean])[],
) {
  let query = ''
  queryTerms.forEach((queryTerm) => {
    if (!queryTerm) return

    if (queryTerm.length === 2) {
      const [q, isNegated] = queryTerm
      query = `${query.trim()} ${isNegated ? '-' : ''}${q}`.trim()
    } else if (queryTerm.length === 3) {
      const [k, v, isNegated] = queryTerm
      query = `${query.trim()} ${isNegated ? '-' : ''}${k}:${v}`.trim()
    }
  })

  return query
}

export function getSearchQueryTerms(
  query: string | undefined,
): ([string, boolean] | [string, string, boolean])[] {
  if (!(query && typeof query === 'string')) return []

  const result: ([string, boolean] | [string, string, boolean])[] = []

  const q = query.trim()

  // TODO: Fix regex with backslash
  // ;(q.match(/("-?([^\\][^"])+")/g) || []).forEach((str, index) => {
  //   if (!str) return
  //   q = q.replace(str, '')
  //   strings.push(str.trim())
  // })
  ;(
    q.match(
      /((-|NOT )?[a-zA-Z]+:"[^"]+")|((-|NOT )?[a-zA-Z]+:[^ \n$]+)|((-|NOT )?"[^"]+")|(-|NOT )?([^ $]+)/gi,
    ) || []
  ).forEach((_queryItem) => {
    if (!_queryItem) return

    const queryItem = _queryItem.replace(/^(^|\s)NOT(\s)/gi, '$1-')

    const [_keyOrValue, ..._values] =
      queryItem[0] === '"' || (queryItem[0] === '-' && queryItem[1] === '"')
        ? [queryItem]
        : queryItem.split(':')

    const isNegated = !!(_keyOrValue && _keyOrValue[0] === '-')
    const keyOrValue = (_keyOrValue || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .slice(isNegated ? 1 : 0)
    const value = _values.join(':').replace(/\s+/g, ' ').trim().toLowerCase()

    function handleValue(v: string) {
      if (keyOrValue && !v) {
        result.push([keyOrValue, isNegated])
      } else if (keyOrValue && v) {
        result.push([keyOrValue, v, isNegated])
      }
    }

    // handle queries with comma, like: owner:facebook,styled-components
    // by splitting them into: owner:facebook owner:styled-components
    if (
      keyOrValue &&
      value &&
      !value.startsWith('"') &&
      value.split(',').length > 1
    ) {
      value.split(',').map((subItem) => subItem && handleValue(subItem.trim()))
    } else {
      handleValue(value)
    }
  })

  return result
}

export function fixDateToISO(
  date: Date | number | string | undefined | null,
): string | undefined {
  if (!date) return undefined

  let _date = date
  if (typeof _date === 'string') _date = new Date(_date)

  let timestamp: number | null = null
  if (_date instanceof Date) timestamp = _date.getTime()
  if (typeof _date === 'number') timestamp = _date
  if (timestamp && timestamp.toString().length <= 10)
    timestamp = timestamp * 1000 + new Date().getTimezoneOffset() * 60 * 1000
  if (date && typeof date === 'string' && !date.includes('Z') && timestamp)
    timestamp = timestamp + new Date().getTimezoneOffset() * 60 * 1000

  if (!(timestamp && timestamp.toString().length >= 13)) return undefined

  return new Date(timestamp).toISOString()
}
// new Date(new Date('2019-11-24 22:48:21').getTime() + (new Date().getTimezoneOffset() * 60 * 1000))

export function addDashesToString(str: string | undefined, addDashEvery = 0) {
  if (!(str && typeof str === 'string')) return undefined
  if (!(addDashEvery && addDashEvery >= 1)) return str

  return str
    .split('')
    .reduce<string[]>((arr, char) => {
      if (arr.length && arr[arr.length - 1].length < addDashEvery) {
        arr[arr.length - 1] += `${char}`
        return arr
      }

      return [...arr, char]
    }, [])
    .join('-')
}

export function getColumnOption<O extends keyof ColumnOptions>(
  column: Column,
  option: O,
): ColumnOptions[O] {
  return column.options && column.options[option]
}

// Converts from id to actual naming within a source. If we could find a mapping
// inside the provided naming map, convert it to the actual naming, otherwise
// just use id for rendering.
export function mapSourceIdToName(
  id: string,
  idToSubSourceMap: Record<string, SourceOrSubSource>,
): string {
  return idToSubSourceMap[id].name || id
}

export function mapSourceIdToExternalId(
  id: string,
  idToSubSourceMap: Record<string, SourceOrSubSource>,
): string {
  return idToSubSourceMap[id].externalId || ''
}

// Return true if 2 hash string are semantically identical.
export function isHashingSemanticallyIdentical(
  h1: string,
  h2: string,
): boolean {
  // If the hashing is invalid, or not of same length, they cannot be considered
  // as the semantically identical.
  if (!h1 || !h2 || h1.length != h2.length) {
    return false
  }

  // Calculate hamming distance by counting how many different bits in total.
  let count = 0
  for (let idx = 0; idx < h1.length; idx++) {
    if (h1[idx] != h2[idx]) count++
  }

  return count <= SIMILARITY_THRESHOLD
}

// 2 data are considered as duplicate if they are roughly posted at the same
// time and have semantically identical hashing.
export function isNewsFeedDataSemanticallyIdentical(
  lhs: NewsFeedData,
  rhs: NewsFeedData,
): boolean {
  if (
    !lhs.postTime ||
    !rhs.postTime ||
    !lhs.semanticHashing ||
    !rhs.semanticHashing
  ) {
    return false
  }
  const lhsTs = Date.parse(lhs.postTime)
  const rhsTs = Date.parse(rhs.postTime)
  if (Math.abs(lhsTs - rhsTs) > SIMILARITY_WINDOW_MILLISECOND) {
    return false
  }
  return isHashingSemanticallyIdentical(
    lhs.semanticHashing,
    rhs.semanticHashing,
  )
}
