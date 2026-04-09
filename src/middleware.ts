import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Fetch profile for permission checks (must_change_password + role)
  if (user && !pathname.startsWith('/change-password')) {
    const { data: profile } = await supabase
      .from('users')
      .select('must_change_password, roles(name)')
      .eq('id', user.id)
      .single()

    if (profile?.must_change_password) {
      const url = request.nextUrl.clone()
      url.pathname = '/change-password'
      const redirectRes = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((c) =>
        redirectRes.cookies.set(c.name, c.value)
      )
      return redirectRes
    }

    const role = (profile?.roles as unknown as { name: string } | null)?.name ?? ''

    // ── TDA / Staff: restrict to allowed sections only ─────────────────────────
    const TDA_ALLOWED = [
      '/documents', '/risk-assessments', '/method-statements',
      '/coshh', '/equipment', '/training', '/ppe', '/dse', '/profile', '/change-password',
      '/acknowledgements',
    ]
    if (role === 'TDA / Staff') {
      const allowed = TDA_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/documents'
        const redirectRes = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value))
        return redirectRes
      }
    }

    // ── Read-only roles: block all write routes ─────────────────────────────────
    const READ_ONLY_ROLES = ['Read-Only', 'Site Manager', 'TDA / Staff']
    if (READ_ONLY_ROLES.includes(role)) {
      const isWriteRoute =
        pathname.endsWith('/new') ||
        pathname.endsWith('/edit') ||
        /\/edit(\/|$)/.test(pathname) ||
        /\/new(\/|$)/.test(pathname)

      if (isWriteRoute) {
        // Redirect to the nearest parent view page
        let redirectPath = '/dashboard'
        if (pathname.endsWith('/new')) {
          redirectPath = pathname.slice(0, -4) || '/dashboard'
        } else {
          // /foo/[id]/edit → /foo/[id]
          redirectPath = pathname.replace(/\/edit(\/.*)?$/, '') || '/dashboard'
        }
        const url = request.nextUrl.clone()
        url.pathname = redirectPath
        const redirectRes = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value))
        return redirectRes
      }
    }

    // ── Block /settings for non-System-Admin ───────────────────────────────────
    if (pathname.startsWith('/settings') && role !== 'System Admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const redirectRes = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value))
      return redirectRes
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
