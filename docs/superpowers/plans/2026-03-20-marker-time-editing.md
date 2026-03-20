# Marker Time Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable start/end time fields to the inline marker edit form, alongside the existing tag autocomplete, with "Set to current" buttons to stamp the video playhead position.

**Architecture:** Add a new `src/core/marker/timeFormat.ts` utility for converting between float seconds and `M:SS.mmm` strings. Extend the `onSaveEditWithTagId` callback signature through `MarkerListItem` → `MarkerList` → `page.tsx` to carry time values, then dispatch `updateMarkerTimes` sequentially after `updateMarkerTag` when times change.

**Tech Stack:** Next.js 15, TypeScript, Redux Toolkit, Tailwind CSS, Jest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/core/marker/timeFormat.ts` | **Create** | Pure utilities: `formatSecondsForInput`, `parseTimeString` |
| `src/core/marker/timeFormat.test.ts` | **Create** | Unit tests for time utilities |
| `src/services/StashappService.ts` | **Modify** line 873 | Fix falsy null check in `updateMarkerTimes` |
| `src/components/marker/MarkerListItem.tsx` | **Modify** | Add time inputs, "Set to current" buttons, validation, new prop signature |
| `src/components/marker/MarkerList.tsx` | **Modify** line 23 | Update `onSaveEditWithTagId` prop type |
| `src/app/marker/[sceneId]/page.tsx` | **Modify** lines 275-299 | Extend `handleSaveEditWithTagId` to dispatch `updateMarkerTimes` |

---

## Task 1: Time Format Utilities (TDD)

**Files:**
- Create: `src/core/marker/timeFormat.ts`
- Create: `src/core/marker/timeFormat.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/core/marker/timeFormat.test.ts`:

```typescript
import { formatSecondsForInput, parseTimeString } from "./timeFormat";

describe("formatSecondsForInput", () => {
  it("formats zero seconds", () => {
    expect(formatSecondsForInput(0)).toBe("0:00.000");
  });

  it("formats seconds under one minute", () => {
    expect(formatSecondsForInput(12)).toBe("0:12.000");
  });

  it("formats seconds with milliseconds", () => {
    expect(formatSecondsForInput(12.5)).toBe("0:12.500");
  });

  it("formats exactly one minute", () => {
    expect(formatSecondsForInput(60)).toBe("1:00.000");
  });

  it("formats minutes and seconds", () => {
    expect(formatSecondsForInput(64.5)).toBe("1:04.500");
  });

  it("does not zero-pad minutes", () => {
    expect(formatSecondsForInput(125)).toBe("2:05.000");
  });

  it("handles large minute values (no hours component)", () => {
    expect(formatSecondsForInput(3900)).toBe("65:00.000");
  });

  it("rounds to 3 decimal places", () => {
    expect(formatSecondsForInput(1.0005)).toBe("0:01.001");
  });
});

