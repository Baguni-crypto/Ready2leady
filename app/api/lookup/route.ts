import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { word, targetLang, nativeLang } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: 'Respond with ONLY valid JSON, no markdown, no code blocks.',
      messages: [{
        role: 'user',
        content: `Return JSON for the word "${word}" in ${targetLang}:
{"word":"${word}","pron":"pronunciation/romanization","meaning":"meaning in ${nativeLang}","example":"${targetLang} example sentence — ${nativeLang} translation"}`
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
