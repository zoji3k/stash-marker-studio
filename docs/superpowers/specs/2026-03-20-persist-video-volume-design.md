# Persist Video Volume & Mute State — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Persist the video player's volume and mute state across scene changes and page reloads using `localStorage`. Currently the browser resets to full volume on every new scene load.

## Implementation

All changes are in `src/components/marker/video/VideoPlayer.tsx`.

### On mount: restore saved state

Add a `useEffect` with empty deps `[]` that runs once after the video element is available:

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  const savedVolume = localStorage.getItem("player-volume");
  const savedMuted = localStorage.getItem("player-muted");
  if (savedVolume !== null) video.volume = parseFloat(savedVolume);
  if (savedMuted !== null) video.muted = savedMuted === "true";
}, []);
```

### On volume change: save state

Add a `volumechange` event listener inside the existing event-listener `useEffect`:

```typescript
const handleVolumeChange = () => {
  localStorage.setItem("player-volume", String(video.volume));
  localStorage.setItem("player-muted", String(video.muted));
};
video.addEventListener("volumechange", handleVolumeChange);
// cleanup:
video.removeEventListener("volumechange", handleVolumeChange);
```

## Storage Keys

- `player-volume` — float string `"0"` to `"1"`
- `player-muted` — boolean string `"true"` or `"false"`

## Out of Scope

- Redux `video.volume` state (unused, left as-is)
- Playback rate persistence
