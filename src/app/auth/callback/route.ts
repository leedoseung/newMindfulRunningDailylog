import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=expired', origin))
    }
  }

  return NextResponse.redirect(new URL('/', origin))
}
