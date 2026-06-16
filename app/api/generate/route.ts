import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { nativeLang, targetLang, genreLabels, keywords } = await req.json()

    const kw = keywords?.length ? `Keywords to include: ${keywords.join(', ')}` : ''
    const multiNote = genreLabels.includes(',')
      ? `Blend these genres naturally: ${genreLabels}`
      : `Genre: ${genreLabels}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are a language learning story generator. Respond with ONLY valid JSON, no markdown, no code blocks, no explanation. Start directly with { and end with }.',
      messages: [{
        role: 'user',
        content: `Create a short language learning story with this exact JSON structure:
{
  "title": "story title in ${targetLang}",
  "titleTr": "title translation in ${nativeLang}",
  "level": "초급",
  "genreLabel": "${genreLabels}",
  "paragraphs": [
    {
      "sentences": [
        {"text": "sentence in ${targetLang}", "tr": "translation in ${nativeLang}"}
      ],
      "words": [
        {"word": "key word", "pron": "pronunciation/romanization", "meaning": "meaning in ${nativeLang}", "example": "${targetLang} example — ${nativeLang} translation"}
      ]
    }
  ]
}

Requirements:
- ${multiNote}
- ${kw}
- Story language: ${targetLang}
- Reader native language: ${nativeLang}
- Exactly 5 paragraphs, each with exactly 4 sentences
- Each paragraph: 3-4 key vocabulary words
- Simple sentences for beginner learners
- ONLY output JSON`
      }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    const jsonStr = start !== -1 && end > start ? raw.slice(start, end + 1) : raw
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json(parsed)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
