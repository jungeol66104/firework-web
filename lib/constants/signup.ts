// Signup platform options - how users heard about the service
// Keys are stored in database, values are displayed in UI

export const SIGNUP_PLATFORMS = {
  naver_search: '네이버 검색',
  naver_blog: '네이버 블로그',
  naver_cafe: '네이버 카페',
  google: '구글',
  sumgo: '숨고',
  instagram: '인스타그램',
  youtube: '유튜브',
  kakaotalk: '카카오톡',
  facebook: '페이스북',
  referral: '지인 추천',
  other: '기타'
} as const

export type SignupPlatformKey = keyof typeof SIGNUP_PLATFORMS
export type SignupPlatformLabel = typeof SIGNUP_PLATFORMS[SignupPlatformKey]

// Array of platform options for dropdown (in order)
export const SIGNUP_PLATFORM_OPTIONS = Object.entries(SIGNUP_PLATFORMS).map(
  ([key, label]) => ({ key, label })
)
