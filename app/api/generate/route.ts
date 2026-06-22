import { NextRequest, NextResponse } from 'next/server'


async function callClaude(prompt: string, maxTokens: number, apiKey: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: 'Respond with ONLY valid JSON. No markdown, no code blocks. Start with { and end with }.',
      messages: [{ role: 'user', content: prompt }]
    })
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw: string = data.content?.[0]?.text || ''
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error(`No JSON in response: ${raw.slice(0,100)}`)
  return JSON.parse(raw.slice(s, e + 1))
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  try {
    const { nativeLang, targetLang, genreLabels, storyPrompt, level, theme, totalPages, checkOnly } = await req.json()
    const levelMap: Record<string,string> = {
      beginner: 'absolute beginner: max 5 words per sentence, present tense only',
      elementary: 'elementary: simple short sentences, basic everyday vocabulary',
      intermediate: 'intermediate: varied sentences, broader vocabulary, some idioms',
      advanced: 'advanced: complex grammar, rich vocabulary, natural expressions',
    }
    const levelDesc = levelMap[level] || 'elementary'
    const extra = storyPrompt ? `Story direction: "${storyPrompt}"` : ''
    const genre = genreLabels?.includes(',') ? `Blend genres: ${genreLabels}` : `Genre: ${genreLabels || 'daily life'}`

    if (checkOnly) {
      const parsed = await callClaude(`Generate 2 sample paragraphs in ${targetLang} for a ${levelDesc} learner. Theme: ${theme || 'daily life'}. ${genre}.
Return ONLY this JSON:
{"title":"title in ${targetLang}","titleTr":"title in ${nativeLang}","paragraphs":[{"sentences":[{"text":"sentence","tr":"translation in ${nativeLang}"}],"words":[{"word":"word","pron":"pronunciation","meaning":"meaning in ${nativeLang}","example":"example"}]}]}
Exactly 2 paragraphs, 4 sentences each, 3 words each.`, 2000, apiKey)
      if (!Array.isArray(parsed.paragraphs)) throw new Error('Missing paragraphs')
      return NextResponse.json({ ...parsed, checkOnly: true })
    }

    const pages = totalPages || 10
    if (pages <= 10) {
      const parsed = await callClaude(`Write a ${pages}-paragraph story in ${targetLang}. Level: ${levelDesc}. Theme: ${theme}. ${genre}. ${extra}. Translate to ${nativeLang}.
Return ONLY this JSON:
{"title":"title in ${targetLang}","titleTr":"title in ${nativeLang}","paragraphs":[{"sentences":[{"text":"sentence","tr":"translation in ${nativeLang}"}],"words":[{"word":"word","pron":"pronunciation","meaning":"meaning in ${nativeLang}","example":"example in ${targetLang} — translation"}]}]}
Exactly ${pages} paragraphs, 4 sentences each, 3-4 words each, coherent story.`, 6000, apiKey)
      if (!Array.isArray(parsed.paragraphs)) throw new Error('Missing paragraphs')
      return NextResponse.json(parsed)
    }

    const parts = Math.ceil(pages / 10)
    let allParagraphs: unknown[] = []
    let title = '', titleTr = ''
    for (let i = 0; i < parts; i++) {
      const count = Math.min(10, pages - i * 10)
      const context = i === 0 ? '' : `Continue the story titled "${title}". Part ${i+1}/${parts}.`
      const parsed = await callClaude(`Write ${count} paragraphs in ${targetLang}. ${context} Level: ${levelDesc}. Theme: ${theme}. ${genre}. ${extra}. Translate to ${nativeLang}.
Return ONLY this JSON:
{"title":"${i===0 ? `title in ${targetLang}` : ''}","titleTr":"${i===0 ? `title in ${nativeLang}` : ''}","paragraphs":[{"sentences":[{"text":"sentence","tr":"translation in ${nativeLang}"}],"words":[{"word":"word","pron":"pronunciation","meaning":"meaning in ${nativeLang}","example":"example"}]}]}
Exactly ${count} paragraphs, 4 sentences each, 3-4 words each.`, 6000, apiKey)
      if (i === 0) { title = parsed.title || ''; titleTr = parsed.titleTr || '' }
      if (Array.isArray(parsed.paragraphs)) allParagraphs = [...allParagraphs, ...parsed.paragraphs]
    }
    if (!allParagraphs.length) throw new Error('No paragraphs generated')
    return NextResponse.json({ title, titleTr, paragraphs: allParagraphs })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
