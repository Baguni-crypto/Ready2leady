import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { word, targetLang, nativeLang } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        system: 'Respond with ONLY valid JSON, no markdown, no code blocks.',
        messages: [{
          role: 'user',
          content: `Return JSON for the word "${word}" in ${targetLang}:
{"word":"${word}","pron":"pronunciation/romanization","meaning":"meaning in ${nativeLang}","example":"${targetLang} example sentence — ${nativeLang} translation"}`
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: err }, { status: response.status })
    }

    const data = await response.json()
    const raw = data.content[0].text || ''
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    const jsonStr = start !== -1 && end > start ? raw.slice(start, end + 1) : raw
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json(parsed)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
