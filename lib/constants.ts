export const LANGS = [
  { c: 'ko', n: '한국어', f: '🇰🇷' },
  { c: 'en', n: 'English', f: '🇺🇸' },
  { c: 'ja', n: '日本語', f: '🇯🇵' },
  { c: 'zh', n: '中文', f: '🇨🇳' },
  { c: 'es', n: 'Español', f: '🇪🇸' },
  { c: 'fr', n: 'Français', f: '🇫🇷' },
  { c: 'de', n: 'Deutsch', f: '🇩🇪' },
  { c: 'pt', n: 'Português', f: '🇧🇷' },
]

export const GENRES = [
  { id: 'adventure', l: '모험', i: 'ti-mountain' },
  { id: 'romance', l: '로맨스', i: 'ti-heart' },
  { id: 'mystery', l: '미스터리', i: 'ti-search' },
  { id: 'scifi', l: 'SF', i: 'ti-rocket' },
  { id: 'fantasy', l: '판타지', i: 'ti-wand' },
  { id: 'slice', l: '일상', i: 'ti-home' },
  { id: 'horror', l: '호러', i: 'ti-ghost' },
  { id: 'history', l: '역사', i: 'ti-building' },
]

export type WordInfo = {
  word: string
  pron?: string
  meaning: string
  example?: string
}

export type Sentence = {
  text: string
  tr: string
}

export type Paragraph = {
  sentences: Sentence[]
  words: WordInfo[]
}

export type Book = {
  title: string
  titleTr: string
  level: string
  genreLabel: string
  paragraphs: Paragraph[]
}

export type Bookmark = {
  key: string
  para: number
  text: string
  tr: string
}

export type AppState = {
  native: string | null
  target: string | null
  genres: string[]
  keywords: string[]
  book: Book | null
  para: number
  vocab: WordInfo[]
  bookmarks: Bookmark[]
}
