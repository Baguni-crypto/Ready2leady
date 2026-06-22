import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { nativeLang, targetLang, genreLabels, storyPrompt, level, theme, totalPages, checkOnly } = await req.json()

    const levelMap: Record<string, string> = {
      beginner: 'absolute beginner (very basic words, extremely short simple sentences, present tense only, max 5 words per sentence)',
      elementary: 'elementary (simple sentences, basic grammar, common everyday vocabulary)',
      intermediate: 'intermediate (varied sentence structures, broader vocabulary, some idioms)',
      advanced: 'advanced (complex grammar, rich vocabulary, natural native-like expressions)',
    }
    const themeMap: Record<string, string> = {
      fairy: 'fairy tale style with magic, animals, and fantasy worlds',
      youth: 'school life, friendship, and youthful adventures',
      young_adult: 'university life, travel, and self-discovery',
      adult_life: 'workplace, relationships, and personal growth',
      family: 'life balance, family bonds, and career',
      life_exp: 'life experiences, culture, and world travel',
    }

    const levelDesc = levelMap[level] || 'elementary'
    const themeDesc = themeMap[theme] || theme
    const extraPrompt = storyPrompt ? `Additional story direction from user: "${storyPrompt}"` : ''
    const multiNote = genreLabels?.includes(',') ? `Blend these genres: ${genreLabels}` : `Genre: ${genreLabels}`

    if (checkOnly) {
      const prompt = `You are a language learning story generator. Respond with ONLY valid JSON.

Generate exactly 2 sample paragraphs (4 sentences each) in ${targetLang} for a ${levelDesc} learner.
Theme: ${themeDesc}. ${multiNote}. ${extraPrompt}

JSON:
{
  "title": "sample title in ${targetLang}",
  "titleTr": "title in ${nativeLang}",
  "paragraphs": [
    {
      "sentences": [{"text": "sentence in ${targetLang}", "tr": "translation in ${nativeLang}"}],
      "words": [{"word": "word", "pron": "pronunciation", "meaning": "meaning in ${nativeLang}", "example": "example"}]
    }
  ]
}

Exactly 2 paragraphs, 4 sentences each, 3 key words per paragraph. ONLY JSON.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: 'Respond with ONLY valid JSON. No markdown. Start with { end with }.', messages: [{ role: 'user', content: prompt }] })
      })
      const data = await res.json()
      const raw = data.content[0].text || ''
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
      return NextResponse.json({ ...JSON.parse(raw.slice(s, e + 1)), checkOnly: true })
    }

    const paraCount = totalPages || 10
    const prompt = `You are a language learning story generator. Respond with ONLY valid JSON.

Create a complete language learning story with exactly ${paraCount} paragraphs in ${targetLang}.
- Level: ${levelDesc}
- Theme: ${themeDesc}
- ${multiNote}
- ${extraPrompt}
- Reader's native language: ${nativeLang}

JSON:
{
  "title": "story title in ${targetLang}",
  "titleTr": "title in ${nativeLang}",
  "paragraphs": [
    {
      "sentences": [{"text": "sentence in ${targetLang}", "tr": "translation in ${nativeLang}"}],
      "words": [{"word": "word", "pron": "pronunciation/romanization", "meaning": "meaning in ${nativeLang}", "example": "${targetLang} example — ${nativeLang} translation"}]
    }
  ]
}

Requirements:
- Exactly ${paraCount} paragraphs, each with exactly 4 sentences
- Each paragraph: 3-4 key vocabulary words
- Coherent story with beginning, middle, end
- Match the level strictly
- ONLY output JSON`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 8000, system: 'Respond with ONLY valid JSON. No markdown. Start with { end with }.', messages: [{ role: 'user', content: prompt }] })
    })

    if (!res.ok) { const err = await res.text(); return NextResponse.json({ error: err }, { status: res.status }) }
    const data = await res.json()
    const raw = data.content[0].text || ''
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
    return NextResponse.json(JSON.parse(raw.slice(s, e + 1)))
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
