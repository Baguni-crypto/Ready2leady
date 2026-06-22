import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  
  // 디버그: 환경변수 확인
  if (!apiKey) {
    return NextResponse.json({ error: 'NO API KEY - ANTHROPIC_API_KEY is empty' }, { status: 500 })
  }
  
  // 디버그: API 연결 테스트
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say "ok" in JSON: {"status":"ok"}' }]
      })
    })
    const data = await res.json()
    return NextResponse.json({ debug: true, status: res.status, data })
  } catch (e: unknown) {
    return NextResponse.json({ error: 'fetch failed', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