describe("parseTimeString", () => {
  it("parses M:SS.mmm", () => {
    expect(parseTimeString("0:12.000")).toBe(12);
  });

  it("parses M:SS.mmm with fractional seconds", () => {
    expect(parseTimeString("1:04.500")).toBeCloseTo(64.5);
  });

  it("parses MM:SS.mmm (zero-padded minutes)", () => {
    expect(parseTimeString("01:04.500")).toBeCloseTo(64.5);
  });

  it("parses large minute values", () => {
    expect(parseTimeString("65:00.000")).toBe(3900);
  });

  it("parses M:SS without milliseconds", () => {
    expect(parseTimeString("1:30")).toBe(90);
  });

  it("throws on invalid format", () => {
    expect(() => parseTimeString("abc")).toThrow();
    expect(() => parseTimeString("1:99.000")).toThrow();
    expect(() => parseTimeString("")).toThrow();
  });

  it("throws when seconds >= 60", () => {
    expect(() => parseTimeString("0:60.000")).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /data/docker/new-marker-studio/stash-marker-studio
npm test -- --testPathPattern=timeFormat --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module './timeFormat'`

- [ ] **Step 3: Implement `timeFormat.ts`**

Create `src/core/marker/timeFormat.ts`:

```typescript
/**
 * Formats seconds (float) as "M:SS.mmm" without zero-padded minutes.
 * Minutes grow unbounded (e.g. 65:00.000 for 3900s). No hours component.
 */
export function formatSecondsForInput(s: number): string {
  const totalMs = Math.round(s * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${min}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

/**
 * Parses "M:SS.mmm" or "MM:SS.mmm" into float seconds.
 * Throws on invalid format or out-of-range values.
 */
export function parseTimeString(s: string): number {
  const match = /^(\d+):(\d{2})(?:\.(\d{1,3}))?$/.exec(s.trim());
  if (!match) throw new Error(`Invalid time format: "${s}"`);
  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  if (sec >= 60) throw new Error(`Seconds out of range in: "${s}"`);
  const msRaw = match[3] ?? "0";
  const ms = parseInt(msRaw.padEnd(3, "0"), 10);
  return min * 60 + sec + ms / 1000;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=timeFormat --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add src/core/marker/timeFormat.ts src/core/marker/timeFormat.test.ts
git commit -m "feat: add time format utilities for marker time editing"
```

---

## Task 2: Fix Pre-existing Bug in `StashappService`

**Files:**
- Modify: `src/services/StashappService.ts` line 873

- [ ] **Step 1: Fix the falsy null check**

In `src/services/StashappService.ts`, change line 873 from:
```typescript
end_seconds: endSeconds ? Math.round(endSeconds * 1000) / 1000 : null,
```
to:
```typescript
end_seconds: endSeconds !== null ? Math.round(endSeconds * 1000) / 1000 : null,
```

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/services/StashappService.ts
git commit -m "fix: use strict null check for end_seconds in updateMarkerTimes"
```

---

## Task 3: Extend Callback Signatures

**Files:**
- Modify: `src/components/marker/MarkerListItem.tsx` line 33
- Modify: `src/components/marker/MarkerList.tsx` line 23
- Modify: `src/app/marker/[sceneId]/page.tsx` lines 275-299

This task updates the type signature of `onSaveEditWithTagId` through all three layers and adds the time dispatch logic in `page.tsx`. No UI changes yet — just the plumbing.

- [ ] **Step 1: Update `MarkerListItemProps` in `MarkerListItem.tsx`**

In `src/components/marker/MarkerListItem.tsx`, change line 33 from:
```typescript
  onSaveEditWithTagId: (marker: SceneMarker, tagId?: string) => Promise<void>;
```
to:
```typescript
  onSaveEditWithTagId: (marker: SceneMarker, tagId?: string, startSeconds?: number, endSeconds?: number | null) => Promise<void>;
```

- [ ] **Step 2: Update `MarkerListProps` in `MarkerList.tsx`**

In `src/components/marker/MarkerList.tsx`, change line 23 from:
```typescript
  onSaveEditWithTagId: (marker: SceneMarker, tagId?: string) => Promise<void>;
```
to:
```typescript
  onSaveEditWithTagId: (marker: SceneMarker, tagId?: string, startSeconds?: number, endSeconds?: number | null) => Promise<void>;
```

- [ ] **Step 3: Extend `handleSaveEditWithTagId` in `page.tsx`**

In `src/app/marker/[sceneId]/page.tsx`, replace the `handleSaveEditWithTagId` useCallback (lines 275-300) with the following. Note: the existing `console.log("Updating marker tag:", ...)` debug statement (lines 279-284) is intentionally removed in this replacement — it is no longer needed now that the save logic is stable.

```typescript
  const handleSaveEditWithTagId = useCallback(
    async (marker: SceneMarker, tagId?: string, startSeconds?: number, endSeconds?: number | null) => {
      const finalTagId = tagId || editingTagId;
      if (finalTagId !== marker.primary_tag.id && scene) {
        try {
          await dispatch(updateMarkerTag({
            sceneId: scene.id,
            markerId: marker.id,
            tagId: finalTagId
          })).unwrap();
        } catch (error) {
          console.error("Error updating marker tag:", error);
          dispatch(setError(`Failed to update marker tag: ${error}`));
        }
      }

      if (scene && (startSeconds !== undefined || endSeconds !== undefined)) {
        const parsedStart = startSeconds ?? marker.seconds;
        const parsedEnd = endSeconds !== undefined ? endSeconds : (marker.end_seconds ?? null);
        const startChanged = parsedStart !== marker.seconds;
        const endChanged = parsedEnd !== (marker.end_seconds ?? null);
        if (startChanged || endChanged) {
          try {
            await dispatch(updateMarkerTimes({
              sceneId: scene.id,
              markerId: marker.id,
              startTime: parsedStart,
              endTime: parsedEnd,
            })).unwrap();
          } catch (error) {
            console.error("Error updating marker times:", error);
            dispatch(setError(`Failed to update marker times: ${error}`));
          }
        }
      }

      setEditingMarkerId(null);
      setEditingTagId("");
    },
    [editingTagId, scene, dispatch]
  );
```

Make sure `updateMarkerTimes` is imported in `page.tsx`. Check the existing imports at the top of the file — it should already be imported from `markerSlice`. If not, add it to the import line that includes `updateMarkerTag`.

- [ ] **Step 4: Verify type check passes**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output

- [ ] **Step 5: Run lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/marker/MarkerListItem.tsx src/components/marker/MarkerList.tsx "src/app/marker/[sceneId]/page.tsx"
git commit -m "feat: extend save callback to carry start/end seconds through component chain"
```

---

## Task 4: Add Time Inputs to Edit Form in `MarkerListItem`

**Files:**
- Modify: `src/components/marker/MarkerListItem.tsx`

This is the UI task. When `isEditing`, render the time inputs with "Set to current" buttons inline before the tag autocomplete.

- [ ] **Step 1: Add imports**

In `src/components/marker/MarkerListItem.tsx`, add to the existing imports:

```typescript
import { formatSecondsForInput, parseTimeString } from "../../core/marker/timeFormat";
import { selectCurrentVideoTime } from "../../store/slices/markerSlice";
import { useState, useEffect } from "react";
```

Check the existing imports at the top of the file — `useAppSelector` is already imported from `../../store/hooks`. `React` is already imported as a default import, but `useState` and `useEffect` are NOT currently imported. You must add all three new import lines above — they are not already present in the file.

- [ ] **Step 2: Add state and selector inside the component**

Inside the `MarkerListItem` function body, after the existing `const isEditing = ...` line, add:

```typescript
  const currentVideoTime = useAppSelector(selectCurrentVideoTime);

  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [startTimeError, setStartTimeError] = useState(false);
  const [endTimeError, setEndTimeError] = useState(false);

  // Initialize time strings when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setStartTimeStr(formatSecondsForInput(marker.seconds));
      setEndTimeStr(marker.end_seconds != null ? formatSecondsForInput(marker.end_seconds) : "");
      setStartTimeError(false);
      setEndTimeError(false);
    }
  }, [isEditing, marker.seconds, marker.end_seconds]);
```

- [ ] **Step 3: Add a `handleSaveEdit` function**

After the `useEffect` block, add:

```typescript
  const handleSaveEdit = () => {
    // Initialize with marker's current start time; overwritten on successful parse.
    // Note: parsedStart <= 0 is blocked by validation. A marker at exactly 0:00.000
    // will always fail validation — this is an accepted limitation tied to the
    // service-layer bug workaround (updateMarkerTimes uses a falsy check for end_seconds).
    let parsedStart: number = marker.seconds;
    let parsedEnd: number | null = null; // null = no end time, explicitly allowed
    let hasError = false;

    try {
      parsedStart = parseTimeString(startTimeStr);
      if (parsedStart <= 0) throw new Error("Must be > 0");
      setStartTimeError(false);
    } catch {
      setStartTimeError(true);
      hasError = true;
    }

    if (endTimeStr.trim() !== "") {
      try {
        parsedEnd = parseTimeString(endTimeStr);
        if (parsedEnd <= 0) throw new Error("Must be > 0");
        setEndTimeError(false);
      } catch {
        setEndTimeError(true);
        hasError = true;
      }
    }

    if (!hasError && parsedEnd !== null && parsedStart >= parsedEnd) {
      setStartTimeError(true);
      hasError = true;
    }

    if (!hasError) {
      void onSaveEditWithTagId(marker, editingTagId, parsedStart, parsedEnd);
    }
  };
```

- [ ] **Step 4: Replace the editing UI in JSX**

Find the `isEditing` branch in the JSX (around line 171-183 currently). You are replacing only the **truthy branch** of the ternary — the content between `{isEditing ? (` and the `: (` separator that starts the non-editing branch. Do NOT replace the `: (` or anything after it.

The old truthy branch content is:
```typescript
                <div className="flex items-center space-x-2 flex-1">
                  <TagAutocomplete
                    value={editingTagId}
                    onChange={setEditingTagId}
                    availableTags={availableTags}
                    placeholder="Type to search tags..."
                    className="flex-1"
                    autoFocus={isEditing}
                    onSave={(tagId) => void onSaveEditWithTagId(marker, tagId)}
                    onCancel={onCancelEdit}
                  />
                </div>
```

Replace that content with:

```typescript
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  {/* Start time */}
                  <input
                    type="text"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className={`w-24 bg-gray-700 text-white text-xs px-2 py-1 rounded-sm border ${startTimeError ? "border-red-500" : "border-transparent"}`}
                    placeholder="0:00.000"
                    aria-label="Start time"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setStartTimeStr(formatSecondsForInput(currentVideoTime ?? 0)); }}
                    className="text-xs text-gray-400 hover:text-white px-1"
                    title="Set start to current time"
                  >
                    ▶
                  </button>
                  <span className="text-gray-500 text-xs">→</span>
                  {/* End time */}
                  <input
                    type="text"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className={`w-24 bg-gray-700 text-white text-xs px-2 py-1 rounded-sm border ${endTimeError ? "border-red-500" : "border-transparent"}`}
                    placeholder="none"
                    aria-label="End time"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEndTimeStr(formatSecondsForInput(currentVideoTime ?? 0)); }}
                    className="text-xs text-gray-400 hover:text-white px-1"
                    title="Set end to current time"
                  >
                    ▶
                  </button>
                  {/* Tag */}
                  <TagAutocomplete
                    value={editingTagId}
                    onChange={setEditingTagId}
                    availableTags={availableTags}
                    placeholder="Type to search tags..."
                    className="flex-1 min-w-32"
                    autoFocus={isEditing}
                    onSave={() => handleSaveEdit()}
                    onCancel={onCancelEdit}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                    className="text-xs text-gray-300 hover:text-white px-2 py-1 bg-gray-700 rounded"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-600 rounded"
                  >
                    Cancel
                  </button>
                </div>
```

Note: The `TagAutocomplete` `onSave` previously triggered save on Enter. It still does — but now it calls `handleSaveEdit()` which validates times first. The existing Save/Cancel buttons in `TagAutocomplete` are still rendered internally; the new explicit Save/Cancel buttons here are for time-only saves and for clarity.

- [ ] **Step 5: Check types and lint**

```bash
npx tsc --noEmit 2>&1 | head -30
npm run lint 2>&1 | tail -20
```

Expected: no errors. If `selectCurrentVideoTime` import is missing from `markerSlice`, check the exact export name:

```bash
grep -n "selectCurrentVideoTime\|currentTime" src/store/slices/markerSlice.ts | head -10
```

- [ ] **Step 6: Run all tests**

```bash
npm test -- --no-coverage 2>&1 | tail -30
```

Expected: all passing

- [ ] **Step 7: Commit**

```bash
git add src/components/marker/MarkerListItem.tsx
git commit -m "feat: add start/end time inputs to marker edit form with set-to-current buttons"
```

---

## Task 5: Verify End-to-End in Browser

- [ ] **Step 1: Rebuild and restart the container**

```bash
docker compose up -d --build 2>&1 | tail -10
```

- [ ] **Step 2: Manual smoke test**

1. Open the app and navigate to a scene with markers
2. Click the pencil icon on a marker — confirm the edit row shows: start time input, ▶ button, →, end time input, ▶ button, tag autocomplete, Save, Cancel
3. Verify the time inputs are pre-filled with the marker's current times in `M:SS.mmm` format
4. Click the ▶ button next to start — confirm it stamps the current playhead position
5. Edit the start time manually to an invalid value (e.g. `abc`) — confirm red border appears and Save is blocked
6. Set start >= end — confirm red border on start field
7. Make a valid edit and click Save — confirm the marker updates in the list
8. Edit only the tag, not the times — confirm only `updateMarkerTag` fires (check network tab)
9. Edit only a time — confirm only `updateMarkerTimes` fires
10. Edit both tag and times — confirm both fire sequentially

- [ ] **Step 3: Run final type check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean

- [ ] **Step 4: Final commit if any fixup needed**

```bash
git add -p
git commit -m "fix: <describe any fixups found during smoke test>"
```

---

## Known Limitations

- Markers with `seconds = 0` (at exactly `0:00.000`) cannot be edited via this form — the `<= 0` validation blocks saving. This is intentional to avoid triggering the pre-existing falsy null check bug in `StashappService.updateMarkerTimes()` (now fixed in Task 2, but the `<= 0` guard remains as a safety net).

## Checklist Summary

| Task | Description |
|---|---|
| Task 1 | Time format utilities (TDD) |
| Task 2 | Fix `StashappService` falsy null bug |
| Task 3 | Extend callback signatures + time dispatch in `page.tsx` |
| Task 4 | Add time inputs UI to `MarkerListItem` |
| Task 5 | E2E smoke test + final check |
