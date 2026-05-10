import { GameContainer } from '@/components/game-container'
import { ElevenLabsConvaiWidget } from '@/components/elevenlabs-convai-widget'
import { ElevenLabsMinimalVoiceExample } from '@/components/elevenlabs-minimal-voice-example'

export default function Home() {
  return (
    <>
      {/* <ElevenLabsConvaiWidget /> */}
      {/* <div
        className="fixed bottom-4 right-4 z-100 [&_button]:rounded-md [&_button]:border [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:text-white"
      >
        <ElevenLabsMinimalVoiceExample />
      </div> */}
      <GameContainer />
    </>
  )
}
