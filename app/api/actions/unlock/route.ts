import { NextRequest, NextResponse } from 'next/server'
import { PREMIUM_PERSONAS } from '@/lib/game-store'
import { ACTIONS_CORS_HEADERS } from '@/lib/solana-actions-cors'

// GET handler returns the Action metadata for unlocking a persona
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const personaId = searchParams.get('persona')
  
  const persona = PREMIUM_PERSONAS.find(p => p.id === personaId)
  
  if (!persona) {
    return NextResponse.json(
      { error: 'Persona not found' },
      { status: 404, headers: ACTIONS_CORS_HEADERS }
    )
  }

  const payload = {
    icon: `${request.nextUrl.origin}/personas/${persona.id}.jpg`,
    title: `Unlock ${persona.name}`,
    description: `${persona.vibe} | ${persona.accent} accent | ${persona.difficulty} difficulty`,
    label: `Unlock for ${persona.unlockCost} SOL`,
    links: {
      actions: [
        {
          label: `Unlock ${persona.name} (${persona.unlockCost} SOL)`,
          href: `/api/actions/unlock?persona=${persona.id}`,
        },
      ],
    },
  }

  return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS })
}

// POST handler processes the unlock purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get('persona')
    
    const persona = PREMIUM_PERSONAS.find(p => p.id === personaId)
    
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      )
    }

    // In production, this would:
    // 1. Validate the account from body.account
    // 2. Create a Solana transaction transferring persona.unlockCost SOL
    // 3. Store the unlock in a database
    // 4. Return the serialized transaction for signing

    const response = {
      type: 'action',
      message: `${persona.name} has been unlocked! Start rizzing.`,
      links: {
        next: {
          type: 'inline',
          action: {
            type: 'external-link',
            label: 'Play Now',
            href: `${request.nextUrl.origin}/?persona=${persona.id}`,
          },
        },
      },
    }

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS })
  } catch (error) {
    console.error('[v0] Unlock action error:', error)
    return NextResponse.json(
      { error: 'Failed to process unlock' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { headers: ACTIONS_CORS_HEADERS })
}
