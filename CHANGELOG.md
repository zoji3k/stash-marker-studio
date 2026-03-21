# Changelog

All notable changes to this fork of stash-marker-studio are documented here.

---

## [2.3.3] — Current

### Bug Fixes
- Allow completion modal to open on scenes with no action markers (manual tags and reviewed status still applicable)
- Fix tag selection in marker edit mode clearing the input field after selection
- Fix tag selection auto-saving and exiting edit mode immediately on pick

### Shot Boundary Detection
- Restore ffmpeg downscale step before scenedetect (reduces false positives from compression noise in high-bitrate sources)
- Use opencv backend only — Alpine's py3-opencv handles all video I/O including corrupt files
- Tune scenedetect to threshold 20 with 2s minimum scene length (threshold 27 missed most cuts, threshold 15 over-detected)

---

## [2.3.x] — Shot Boundary Detection

### Features
- **Per-scene shot boundary detection** via new `POST /api/shot-boundary/process` route
  - Runs ffmpeg downscale → PySceneDetect → creates markers in Stash automatically
  - Tags scene with `shotBoundaryProcessed` tag on completion
  - Re-detection deletes existing shot boundary markers before creating new ones
  - 600s request timeout for long videos
- **Detect Shots button** in marker page header (left of Complete)
  - Shows spinner while detecting
  - Reads "Re-detect Shots" if scene already has shot boundary markers
- **Tag search autocomplete** on completion modal page 2 — search and add any non-`_AI` Stash tag manually

### Infrastructure
- Docker volume mount for media library (`/mnt/files/Files:/data`) so shot boundary route can access video files
- PySceneDetect installed in container with Alpine's pre-built `py3-opencv` for musl compatibility

---

## [2.2.x] — Header & UI Improvements

### Features
- Scene title in marker page header is a clickable link to the scene in Stash (opens in new tab)
- Scene metadata in header: studio name, star rating, play count, O-counter
- Header layout reorganised: back button left, title+metadata centre, actions right
- Completion modal page 2: teal manual tags show an `×` and are removable by click
- Corresponding tag conversion: clickable remove-tags on page 2 show add/remove status

### Bug Fixes
- Show filename on search page when scene has no title
- Fetch `files.basename` in searchScenes query for filename fallback

---

## [2.1.x] — Completion Modal & Tag Management

### Features
- Consolidate header buttons into "More" dropdown (Delete Rejected, Collect AI Feedback, Convert Corresponding Tags)
- Corresponding tag conversion: full preview modal with per-marker confirmation
- Completion modal page 2: shows tags to add and remove with previews
- "Next scene" navigation after completing a scene (from session scene list)
- Manual tag addition on completion modal page 2 with autocomplete search

### Refactoring
- Use `allTags` for corresponding tag lookup instead of separate API call per marker
- Marker operations extracted into dedicated hooks

---

## [2.0.x] — Redux Migration & Architecture

### Features
- Full Redux Toolkit migration for all marker state management
- Marker edit panel with inline time editing (start/end seconds)
  - Set start/end to current video time via ▶ button
  - Tag autocomplete integrated into edit row
- Marker duplication (keyboard shortcut)
- Copy/paste marker times between markers
- Merge marker properties from one marker to another
- Split current marker at playhead
- Split video cut (shot boundary) markers

### Keyboard Shortcuts
- Keyboard shortcut modal (grouped by left/right hand)
- Dynamic keyboard shortcuts configurable in settings
- Navigation: Enter, I, O use marker ID for reliable navigation
- N/M for previous/next unprocessed marker (global and per-swimlane)
- Swimlane navigation (up/down between tag groups)

### Bug Fixes
- Toasts and modals no longer shown underneath timeline markers
- Fix unreliable selecting of first part of a split marker
- Confirmed/rejected markers can be reset by pressing the key again
- Collected markers set as rejected

---

## [1.3.x] — Refactoring & Stability (pre-fork baseline)

### Upstream Changes (included from original repo)
- Shot boundary markers filterable from action markers
- `isMarkerManual`, `isUnprocessed` logic in markerLogic with unit tests
- `calculateMarkerSummary` used on search page
- Marker group names shown on timeline
- PySceneDetect script introduced (`src/scripts/pyscenedetect-process.js`)
- Support collecting feedback on incorrect AI markers
- Minimum Stash version documented (0.28+)
- Timeline split into smaller components
- Time formatting utilities extracted to dedicated module

---

## [1.0.0] — Original Fork Point

Forked from [Skier's stash-marker-studio](https://github.com/skier233/stash-marker-studio) at version 1.0.0.

Original features:
- Marker review workflow (confirm/reject with keyboard shortcuts)
- Tag conversion (AI tags → real tags via "Corresponding Tag" metadata)
- Timeline visualisation with swimlanes per tag group
- Shot boundary marker support
- PySceneDetect integration (external script)
- Search page with scene filtering
- Keyboard-first design (left hand modifies, right hand navigates)
- Docker support
