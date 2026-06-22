'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LANGS, GENRES, LEVELS, THEMES, LENGTH_OPTIONS, WordInfo, Book, Bookmark, AppState } from '@/lib/constants'

const SK = 'leady_v4'

const defaultState: AppState = {
  native: null, target: null, level: null, theme: null,
  genres: [], storyPrompt: '', length: null,
  currentBook: null, para: 0, vocab: [], bookmarks: [],
  bookshelf: [], levelCheckPassed: false,
}

function loadState(): AppState {
  try { const d = localStorage.getItem(SK); if (d) return { ...defaultState, ...JSON.parse(d) } } catch {}
  return { ...defaultState }
}

type Screen = 'lang' | 'level' | 'levelcheck' | 'theme' | 'genre' | 'length' | 'loading' | 'read' | 'vocab' | 'quiz' | 'bookmarks' | 'bookshelf' | 'shelf_read'

export default function Home() {
  const [S, setS] = useState<AppState>(defaultState)
  const [screen, setScreen] = useState<Screen>('lang')
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [checkData, setCheckData] = useState<{ title: string; titleTr: string; paragraphs: Book['paragraphs'] } | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [quizDeck, setQuizDeck] = useState<WordInfo[]>([])
  const [qOk, setQOk] = useState(0); const [qNo, setQNo] = useState(0)
  const [flipped, setFlipped] = useState(false); const [showAns, setShowAns] = useState(false)
  const [shelfBook, setShelfBook] = useState<Book | null>(null); const [shelfPara, setShelfPara] = useState(0)

  useEffect(() => { const l = loadState(); setS(l); if (l.currentBook) setScreen('read') }, [])

  const save = useCallback((next: AppState) => { setS(next); try { localStorage.setItem(SK, JSON.stringify(next)) } catch {} }, [])
  const goTo = (s: Screen) => setScreen(s)

  const toggleGenre = (id: string) => {
    const genres = S.genres.includes(id) ? S.genres.filter(g => g !== id) : [...S.genres, id]
    save({ ...S, genres })
  }

  // 난이도 확인 샘플 — 레벨만 있으면 생성 (장르/주제 없어도 됨)
  const loadCheck = async (st: AppState) => {
    setCheckData(null)
    setCheckLoading(true)
    goTo('levelcheck')
    const nl = LANGS.find(l => l.c === st.native)?.n || ''
    const tl = LANGS.find(l => l.c === st.target)?.n || ''
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nativeLang: nl, targetLang: tl,
          genreLabels: '일상',
          level: st.level,
          theme: 'general',
          storyPrompt: '',
          checkOnly: true,
        })
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      console.log('checkData received:', JSON.stringify(data).slice(0, 100))
      setCheckData(data)
    } catch (err) {
      console.error('loadCheck error:', err)
      setCheckData(null)
    } finally {
      setCheckLoading(false)
    }
  }

  const adjustLevel = (dir: 'easier' | 'harder') => {
    const order = ['beginner', 'elementary', 'intermediate', 'advanced']
    const idx = order.indexOf(S.level || 'elementary')
    const next = { ...S, level: dir === 'easier' ? order[Math.max(0, idx - 1)] : order[Math.min(3, idx + 1)] }
    save(next); loadCheck(next)
  }

  const genBook = async (st?: AppState) => {
    const state = st || S
    setLoadErr(null); goTo('loading')
    const nl = LANGS.find(l => l.c === state.native)?.n || ''
    const tl = LANGS.find(l => l.c === state.target)?.n || ''
    const gl = state.genres.map(id => GENRES.find(g => g.id === id)?.l || id).join(', ')
    const totalPages = LENGTH_OPTIONS.find(l => l.id === state.length)?.pages || 10
    const themeLabel = THEMES.find(t => t.id === state.theme)?.l || state.theme || ''
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nativeLang: nl, targetLang: tl, genreLabels: gl, storyPrompt: state.storyPrompt, level: state.level, theme: themeLabel, totalPages })
      })
      if (!res.ok) { const e = await res.json(); setLoadErr(e.error || `오류 ${res.status}`); return }
      const book = await res.json()
      if (!book.paragraphs?.length) { setLoadErr('생성 실패. 다시 시도해주세요.'); return }
      const full: Book = {
        ...book, id: Date.now().toString(), createdAt: Date.now(),
        theme: themeLabel, totalPages,
        level: LEVELS.find(l => l.id === state.level)?.l || '초급',
        genreLabel: gl,
      }
      save({ ...state, currentBook: full, para: 0, bookmarks: [] })
      goTo('read')
    } catch (e: unknown) { setLoadErr(e instanceof Error ? e.message : String(e)) }
  }

  const saveWord = useCallback((w: WordInfo) => {
    setS(prev => {
      if (prev.vocab.find(v => v.word === w.word)) return prev
      const next = { ...prev, vocab: [...prev.vocab, w] }
      try { localStorage.setItem(SK, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])
  const rmWord = (word: string) => save({ ...S, vocab: S.vocab.filter(v => v.word !== word) })
  const toggleBm = (key: string, text: string, tr: string, para: number) => {
    const bookmarks = S.bookmarks.find(b => b.key === key) ? S.bookmarks.filter(b => b.key !== key) : [...S.bookmarks, { key, para, text, tr }]
    save({ ...S, bookmarks })
  }
  const rmBm = (key: string) => save({ ...S, bookmarks: S.bookmarks.filter(b => b.key !== key) })
  const completeBook = () => {
    if (!S.currentBook) return
    const done = { ...S.currentBook, completedAt: Date.now() }
    const bookshelf = S.bookshelf.find(b => b.id === done.id) ? S.bookshelf.map(b => b.id === done.id ? done : b) : [done, ...S.bookshelf]
    save({ ...S, bookshelf, currentBook: null }); goTo('bookshelf')
  }
  const startQuiz = () => { setQuizDeck([...S.vocab].sort(() => Math.random() - .5)); setQOk(0); setQNo(0); setFlipped(false); setShowAns(false); goTo('quiz') }
  const flipCard = () => { if (flipped) return; setFlipped(true); setTimeout(() => setShowAns(true), 380) }
  const answerCard = (ok: boolean) => { if (ok) setQOk(p => p + 1); else setQNo(p => p + 1); setQuizDeck(d => d.slice(1)); setFlipped(false); setShowAns(false) }

  const nL = LANGS.find(l => l.c === S.native)
  const tL = LANGS.find(l => l.c === S.target)

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-sm">

        {/* ── 1. 언어 선택 ── */}
        {screen === 'lang' && (
          <div className="p-5">
            <Logo />
            <StepBar current={0} total={6} />
            <h1 className="text-xl font-medium mb-1">내 언어 선택</h1>
            <p className="text-sm text-gray-500 mb-3">평소에 사용하는 언어를 선택해주세요</p>
            <LangGrid selected={S.native} onSelect={c => save({ ...S, native: c })} exclude={S.target} />
            <hr className="my-3 border-gray-100" />
            <h2 className="text-base font-medium mb-2">배우고 싶은 언어</h2>
            <LangGrid selected={S.target} onSelect={c => save({ ...S, target: c })} exclude={S.native} />
            <BottomNav showBack={false} onNext={() => goTo('level')} disabled={!S.native || !S.target || S.native === S.target} />
          </div>
        )}

        {/* ── 2. 학습 레벨 ── */}
        {screen === 'level' && (
          <div className="p-5">
            <Logo />
            <StepBar current={1} total={6} />
            <h1 className="text-xl font-medium mb-1">학습 레벨 선택</h1>
            <p className="text-sm text-gray-500 mb-4">{tL?.n} 실력이 어느 정도인가요?</p>
            <div className="flex flex-col gap-3 mb-6">
              {LEVELS.map(lv => (
                <button key={lv.id} onClick={() => save({ ...S, level: lv.id })}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${S.level === lv.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <span className="text-3xl">{lv.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{lv.l}</div>
                    <div className="text-sm text-gray-500">{lv.desc}</div>
                  </div>
                  {S.level === lv.id && <i className="ti ti-check text-emerald-500 text-lg" />}
                </button>
              ))}
            </div>
            <BottomNav onBack={() => goTo('lang')} onNext={() => loadCheck(S)} disabled={!S.level} nextLabel="난이도 확인하기" />
          </div>
        )}

        {/* ── 3. 난이도 확인 ── */}
        {screen === 'levelcheck' && (
          <div className="p-5">
            <Logo />
            <StepBar current={2} total={6} />
            <h1 className="text-xl font-medium mb-1">난이도 확인</h1>
            <p className="text-sm text-gray-500 mb-4">샘플 문단을 읽고 내 수준에 맞는지 확인해보세요</p>
            {checkLoading ? (
              <div className="border border-gray-100 rounded-2xl p-10 text-center bg-gray-50">
                <div className="flex justify-center gap-1.5 mb-3"><span className="dot" /><span className="dot" /><span className="dot" /></div>
                <p className="text-sm text-gray-500">샘플 문단 생성 중...</p>
              </div>
            ) : checkData ? (
              <>
                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 mb-5">
                  <div className="text-sm font-medium text-emerald-600 mb-3">{checkData.title}</div>
                  {checkData.paragraphs?.map((para, pi) => (
                    <div key={pi} className="mb-4 last:mb-0">
                      <div className="text-xs text-gray-400 mb-1.5 font-medium">단락 {pi + 1}</div>
                      {para.sentences.map((s, si) => (
                        <div key={si} className="text-sm leading-relaxed mb-1">{s.text}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium text-center mb-3">이 난이도가 어떻게 느껴지세요?</p>
                <div className="flex flex-col gap-2.5 mb-4">
                  <button onClick={() => adjustLevel('easier')} className="btn-secondary justify-center py-3">😅 너무 어려워요 — 더 쉽게</button>
                  <button onClick={() => goTo('theme')} className="btn-primary justify-center py-3 text-base">😊 딱 적당해요 — 다음으로!</button>
                  <button onClick={() => adjustLevel('harder')} className="btn-secondary justify-center py-3">🤓 너무 쉬워요 — 더 어렵게</button>
                </div>
                <button onClick={() => goTo('level')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">← 레벨 다시 선택</button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-500 text-sm mb-3">샘플 생성 실패</p>
                <button onClick={() => loadCheck(S)} className="btn-primary">다시 시도</button>
              </div>
            )}
          </div>
        )}

        {/* ── 4. 주제 선택 ── */}
        {screen === 'theme' && (
          <div className="p-5">
            <Logo />
            <StepBar current={3} total={6} />
            <h1 className="text-xl font-medium mb-1">이야기 주제 선택</h1>
            <p className="text-sm text-gray-500 mb-4">어떤 분위기의 이야기를 읽고 싶으세요?</p>
            <div className="flex flex-col gap-2.5 mb-6">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => save({ ...S, theme: t.id })}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${S.theme === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{t.l}</div>
                    <div className="text-xs text-gray-400">{t.desc}</div>
                  </div>
                  {S.theme === t.id && <i className="ti ti-check text-emerald-500" />}
                </button>
              ))}
            </div>
            <BottomNav onBack={() => goTo('levelcheck')} onNext={() => goTo('genre')} disabled={!S.theme} />
          </div>
        )}

        {/* ── 5. 장르 + 스토리 직접 입력 ── */}
        {screen === 'genre' && (
          <div className="p-5">
            <Logo />
            <StepBar current={4} total={6} />
            <h1 className="text-xl font-medium mb-1">장르 &amp; 스토리 설정</h1>
            <p className="text-sm text-gray-500 mb-3">장르를 고르고, 원하는 이야기를 직접 적어보세요</p>

            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">장르 선택 (복수 선택 가능)</div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {GENRES.map(g => (
                <button key={g.id} onClick={() => toggleGenre(g.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${S.genres.includes(g.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {S.genres.includes(g.id) && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <i className="ti ti-check text-white" style={{ fontSize: 8 }} />
                    </span>
                  )}
                  <i className={`ti ${g.i} text-lg`} />{g.l}
                </button>
              ))}
            </div>
            {S.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {S.genres.map(id => {
                  const g = GENRES.find(x => x.id === id)!
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      {g.l}<button onClick={() => toggleGenre(id)}>×</button>
                    </span>
                  )
                })}
              </div>
            )}

            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">원하는 스토리 (선택)</div>
            <textarea
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none mb-1"
              rows={3}
              placeholder="예: 파리에서 우연히 만난 두 사람의 이야기, 고양이를 잃어버린 소녀, 첫 직장에서 겪는 좌충우돌..."
              value={S.storyPrompt}
              onChange={e => save({ ...S, storyPrompt: e.target.value })}
            />
            <p className="text-xs text-gray-400 mb-4">비워두면 AI가 자유롭게 만들어요</p>

            <BottomNav onBack={() => goTo('theme')} onNext={() => goTo('length')} disabled={S.genres.length === 0} />
          </div>
        )}

        {/* ── 6. 이야기 길이 ── */}
        {screen === 'length' && (
          <div className="p-5">
            <Logo />
            <StepBar current={5} total={6} />
            <h1 className="text-xl font-medium mb-1">이야기 길이 선택</h1>
            <p className="text-sm text-gray-500 mb-4">얼마나 긴 이야기를 읽고 싶으세요?</p>
            <div className="flex flex-col gap-3 mb-6">
              {LENGTH_OPTIONS.map(lo => (
                <button key={lo.id} onClick={() => save({ ...S, length: lo.id })}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${S.length === lo.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <span className="text-3xl">{lo.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{lo.l}</div>
                    <div className="text-sm text-gray-500">{lo.desc}</div>
                  </div>
                  {S.length === lo.id && <i className="ti ti-check ml-auto text-emerald-500 text-lg" />}
                </button>
              ))}
            </div>
            <BottomNav onBack={() => goTo('genre')} onNext={() => genBook()} disabled={!S.length} nextLabel="이야기 만들기 ✨" />
          </div>
        )}

        {/* ── 로딩 ── */}
        {screen === 'loading' && (
          <div className="p-5">
            <Logo />
            <div className="border border-gray-100 rounded-2xl p-10 text-center bg-gray-50 mt-8">
              {!loadErr ? (
                <>
                  <div className="flex justify-center gap-1.5 mb-4"><span className="dot" /><span className="dot" /><span className="dot" /></div>
                  <h3 className="font-medium mb-2">AI가 이야기를 만들고 있어요...</h3>
                  <p className="text-sm text-gray-500">{LENGTH_OPTIONS.find(l => l.id === S.length)?.pages || 10}페이지 분량 생성 중<br />잠시 기다려주세요 (약 20-40초)</p>
                </>
              ) : (
                <>
                  <p className="text-red-500 text-sm mb-3">{loadErr}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => genBook()} className="btn-primary text-sm"><i className="ti ti-refresh" /> 다시 시도</button>
                    <button onClick={() => goTo('genre')} className="btn-secondary text-sm">← 돌아가기</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 독서 ── */}
        {screen === 'read' && S.currentBook && (
          <ReadScreen S={S} nL={nL} tL={tL}
            onBack={() => goTo('genre')}
            onVocab={() => goTo('vocab')}
            onQuiz={startQuiz}
            onBm={() => goTo('bookmarks')}
            onShelf={() => goTo('bookshelf')}
            onSaveWord={saveWord}
            onToggleBm={toggleBm}
            onChPara={d => { const tot = S.currentBook!.paragraphs.length; save({ ...S, para: Math.max(0, Math.min(tot - 1, S.para + d)) }) }}
            onComplete={completeBook}
          />
        )}

        {/* ── 단어장 ── */}
        {screen === 'vocab' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo('read')} />
              <h2 className="text-lg font-medium">내 단어장</h2>
              <div className="flex-1" />
              {S.vocab.length > 0 && <span className="text-xs text-gray-400">{S.vocab.length}개</span>}
            </div>
            {S.vocab.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <i className="ti ti-book-off text-3xl block mb-2" />
                아직 저장된 단어가 없어요.<br />단어를 클릭하면 자동으로 추가돼요.
              </div>
            ) : (
              <>
                <button onClick={startQuiz} className="btn-primary w-full mb-4 justify-center"><i className="ti ti-cards" /> 퀴즈 시작하기</button>
                <div className="flex flex-col gap-2">
                  {S.vocab.map(v => (
                    <div key={v.word} className="border border-gray-100 rounded-xl p-3 flex justify-between items-start gap-3">
                      <div>
                        <div className="font-medium text-emerald-600 text-sm">{v.word} {v.pron && <span className="text-gray-400 font-normal text-xs">[{v.pron}]</span>}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{v.meaning}</div>
                        {v.example && <div className="text-xs text-gray-400 italic mt-1">{v.example}</div>}
                      </div>
                      <button onClick={() => rmWord(v.word)} className="text-gray-300 hover:text-red-400 shrink-0"><i className="ti ti-trash text-sm" /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 퀴즈 ── */}
        {screen === 'quiz' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo('vocab')} />
              <h2 className="text-lg font-medium">플래시카드 퀴즈</h2>
            </div>
            <div className="flex gap-2 mb-3">
              {[{ n: qOk, l: '알아요', c: 'text-emerald-600' }, { n: quizDeck.length, l: '남은 카드', c: 'text-gray-700' }, { n: qNo, l: '모르겠어요', c: 'text-red-500' }].map(s => (
                <div key={s.l} className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-medium ${s.c}`}>{s.n}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-100 rounded-full h-1 mb-4 overflow-hidden">
              <div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${(qOk + qNo) / (qOk + qNo + quizDeck.length) * 100 || 0}%` }} />
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
                {showAns && (
                  <div className="flex gap-2">
                    <button onClick={() => answerCard(false)} className="flex-1 btn-danger justify-center"><i className="ti ti-x" /> 모르겠어요</button>
                    <button onClick={() => answerCard(true)} className="flex-1 btn-primary justify-center"><i className="ti ti-check" /> 알아요</button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <i className="ti ti-trophy text-4xl text-yellow-400 block mb-3" />
                <h3 className="font-medium mb-1">퀴즈 완료!</h3>
                <p className="text-sm text-gray-500 mb-4">{qOk + qNo}개 중 {qOk}개 정답 ({qOk + qNo > 0 ? Math.round(qOk / (qOk + qNo) * 100) : 0}%)</p>
                <button onClick={startQuiz} className="btn-primary"><i className="ti ti-refresh" /> 다시 하기</button>
              </div>
            )}
          </div>
        )}

        {/* ── 북마크 ── */}
        {screen === 'bookmarks' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo('read')} />
              <h2 className="text-lg font-medium">북마크한 문장</h2>
            </div>
            {S.bookmarks.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm"><i className="ti ti-bookmark-off text-3xl block mb-2" />북마크한 문장이 없어요.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {S.bookmarks.map(b => (
                  <div key={b.key} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">페이지 {b.para + 1}</div>
                        <div className="text-sm leading-relaxed">{b.text}</div>
                        <div className="text-xs text-emerald-600 italic mt-1">{b.tr}</div>
                      </div>
                      <button onClick={() => rmBm(b.key)} className="text-gray-300 hover:text-red-400 shrink-0"><i className="ti ti-trash text-sm" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 책장 ── */}
        {screen === 'bookshelf' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BackBtn onClick={() => goTo(S.currentBook ? 'read' : 'lang')} />
              <h2 className="text-lg font-medium">📚 내 책장</h2>
              <div className="flex-1" />
              <button onClick={() => { save({ ...S, currentBook: null }); goTo('lang') }} className="btn-primary text-xs px-3 py-1.5">
                <i className="ti ti-plus" /> 새 이야기
              </button>
            </div>
            {S.bookshelf.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="text-5xl block mb-3">📭</span>
                <span className="text-sm">완독한 이야기가 여기에 저장돼요!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {S.bookshelf.map(book => (
                  <div key={book.id} className="border border-gray-100 rounded-2xl p-4">
                    <div className="flex gap-3 mb-3">
                      <div className="w-12 h-16 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                        <i className="ti ti-book text-white text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{book.title}</div>
                        <div className="text-xs text-gray-400 mb-1.5">{book.titleTr}</div>
                        <div className="flex flex-wrap gap-1">
                          <span className="badge-teal">{book.level}</span>
                          <span className="badge-blue">{book.genreLabel}</span>
                          <span className="badge-teal">{book.totalPages}p</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {book.completedAt ? `✅ 완독 · ${new Date(book.completedAt).toLocaleDateString('ko-KR')}` : new Date(book.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setShelfBook(book); setShelfPara(0); goTo('shelf_read') }}
                      className="btn-secondary w-full justify-center text-sm">
                      <i className="ti ti-book-2" /> 다시 읽기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 책장 독서 ── */}
        {screen === 'shelf_read' && shelfBook && (
          <ShelfRead book={shelfBook} para={shelfPara} nL={nL} tL={tL}
            onBack={() => goTo('bookshelf')}
            onChPara={d => setShelfPara(p => Math.max(0, Math.min(shelfBook.paragraphs.length - 1, p + d)))}
            onSaveWord={saveWord}
          />
        )}

      </div>
    </div>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

function Logo() {
  return <div className="flex items-center gap-2 text-emerald-600 font-medium text-lg mb-4"><i className="ti ti-leaf" /> Leady</div>
}
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < current ? 'bg-emerald-300' : i === current ? 'bg-emerald-500' : 'bg-gray-100'}`} />
      ))}
    </div>
  )
}
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-gray-400 hover:text-gray-700 p-1"><i className="ti ti-arrow-left text-lg" /></button>
}
function BottomNav({ onBack, onNext, disabled, nextLabel = '다음', showBack = true }: { onBack?: () => void; onNext: () => void; disabled: boolean; nextLabel?: string; showBack?: boolean }) {
  return (
    <div className="flex justify-between items-center mt-2">
      {showBack && onBack ? <button onClick={onBack} className="btn-secondary"><i className="ti ti-arrow-left" /> 이전</button> : <div />}
      <button onClick={onNext} disabled={disabled} className="btn-primary disabled:opacity-40">{nextLabel} <i className="ti ti-arrow-right" /></button>
    </div>
  )
}
function LangGrid({ selected, onSelect, exclude }: { selected: string | null; onSelect: (c: string) => void; exclude: string | null }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-2">
      {LANGS.filter(l => l.c !== exclude).map(l => (
        <button key={l.c} onClick={() => onSelect(l.c)}
          className={`flex flex-col items-center py-3 px-2 rounded-xl border text-xs font-medium transition-all ${selected === l.c ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <span className="text-2xl mb-1">{l.f}</span>{l.n}
        </button>
      ))}
    </div>
  )
}

// ── ReadScreen ────────────────────────────────────────────────────────────────

function ReadScreen({ S, nL, tL, onBack, onVocab, onQuiz, onBm, onShelf, onSaveWord, onToggleBm, onChPara, onComplete }: {
  S: AppState; nL: typeof LANGS[0] | undefined; tL: typeof LANGS[0] | undefined
  onBack: () => void; onVocab: () => void; onQuiz: () => void; onBm: () => void; onShelf: () => void
  onSaveWord: (w: WordInfo) => void; onToggleBm: (key: string, text: string, tr: string, para: number) => void
  onChPara: (d: number) => void; onComplete: () => void
}) {
  const book = S.currentBook!
  const para = book.paragraphs[S.para]
  const total = book.paragraphs.length
  const [popup, setPopup] = useState<{ info: WordInfo; x: number; y: number } | null>(null)
  const [sentTrans, setSentTrans] = useState<{ idx: number; tr: string } | null>(null)
  const [lookupLoading, setLookupLoading] = useState<string | null>(null)
  const rcRef = useRef<HTMLDivElement>(null)
  const isLast = S.para === total - 1

  const wm: Record<string, WordInfo> = {}
  para.words?.forEach(w => { wm[w.word.toLowerCase()] = w })

  const handleWordClick = async (tok: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const clean = tok.replace(/[.,!?。、！？「」『』…]/g, '').toLowerCase()
    const known = wm[clean]
    const rc = rcRef.current; if (!rc) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const rcRect = rc.getBoundingClientRect()
    const x = Math.min(rect.left - rcRect.left, rc.offsetWidth - 270)
    const y = rect.bottom - rcRect.top + 8

    if (known) {
      onSaveWord(known) // 자동 저장
      setPopup({ info: known, x: Math.max(2, x), y })
      return
    }
    // 모르는 단어 → API 조회 후 자동 저장
    setLookupLoading(tok); setPopup(null)
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: tok, targetLang: tL?.n, nativeLang: nL?.n })
      })
      const info: WordInfo = await res.json()
      onSaveWord(info) // 자동 저장
      setPopup({ info, x: Math.max(2, x), y })
    } catch {}
    setLookupLoading(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <BackBtn onClick={onBack} />
        <div className="flex-1" />
        <button onClick={onBm} className="btn-secondary text-xs px-2 py-1.5"><i className="ti ti-bookmark" /></button>
        <button onClick={onShelf} className="btn-secondary text-xs px-2 py-1.5"><i className="ti ti-books" /></button>
        <button onClick={onVocab} className="btn-secondary text-xs px-2 py-1.5"><i className="ti ti-book" /> 단어장</button>
        <button onClick={onQuiz} className="btn-secondary text-xs px-2 py-1.5"><i className="ti ti-cards" /></button>
      </div>

      <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 mb-3">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-14 rounded bg-emerald-500 flex items-center justify-center shrink-0">
            <i className="ti ti-book text-white text-base" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{book.title}</div>
            <div className="text-xs text-gray-400 mb-1.5">{book.titleTr}</div>
            <div className="flex flex-wrap gap-1">
              <span className="badge-teal">{book.level}</span>
              <span className="badge-blue">{book.genreLabel}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-full h-1.5 mt-3 mb-1 overflow-hidden">
          <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${((S.para + 1) / total) * 100}%` }} />
        </div>
        <div className="text-xs text-gray-400 text-right">{S.para + 1} / {total} 페이지</div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{book.level}</span>
        <span className="text-xs text-gray-400">{nL?.n} → {tL?.n}</span>
        <div className="flex-1" />
        <button onClick={() => onChPara(-1)} disabled={S.para === 0} className="btn-icon disabled:opacity-30"><i className="ti ti-chevron-left" /></button>
        <button onClick={() => onChPara(1)} disabled={isLast} className="btn-icon disabled:opacity-30"><i className="ti ti-chevron-right" /></button>
      </div>

      <div className="text-xs text-gray-400 text-center mb-2">
        <i className="ti ti-hand-click" /> 단어 클릭 → 뜻 + 단어장 자동 저장 &nbsp;|&nbsp; <i className="ti ti-hand" /> 길게 누르기 → 번역
      </div>

      <div ref={rcRef} className="border border-gray-100 rounded-2xl p-5 bg-white leading-loose text-base mb-4 relative" onClick={() => setPopup(null)}>
        {para.sentences.map((s, si) => {
          const bmKey = `${S.para}-${si}`
          const isBm = !!S.bookmarks.find(b => b.key === bmKey)
          const holdRef = { current: null as ReturnType<typeof setTimeout> | null }
          return (
            <div key={si} className="flex items-baseline gap-1 mb-1">
              <span
                className={`sent flex-1 ${sentTrans?.idx === si ? 'shl' : ''}`}
                onMouseDown={() => { holdRef.current = setTimeout(() => { setSentTrans({ idx: si, tr: s.tr }); setTimeout(() => setSentTrans(null), 4000) }, 600) }}
                onMouseUp={() => holdRef.current && clearTimeout(holdRef.current)}
                onMouseLeave={() => holdRef.current && clearTimeout(holdRef.current)}
                onTouchStart={() => { holdRef.current = setTimeout(() => { setSentTrans({ idx: si, tr: s.tr }); setTimeout(() => setSentTrans(null), 4000) }, 600) }}
                onTouchEnd={() => holdRef.current && clearTimeout(holdRef.current)}
              >
                {s.text.split(/(\s+)/).map((tok, ti) => {
                  if (/^\s+$/.test(tok)) return <span key={ti}>{tok}</span>
                  const clean = tok.replace(/[.,!?。、！？「」『』…]/g, '').toLowerCase()
                  const isKnown = !!wm[clean]
                  return (
                    <span key={ti}
                      className={`word ${isKnown ? 'font-medium text-emerald-700 underline decoration-dotted underline-offset-2' : ''} ${lookupLoading === tok ? 'opacity-50' : ''}`}
                      onClick={e => handleWordClick(tok, e)}>
                      {tok}
                    </span>
                  )
                })}
                {' '}
                {sentTrans?.idx === si && (
                  <span className="block mt-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">{s.tr}</span>
                )}
              </span>
              <button onClick={e => { e.stopPropagation(); onToggleBm(bmKey, s.text, s.tr, S.para) }}
                className={`shrink-0 text-base transition-colors ${isBm ? 'text-amber-400' : 'text-gray-200 hover:text-gray-400'}`}>
                <i className="ti ti-bookmark" />
              </button>
            </div>
          )
        })}
        {popup && (
          <div className="word-popup" style={{ left: popup.x, top: popup.y }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPopup(null)} className="absolute top-2 right-3 text-gray-400 hover:text-gray-700">×</button>
            <div className="text-lg font-medium text-emerald-600 mb-0.5">{popup.info.word}</div>
            {popup.info.pron && <div className="text-xs text-gray-400 italic mb-1.5">{popup.info.pron}</div>}
            <div className="text-sm font-medium text-gray-800 mb-1.5">{popup.info.meaning}</div>
            {popup.info.example && <div className="text-xs text-gray-500 border-l-2 border-emerald-400 pl-2 leading-relaxed">{popup.info.example}</div>}
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
              <i className="ti ti-bookmark-filled" /> 단어장에 저장됨
            </div>
          </div>
        )}
      </div>

      {isLast && (
        <button onClick={onComplete} className="btn-primary w-full justify-center text-base py-3">
          🎉 완독! 책장에 저장하기
        </button>
      )}
    </div>
  )
}

// ── 책장 다시 읽기 ────────────────────────────────────────────────────────────

function ShelfRead({ book, para, nL, tL, onBack, onChPara, onSaveWord }: {
  book: Book; para: number; nL: typeof LANGS[0] | undefined; tL: typeof LANGS[0] | undefined
  onBack: () => void; onChPara: (d: number) => void; onSaveWord: (w: WordInfo) => void
}) {
  const p = book.paragraphs[para]; const total = book.paragraphs.length
  const [popup, setPopup] = useState<{ info: WordInfo; x: number; y: number } | null>(null)
  const [sentTrans, setSentTrans] = useState<{ idx: number; tr: string } | null>(null)
  const rcRef = useRef<HTMLDivElement>(null)
  const wm: Record<string, WordInfo> = {}
  p.words?.forEach(w => { wm[w.word.toLowerCase()] = w })

  const handleWordClick = (tok: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const clean = tok.replace(/[.,!?。、！？「」『』…]/g, '').toLowerCase()
    const known = wm[clean]; if (!known) return
    const rc = rcRef.current; if (!rc) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const rcRect = rc.getBoundingClientRect()
    const x = Math.min(rect.left - rcRect.left, rc.offsetWidth - 270)
    const y = rect.bottom - rcRect.top + 8
    onSaveWord(known)
    setPopup({ info: known, x: Math.max(2, x), y })
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <BackBtn onClick={onBack} />
        <div className="flex-1">
          <div className="font-medium text-sm truncate">{book.title}</div>
          <div className="text-xs text-gray-400">{book.titleTr}</div>
        </div>
      </div>
      <div className="bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${((para + 1) / total) * 100}%` }} />
      </div>
      <div className="text-xs text-gray-400 text-right mb-3">{para + 1} / {total} 페이지</div>
      <div ref={rcRef} className="border border-gray-100 rounded-2xl p-5 bg-white leading-loose text-base mb-4 relative" onClick={() => setPopup(null)}>
        {p.sentences.map((s, si) => {
          const holdRef = { current: null as ReturnType<typeof setTimeout> | null }
          return (
            <div key={si} className="mb-1">
              <span
                className={`sent ${sentTrans?.idx === si ? 'shl' : ''}`}
                onMouseDown={() => { holdRef.current = setTimeout(() => { setSentTrans({ idx: si, tr: s.tr }); setTimeout(() => setSentTrans(null), 4000) }, 600) }}
                onMouseUp={() => holdRef.current && clearTimeout(holdRef.current)}
                onMouseLeave={() => holdRef.current && clearTimeout(holdRef.current)}
                onTouchStart={() => { holdRef.current = setTimeout(() => { setSentTrans({ idx: si, tr: s.tr }); setTimeout(() => setSentTrans(null), 4000) }, 600) }}
                onTouchEnd={() => holdRef.current && clearTimeout(holdRef.current)}
              >
                {s.text.split(/(\s+)/).map((tok, ti) => {
                  if (/^\s+$/.test(tok)) return <span key={ti}>{tok}</span>
                  const clean = tok.replace(/[.,!?。、！？「」『』…]/g, '').toLowerCase()
                  return <span key={ti} className={`word ${wm[clean] ? 'font-medium text-emerald-700 underline decoration-dotted underline-offset-2' : ''}`} onClick={e => handleWordClick(tok, e)}>{tok}</span>
                })}
              </span>
              {sentTrans?.idx === si && (
                <div className="mt-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">{s.tr}</div>
              )}
            </div>
          )
        })}
        {popup && (
          <div className="word-popup" style={{ left: popup.x, top: popup.y }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPopup(null)} className="absolute top-2 right-3 text-gray-400">×</button>
            <div className="text-lg font-medium text-emerald-600 mb-0.5">{popup.info.word}</div>
            {popup.info.pron && <div className="text-xs text-gray-400 italic mb-1.5">{popup.info.pron}</div>}
            <div className="text-sm font-medium text-gray-800 mb-1.5">{popup.info.meaning}</div>
            {popup.info.example && <div className="text-xs text-gray-500 border-l-2 border-emerald-400 pl-2">{popup.info.example}</div>}
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><i className="ti ti-bookmark-filled" /> 단어장에 저장됨</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onChPara(-1)} disabled={para === 0} className="btn-secondary flex-1 justify-center disabled:opacity-30"><i className="ti ti-chevron-left" /> 이전</button>
        <button onClick={() => onChPara(1)} disabled={para === total - 1} className="btn-primary flex-1 justify-center disabled:opacity-40">다음 <i className="ti ti-chevron-right" /></button>
      </div>
    </div>
  )
}
