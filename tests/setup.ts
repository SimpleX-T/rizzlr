import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: vi.fn(() =>
      Promise.resolve({
        getTracks: () => [],
      } as unknown as MediaStream)
    ),
  },
})

Element.prototype.scrollIntoView = vi.fn()
globalThis.scrollTo = vi.fn() as typeof window.scrollTo
