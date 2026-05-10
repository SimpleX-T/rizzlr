'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { VersionedTransaction } from '@solana/web3.js'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

type ChallengeDetail = {
  id: string
  creatorWallet: string
  challengerWallet: string | null
  personaName: string
  personaAvatar?: string
  timeLimitSeconds: number
  creatorScore: number
  wagerType: 'free' | 'sol_escrow'
  wagerLamports: number
  escrowState: string | null
  status: string
  expiresAt: string
  error?: string
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a
}

function solFromLamports(n: number) {
  return (n / 1e9).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}

export function ChallengeAcceptPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const router = useRouter()
  const { connection } = useConnection()
  const { publicKey, signTransaction, connected } = useWallet()

  const [data, setData] = useState<ChallengeDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      setLoadError(null)
      const r = await fetch(`/api/challenges/${encodeURIComponent(id)}`)
      if (cancelled) return
      if (r.status === 404) {
        setLoadError('Challenge not found.')
        return
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string }
        setLoadError(j.error ?? 'Could not load challenge.')
        return
      }
      const j = (await r.json()) as ChallengeDetail
      if (j.error) {
        setLoadError(j.error)
        return
      }
      setData(j)
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const walletPk = publicKey?.toBase58()
  const isCreator = Boolean(data && walletPk && data.creatorWallet === walletPk)
  const isChallenger = Boolean(
    data && walletPk && data.challengerWallet === walletPk,
  )

  const handleAccept = useCallback(async () => {
    if (!id || !publicKey || !signTransaction) return
    setActionError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/actions/challenge/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: publicKey.toBase58() }),
      })
      const payload = (await res.json()) as {
        type?: string
        transaction?: string
        error?: string
        message?: string
      }
      if (!res.ok) {
        throw new Error(payload.error ?? 'Could not prepare accept transaction.')
      }
      if (payload.type !== 'transaction' || !payload.transaction) {
        throw new Error(payload.error ?? 'Unexpected response from server.')
      }
      const b64 = payload.transaction
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const vtx = VersionedTransaction.deserialize(bytes)
      const signed = await signTransaction(vtx)
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      })
      const latest = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction(
        { signature: sig, ...latest },
        'confirmed',
      )
      router.push(`/?challenge=${encodeURIComponent(id)}`)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Transaction failed.')
    } finally {
      setSubmitting(false)
    }
  }, [connection, id, publicKey, router, signTransaction])

  const goPlay = useCallback(() => {
    router.push(`/?challenge=${encodeURIComponent(id)}`)
  }, [id, router])

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-8"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          rizzlr
        </Link>

        {loadError && (
          <div
            className="rounded-2xl border p-6"
            style={{
              borderColor: 'var(--border-soft)',
              background: 'var(--surface-strong)',
            }}
          >
            <p style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {loadError}
            </p>
          </div>
        )}

        {!loadError && !data && (
          <div className="flex justify-center py-16">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--muted)' }}
            />
          </div>
        )}

        {data && (
          <div
            className="rounded-2xl border p-6 shadow-xl"
            style={{
              borderColor: 'var(--border-soft)',
              background:
                'color-mix(in oklch, var(--surface-strong) 94%, transparent)',
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-2"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
            >
              PvP challenge
            </p>
            <h1
              className="text-2xl mb-1"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--text)',
                letterSpacing: '0.04em',
              }}
            >
              Beat {data.creatorScore}% rizz
            </h1>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
            >
              {data.timeLimitSeconds}s rounds · same persona as the creator
            </p>

            <div className="flex items-center gap-4 mb-6">
              {data.personaAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.personaAvatar}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                  style={{ border: '1px solid var(--border-soft)' }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl shrink-0"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-soft)',
                  }}
                />
              )}
              <div>
                <p
                  className="font-medium"
                  style={{
                    color: 'var(--text)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {data.personaName}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--faint)', fontFamily: 'var(--font-body)' }}
                >
                  Creator {shortAddr(data.creatorWallet)}
                </p>
              </div>
            </div>

            {data.wagerType === 'sol_escrow' && (
              <div
                className="rounded-xl px-4 py-3 mb-6 text-sm"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span style={{ color: 'var(--muted)' }}>Wager · </span>
                <span className="font-semibold">
                  {solFromLamports(Number(data.wagerLamports))} SOL
                </span>
                <span style={{ color: 'var(--muted)' }}> per side (escrow)</span>
              </div>
            )}

            {data.status === 'expired' && (
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                This challenge has expired.
              </p>
            )}

            {isCreator && data.status === 'open' && (
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                You created this challenge. Share the invite link with a friend —
                they connect their wallet here to accept
                {data.wagerType === 'sol_escrow' ? ' and deposit into escrow' : ''}.
              </p>
            )}

            {!isCreator &&
              data.status === 'open' &&
              data.wagerType === 'sol_escrow' &&
              data.escrowState !== 'ready_for_challenger' && (
                <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                  Waiting for the creator to finish funding escrow on-chain. Ask them
                  to complete the deposit in rizzlr after creating the challenge.
                </p>
              )}

            {!isCreator &&
              data.status === 'open' &&
              (data.wagerType === 'free' ||
                data.escrowState === 'ready_for_challenger') && (
                <>
                  <div className="flex flex-col gap-3 mb-4">
                    <WalletMultiButton className="wallet-btn w-full justify-center rounded-lg" />
                  </div>
                  {connected && signTransaction ? (
                    <Button
                      type="button"
                      className="w-full h-11 uppercase tracking-[0.12em] text-xs"
                      disabled={submitting}
                      onClick={() => void handleAccept()}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                          Signing…
                        </>
                      ) : data.wagerType === 'sol_escrow' ? (
                        'Accept & deposit wager'
                      ) : (
                        'Accept challenge'
                      )}
                    </Button>
                  ) : (
                    <p
                      className="text-xs text-center"
                      style={{
                        color: 'var(--faint)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Connect a Solana wallet to continue.
                    </p>
                  )}
                </>
              )}

            {data.status === 'accepted' && isCreator && (
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                A challenger accepted
                {data.wagerType === 'sol_escrow' ? ' and deposited' : ''}. They may be
                playing now — check results from your rizzlr lobby when ready.
              </p>
            )}

            {data.status === 'accepted' && isChallenger && (
              <>
                <p
                  className="text-sm mb-4"
                  style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                >
                  You&apos;re in. Jump into the game with the same persona and beat the
                  score.
                </p>
                <Button
                  type="button"
                  className="w-full h-11 uppercase tracking-[0.12em] text-xs"
                  onClick={goPlay}
                >
                  Play now
                </Button>
              </>
            )}

            {data.status === 'accepted' && !isChallenger && !isCreator && (
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                This challenge was already accepted by another wallet.
              </p>
            )}

            {['settled', 'challenger_played', 'cancelled'].includes(data.status) &&
              !isCreator && (
                <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
                  This challenge is no longer open.
                </p>
              )}

            {actionError && (
              <p
                className="text-sm mt-4"
                style={{ color: 'tomato', fontFamily: 'var(--font-body)' }}
              >
                {actionError}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
