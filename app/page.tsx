'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LANGS, GENRES, WordInfo, Book, Bookmark, AppState } from '@/lib/constants'

const SK = 'leady_v1'

const defaultState: AppState = {
  native: null, target: null, genres: [], keywords: [],
  book: null, para: 0, vocab: [], bookmarks: [],
}

function loadState(): AppState {
  try {
    const d = localStorage.getItem(SK)
    if (d) return { ...defaultState, ...JSON.parse(d) }
  } catch {}
  return { ...defaultState }
}

type Screen = 'lang' | 'genre' | 'loading' | 'read' | 'vocab' | 'quiz' | 'bookmarks'

export default function Home() {
  const [S, setS] = useState<AppState>(defaultState)
  const [screen, setScreen] = useState<Screen>('lang')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [quizDeck, setQuizDeck] = useState<WordInfo[]>([])
  const [qOk, setQOk] = useState(0)
  const [qNo, setQNo] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showAnswerBtns, setShowAnswerBtns] = useState(false)

  useEffect(() => {
    const loaded = loadState()
    setS(loaded)
    if (loaded.book) setScreen('read')
  }, [])

  const save = useCallback((next: AppState) => {
    setS(next)
    try { localStorage.setItem(SK, JSON.stringify(next)) } catch {}
  }, [])

  const goTo = (s: Screen) => setScreen(s)

  // ── Lang screen ──────────────────────────────────────────
  const selLang = (type: 'native' | 'target', code: string) => {
    save({ ...S, [type]: code })
  }

  // ── Genre screen ─────────────────────────────────────────
  const toggleGenre = (id: string) => {
    const genres = S.genres.includes(id) ? S.genres.filter(g => g !== id) : [...S.genres, id]
    save({ ...S, genres })
  }
  const addKw = (kw: string) => {
    if (!kw || S.keywords.includes(kw)) return
    save({ ...S, keywords: [...S.keywords, kw] })
  }
  const rmKw = (kw: string) => save({ ...S, keywords: S.keywords.filter(k => k !== kw) })

  // ── Generate ──────────────────────────────────────────────
  const genBook = async () => {
    setLoadErr(null)
    goTo('loading')
    const nl = LANGS.find(l => l.c === S.native)?.n || S.native || ''
    const tl = LANGS.find(l => l.c === S.target)?.n || S.target || ''
    const genreLabels = S.genres.map(id => GENRES.find(g => g.id === id)?.l || id).join(', ')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nativeLang: nl, targetLang: tl, genreLabels, keywords: S.keywords })
      })
      if (!res.ok) {
        const e = await res.json()
        setLoadErr(e.error || `서버 오류 (${res.status})`)
        return
      }
      const book: Book = await res.json()
      if (!book.paragraphs?.length) { setLoadErr('이야기 생성 실패. 다시 시도해주세요.'); return }
      save({ ...S, book, para: 0 })
      goTo('read')
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : String(e))
    }
  }

  // ── Vocab / Bookmark ──────────────────────────────────────
  const saveWord = (w: WordInfo) => {
    if (S.vocab.find(v => v.word === w.word)) return
    save({ ...S, vocab: [...S.vocab, w] })
  }
  const rmWord = (word: string) => save({ ...S, vocab: S.vocab.filter(v => v.word !== word) })
  const toggleBm = (key: string, text: string, tr: string, para: number) => {
    const exists = S.bookmarks.find(b => b.key === key)
    const bookmarks = exists
      ? S.bookmarks.filter(b => b.key !== key)
      : [...S.bookmarks, { key, para, text, tr }]
    save({ ...S, bookmarks })
  }
  const rmBm = (key: string) => save({ ...S, bookmarks: S.bookmarks.filter(b => b.key !== key) })

  // ── Quiz ──────────────────────────────────────────────────
  const startQuiz = () => {
    const deck = [...S.vocab].sort(() => Math.random() - .5)
    setQuizDeck(deck); setQOk(0); setQNo(0); setFlipped(false); setShowAnswerBtns(false)
    goTo('quiz')
  }
  const flipCard = () => {
    if (flipped) return
    setFlipped(true)
    setTimeout(() => setShowAnswerBtns(true), 380)
  }
  const answerCard = (ok: boolean) => {
    if (ok) setQOk(p => p + 1); else setQNo(p => p + 1)
    setQuizDeck(d => d.slice(1))
    setFlipped(false); setShowAnswerBtns(false)
  }

  const nativeLang = LANGS.find(l => l.c === S.native)
  const targetLang = LANGS.find(l => l.c === S.target)
  const canProceed = S.native && S.target && S.native !== S.target
  const canGen = S.genres.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-sm">

        {/* ── LANG SCREEN ── */}
        {screen === 'lang' && (
          <div className="p-5">
            <Logo />
            <StepDots current={0} />
            <h1 className="text-xl font-medium mb-1">내 언어 선택</h1>
            <p className="text-sm text-gray-500 mb-4">평소에 사용하는 언어를 선택해주세요</p>
            <LangGrid selected={S.native} onSelect={c => selLang('native', c)} exclude={S.target} />
            <hr className="my-4 border-gray-100" />
            <h2 className="text-base font-medium mb-3">배우고 싶은 언어</h2>
            <LangGrid selected={S.target} onSelect={c => selLang('target', c)} exclude={S.native} />
            <div className="flex justify-end mt-4">
              <button
                disabled={!canProceed}
                onClick={() => goTo('genre')}
                className="btn-primary disabled:opacity-40"
              >
                다음 <i className="ti ti-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {/* ── GENRE SCREEN ── */}
        {screen === 'genre' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <BackBtn onClick={() => goTo('lang')} />
              <h1 className="text-xl font-medium">장르 &amp; 키워드</h1>
            </div>
            <StepDots current={1} />
            <p className="text-sm text-gray-500 mb-3">장르를 여러 개 선택할수록 독특한 이야기가 만들어져요!</p>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">장르 선택 (복수 선택 가능)</div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {GENRES.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${S.genres.includes(g.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {S.genres.includes(g.id) && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <i className="ti ti-check text-white" style={{ fontSize: 8 }} />
                    </span>
                  )}
                  <i className={`ti ${g.i} text-lg`} />
                  {g.l}
                </button>
              ))}
            </div>
            {S.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs text-gray-400 self-center">선택됨:</span>
                {S.genres.map(id => {
                  const g = GENRES.find(x => x.id === id)!
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      <i className={`ti ${g.i}`} style={{ fontSize: 11 }} /> {g.l}
                      <button onClick={() => toggleGenre(id)} className="ml-0.5 text-emerald-600 hover:text-emerald-900">×</button>
                    </span>
                  )
                })}
              </div>
            )}
            <hr className="my-3 border-gray-100" />
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">키워드 추가 (선택)</div>
            <KeywordInput onAdd={addKw} />
            <div className="flex flex-wrap gap-1.5 min-h-6 mb-4">
              {S.keywords.map(k => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {k}<button onClick={() => rmKw(k)} className="text-blue-500 hover:text-blue-800">×</button>
                </span>
              ))}
            </div>
            <div className="flex justify-end">
              <button disabled={!canGen} onClick={genBook} className="btn-primary disabled:opacity-40">
                AI로 책 만들기 <i className="ti ti-sparkles" />
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING SCREEN ── */}
        {screen === 'loading' && (
          <div className="p-5">
            <Logo />
            <StepDots current={2} />
            {!loadErr ? (
              <div className="border border-gray-100 rounded-2xl p-10 text-center bg-gray-50">
                <div className="flex justify-center gap-1.5 mb-4">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
                <h3 className="font-medium mb-2">AI가 책을 만들고 있어요...</h3>
                <p className="text-sm text-gray-500">선택한 장르와 키워드를 바탕으로<br />맞춤형 이야기를 생성 중입니다</p>
              </div>
            ) : (
              <div className="border border-red-200 rounded-2xl p-5 bg-red-50">
                <h3 className="font-medium text-red-700 mb-1 flex items-center gap-1">
                  <i className="ti ti-alert-circle" /> 생성 실패
                </h3>
                <p className="text-sm text-red-600 mb-3">{loadErr}</p>
                <div className="flex gap-2">
                  <button onClick={genBook} className="btn-primary text-sm">
                    <i className="ti ti-refresh" /> 다시 시도
                  </button>
                  <button onClick={() => goTo('genre')} className="btn-secondary text-sm">
                    <i className="ti ti-arrow-left" /> 돌아가기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── READ SCREEN ── */}
        {screen === 'read' && S.book && (
          <ReadScreen
            S={S}
            nativeLang={nativeLang}
            targetLang={targetLang}
            onBack={() => goTo('genre')}
            onVocab={() => goTo('vocab')}
            onQuiz={startQuiz}
            onBm={() => goTo('bookmarks')}
            onSaveWord={saveWord}
            onToggleBm={toggleBm}
            onChPara={(d) => save({ ...S, para: Math.max(0, Math.min((S.book!.paragraphs.length - 1), S.para + d)) })}
          />
        )}

        {/* ── VOCAB SCREEN ── */}
        {screen === 'vocab' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo('read')} />
              <h2 className="text-lg font-medium">내 단어장</h2>
              <div className="flex-1" />
              {S.vocab.length > 0 && <span className="text-xs text-gray-400">{S.vocab.length}개</span>}
            </div>
            {S.vocab.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <i className="ti ti-book-off text-3xl block mb-2" />
                아직 저장된 단어가 없어요.<br />단어를 클릭해서 저장해보세요.
              </div>
            ) : (
              <>
                <button onClick={startQuiz} className="btn-primary w-full mb-4 justify-center">
                  <i className="ti ti-cards" /> 퀴즈 시작하기
                </button>
                <div className="flex flex-col gap-2">
                  {S.vocab.map(v => (
                    <div key={v.word} className="border border-gray-100 rounded-xl p-3 flex justify-between items-start gap-3">
                      <div>
                        <div className="font-medium text-emerald-600 text-sm">
                          {v.word} {v.pron && <span className="text-gray-400 font-normal text-xs">[{v.pron}]</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{v.meaning}</div>
                        {v.example && <div className="text-xs text-gray-400 italic mt-1">{v.example}</div>}
                      </div>
                      <button onClick={() => rmWord(v.word)} className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5">
                        <i className="ti ti-trash text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── QUIZ SCREEN ── */}
        {screen === 'quiz' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo('vocab')} />
              <h2 className="text-lg font-medium">플래시카드 퀴즈</h2>
            </div>
            {S.vocab.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <i className="ti ti-cards text-3xl block mb-2" />
                단어장에 단어를 저장하면<br />퀴즈를 시작할 수 있어요!
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {[{n: qOk, l: '알아요', c: 'text-emerald-600'},{n: quizDeck.length, l: '남은 카드', c: 'text-gray-700'},{n: qNo, l: '모르겠어요', c: 'text-red-500'}].map(s => (
                    <div key={s.l} className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                      <div className={`text-2xl font-medium ${s.c}`}>{s.n}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-100 rounded-full h-1 mb-4 overflow-hidden">
                  <div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${(qOk+qNo)/(qOk+qNo+quizDeck.length)*100||0}%` }} />
                </div>
                {quizDeck.length > 0 ? (
                  <>
                    <div className="fc-card mb-4" style={{ height: 180 }}>
                      <div className={`fc-inner w-full ${flipped ? 'flipped' : ''}`} style={{ height: 180 }}>
                        <div className="fc-front border border-gray-200 cursor-pointer" onClick={flipCard}>
                          <div className="text-2xl font-medium text-emerald-600 mb-1">{quizDeck[0]?.word}</div>
                          {quizDeck[0]?.pron && <div className="text-sm text-gray-400 italic mb-1">{quizDeck[0].pron}</div>}
                          <div className="text-xs text-gray-400">탭해서 뜻 확인</div>
                        </div>
                        <div className="fc-back">
                          <div className="text-xl font-medium text-emerald-700 mb-2 text-center">{quizDeck[0]?.meaning}</div>
                          {quizDeck[0]?.example && <div className="text-xs text-emerald-800 text-center leading-relaxed">{quizDeck[0].example}</div>}
                        </div>
                      </div>
                    </div>
                    {showAnswerBtns && (
                      <div className="flex gap-2">
                        <button onClick={() => answerCard(false)} className="flex-1 btn-danger justify-center">
                          <i className="ti ti-x" /> 모르겠어요
                        </button>
                        <button onClick={() => answerCard(true)} className="flex-1 btn-primary justify-center">
                          <i className="ti ti-check" /> 알아요
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <i className="ti ti-trophy text-4xl text-yellow-400 block mb-3" />
                    <h3 className="font-medium mb-1">퀴즈 완료!</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {qOk+qNo}개 중 {qOk}개 정답 ({qOk+qNo > 0 ? Math.round(qOk/(qOk+qNo)*100) : 0}%)
                    </p>
                    <button onClick={startQuiz} className="btn-primary">
                      <i className="ti ti-refresh" /> 다시 하기
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BOOKMARKS SCREEN ── */}
        {screen === 'bookmarks' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo('read')} />
              <h2 className="text-lg font-medium">북마크한 문장</h2>
            </div>
            {S.bookmarks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <i className="ti ti-bookmark-off text-3xl block mb-2" />
                북마크한 문장이 없어요.<br />문장 옆 <i className="ti ti-bookmark" /> 버튼으로 저장하세요.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {S.bookmarks.map(b => (
                  <div key={b.key} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">단락 {b.para + 1}</div>
                        <div className="text-sm leading-relaxed">{b.text}</div>
                        <div className="text-xs text-emerald-600 italic mt-1">{b.tr}</div>
                      </div>
                      <button onClick={() => rmBm(b.key)} className="text-gray-300 hover:text-red-400 shrink-0">
                        <i className="ti ti-trash text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2 text-emerald-600 font-medium text-lg mb-6">
      <i className="ti ti-leaf" /> Leady
    </div>
  )
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {[0,1,2,3].map(i => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i < current ? 'w-1.5 bg-emerald-500' : i === current ? 'w-5 bg-emerald-500' : 'w-1.5 bg-gray-200'}`} />
      ))}
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-gray-400 hover:text-gray-700 p-1">
      <i className="ti ti-arrow-left text-lg" />
    </button>
  )
}

function LangGrid({ selected, onSelect, exclude }: { selected: string | null, onSelect: (c: string) => void, exclude: string | null }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-2">
      {LANGS.filter(l => l.c !== exclude).map(l => (
        <button
          key={l.c}
          onClick={() => onSelect(l.c)}
          className={`flex flex-col items-center py-3 px-2 rounded-xl border text-xs font-medium transition-all ${selected === l.c ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
        >
          <span className="text-2xl mb-1">{l.f}</span>
          {l.n}
        </button>
      ))}
    </div>
  )
}

function KeywordInput({ onAdd }: { onAdd: (k: string) => void }) {
  const [val, setVal] = useState('')
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal('') } }
  return (
    <div className="flex gap-2 mb-3">
      <input
        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
        placeholder="예: 우주, 고양이, 비밀 편지..."
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <button onClick={submit} className="btn-secondary text-sm px-3">
        <i className="ti ti-plus" /> 추가
      </button>
    </div>
  )
}

// ── ReadScreen ────────────────────────────────────────────────────────────────

function ReadScreen({ S, nativeLang, targetLang, onBack, onVocab, onQuiz, onBm, onSaveWord, onToggleBm, onChPara }: {
  S: AppState
  nativeLang: typeof LANGS[0] | undefined
  targetLang: typeof LANGS[0] | undefined
  onBack: () => void
  onVocab: () => void
  onQuiz: () => void
  onBm: () => void
  onSaveWord: (w: WordInfo) => void
  onToggleBm: (key: string, text: string, tr: string, para: number) => void
  onChPara: (d: number) => void
}) {
  const book = S.book!
  const para = book.paragraphs[S.para]
  const total = book.paragraphs.length
  const [popup, setPopup] = useState<{ info: WordInfo, x: number, y: number } | null>(null)
  const [sentTrans, setSentTrans] = useState<{ idx: number, tr: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const rcRef = useRef<HTMLDivElement>(null)

  const wm: Record<string, WordInfo> = {}
  para.words?.forEach(w => { wm[w.word.toLowerCase()] = w })

  const closePopup = () => setPopup(null)

  const handleWordClick = async (tok: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const clean = tok.replace(/[.,!?。、！？「」『』…]/g, '').toLowerCase()
    const known = wm[clean]
    const rc = rcRef.current
    if (!rc) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const rcRect = rc.getBoundingClientRect()
    const x = Math.min(rect.left - rcRect.left, rc.offsetWidth - 270)
    const y = rect.bottom - rcRect.top + 8

    if (known) {
      setPopup({ info: known, x: Math.max(2, x), y })
      return
    }
    setLoading(tok)
    setPopup(null)
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: tok, targetLang: targetLang?.n, nativeLang: nativeLang?.n })
      })
      const info: WordInfo = await res.json()
      setPopup({ info, x: Math.max(2, x), y })
    } catch {}
    setLoading(null)
  }

  const handleSentHold = (idx: number, tr: string) => {
    setSentTrans({ idx, tr })
    setTimeout(() => setSentTrans(null), 4000)
  }

  return (
    <div className="p-4">
      {/* nav */}
      <div className="flex items-center gap-2 mb-3">
        <BackBtn onClick={onBack} />
        <div className="flex-1"><StepDots current={3} /></div>
        <button onClick={onBm} className="btn-secondary text-xs px-2.5 py-1.5"><i className="ti ti-bookmark" /></button>
        <button onClick={onVocab} className="btn-secondary text-xs px-2.5 py-1.5"><i className="ti ti-book" /> 단어장</button>
        <button onClick={onQuiz} className="btn-secondary text-xs px-2.5 py-1.5"><i className="ti ti-cards" /> 퀴즈</button>
      </div>

      {/* book header */}
      <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 mb-3">
        <div className="flex gap-3 items-start">
          <div className="w-11 h-14 rounded bg-emerald-500 flex items-center justify-center shrink-0">
            <i className="ti ti-book text-white text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{book.title}</div>
            <div className="text-xs text-gray-400 mb-2">AI 생성 · {book.genreLabel}</div>
            <div className="flex flex-wrap gap-1">
              <span className="badge-teal">{targetLang?.f} {targetLang?.n}</span>
              <span className="badge-blue">{book.titleTr}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-full h-1 mt-3 mb-1 overflow-hidden">
          <div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${((S.para+1)/total)*100}%` }} />
        </div>
        <div className="text-xs text-gray-400 text-right">{S.para+1} / {total} 단락</div>
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{book.level}</span>
        <span className="text-xs text-gray-400">{nativeLang?.n} → {targetLang?.n}</span>
        <div className="flex-1" />
        <button onClick={() => onChPara(-1)} disabled={S.para===0} className="btn-icon disabled:opacity-30">
          <i className="ti ti-chevron-left" />
        </button>
        <button onClick={() => onChPara(1)} disabled={S.para===total-1} className="btn-icon disabled:opacity-30">
          <i className="ti ti-chevron-right" />
        </button>
      </div>

      <div className="text-xs text-gray-400 text-center mb-2">
        <i className="ti ti-hand-click" /> 단어 클릭 → 뜻 &nbsp;|&nbsp; <i className="ti ti-hand" /> 문장 길게 누르기 → 번역
      </div>

      {/* reading content */}
      <div
        ref={rcRef}
        className="border border-gray-100 rounded-2xl p-5 bg-white leading-loose text-base mb-4 relative"
        onClick={closePopup}
      >
        {para.sentences.map((s, si) => {
          const bmKey = `${S.para}-${si}`
          const isBm = !!S.bookmarks.find(b => b.key === bmKey)
          return (
            <div key={si} className="flex items-baseline gap-1 mb-1">
              <SentenceRow
                text={s.text}
                wm={wm}
                loading={loading}
                highlighted={sentTrans?.idx === si}
                onWordClick={handleWordClick}
                onHold={() => handleSentHold(si, s.tr)}
              />
              <button
                onClick={e => { e.stopPropagation(); onToggleBm(bmKey, s.text, s.tr, S.para) }}
                className={`shrink-0 text-base transition-colors ${isBm ? 'text-amber-400' : 'text-gray-200 hover:text-gray-400'}`}
              >
                <i className="ti ti-bookmark" />
              </button>
              {sentTrans?.idx === si && (
                <div className="sent-popup w-full mt-0.5">
                  <div className="text-xs font-medium text-amber-700 mb-1 uppercase tracking-wide">번역</div>
                  {s.tr}
                </div>
              )}
            </div>
          )
        })}

        {/* word popup */}
        {popup && (
          <div
            className="word-popup"
            style={{ left: popup.x, top: popup.y }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closePopup} className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-base">×</button>
            <div className="text-lg font-medium text-emerald-600 mb-0.5">{popup.info.word}</div>
            {popup.info.pron && <div className="text-xs text-gray-400 italic mb-1.5">{popup.info.pron}</div>}
            <div className="text-sm font-medium text-gray-800 mb-1.5">{popup.info.meaning}</div>
            {popup.info.example && (
              <div className="text-xs text-gray-500 border-l-2 border-emerald-400 pl-2 leading-relaxed">{popup.info.example}</div>
            )}
            <div className="flex justify-end mt-2">
              <button onClick={() => { onSaveWord(popup.info); closePopup() }} className="btn-primary text-xs px-3 py-1.5">
                <i className="ti ti-bookmark" /> 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SentenceRow({ text, wm, loading, highlighted, onWordClick, onHold }: {
  text: string
  wm: Record<string, WordInfo>
  loading: string | null
  highlighted: boolean
  onWordClick: (tok: string, e: React.MouseEvent) => void
  onHold: () => void
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tokens = text.split(/(\s+)/)

  return (
    <span
      className={`sent flex-1 ${highlighted ? 'shl' : ''}`}
      onMouseDown={() => { holdTimer.current = setTimeout(onHold, 600) }}
      onMouseUp={() => holdTimer.current && clearTimeout(holdTimer.current)}
      onMouseLeave={() => holdTimer.current && clearTimeout(holdTimer.current)}
      onTouchStart={() => { holdTimer.current = setTimeout(onHold, 600) }}
      onTouchEnd={() => holdTimer.current && clearTimeout(holdTimer.current)}
    >
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>
        const clean = tok.replace(/[.,!?。、！？「」『』…]/g, '').toLowerCase()
        const isKnown = !!wm[clean]
        const isLoading = loading === tok
        return (
          <span
            key={i}
            className={`word ${isKnown ? 'font-medium text-emerald-700' : ''} ${isLoading ? 'opacity-50' : ''}`}
            onClick={e => onWordClick(tok, e)}
          >
            {tok}
          </span>
        )
      })}
    </span>
  )
}
