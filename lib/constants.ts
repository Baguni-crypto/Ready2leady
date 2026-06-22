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

export const LEVELS = [
  { id: 'beginner', l: '입문', desc: '알파벳/기초 단어 수준', icon: '🌱' },
  { id: 'elementary', l: '초급', desc: '간단한 문장 이해 가능', icon: '🌿' },
  { id: 'intermediate', l: '중급', desc: '일상 대화 가능', icon: '🌳' },
  { id: 'advanced', l: '고급', desc: '복잡한 표현도 이해', icon: '🏔️' },
]

export const THEMES = [
  { id: 'fairy', l: '동화 스타일', desc: '마법, 동물, 판타지 세계', icon: '🧚' },
  { id: 'youth', l: '학교, 우정, 모험', desc: '성장과 친구들의 이야기', icon: '🏫' },
  { id: 'young_adult', l: '대학, 여행, 자기계발', desc: '새로운 시작과 자아 탐색', icon: '🎒' },
  { id: 'adult_life', l: '직장, 관계, 성장', desc: '현실적인 어른의 이야기', icon: '💼' },
  { id: 'family', l: '삶, 가족, 커리어', desc: '일과 삶의 균형', icon: '🏡' },
  { id: 'life_exp', l: '인생경험, 문화, 여행', desc: '세상을 넓히는 경험들', icon: '🌍' },
]

export const LENGTH_OPTIONS = [
  { id: 'short', l: '짧은 이야기', pages: 10, desc: '10페이지 · 약 10분', icon: '📖' },
  { id: 'medium', l: '보통 이야기', pages: 20, desc: '20페이지 · 약 20분', icon: '📚' },
  { id: 'long', l: '긴 이야기', pages: 30, desc: '30페이지 · 약 30분', icon: '📕' },
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
  id: string
  title: string
  titleTr: string
  level: string
  genreLabel: string
  theme: string
  totalPages: number
  paragraphs: Paragraph[]
  createdAt: number
  completedAt?: number
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
  level: string | null
  theme: string | null
  genres: string[]
  storyPrompt: string
  length: string | null
  currentBook: Book | null
  para: number
  vocab: WordInfo[]
  bookmarks: Bookmark[]
  bookshelf: Book[]
  levelCheckPassed: boolean
}
