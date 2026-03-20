# Complete & Next Scene — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

After completing a scene, the user can optionally navigate directly to the next scene in the search results list without returning to the search page first. This keeps the review flow moving without manual back-navigation.

## Implementation

### 1. Persist scene list on navigation (`src/app/search/page.tsx`)

In `handleSceneClick`, before `router.push`, write the current ordered scene ID list to sessionStorage:

```typescript
sessionStorage.setItem("scene-list", JSON.stringify(scenes.map(s => s.id)));
```

This captures the list as it was ordered at the moment the user clicked (respecting current sort order). The list is session-scoped — it clears when the tab closes and does not leak between sessions.

### 2. New field on `CompletionDefaults` (`src/serverConfig.ts`)

```typescript
switchToNextScene?: boolean;
```

Optional, so existing saved configs without it default to `true` in the modal (same pattern as the other pre-step fields added previously).

### 3. New prop and checkbox in `CompletionModal` (`src/components/marker/CompletionModal.tsx`)

Add prop:
```typescript
hasNextScene: boolean;
```

When `hasNextScene` is `true`, render a new checkbox at the **bottom** of the action list:

- Label: **"Switch to next scene after completing"**
- Default checked: `true` (when `hasNextScene` is true)
- `id="switchToNextScene"`
- Driven by `selectedActions.switchToNextScene ?? true`

When `hasNextScene` is `false`, the checkbox is not rendered (no next scene available).

Update `useState` initial value and `loadDefaults` spread to include `switchToNextScene: true` (same backward-compat spread pattern used for `deleteRejected` and `convertCorrespondingTags`).

### 4. Wire up in `page.tsx` (`src/app/marker/[sceneId]/page.tsx`)

**Compute `hasNextScene`:**

```typescript
const nextSceneId = useMemo(() => {
  if (typeof window === "undefined") return null;
  try {
    const list: string[] = JSON.parse(sessionStorage.getItem("scene-list") ?? "[]");
    const idx = list.indexOf(scene?.id ?? "");
    return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  } catch {
    return null;
  }
}, [scene?.id]);
```

Pass `hasNextScene={nextSceneId !== null}` to `<CompletionModal>`.

**After completion in `executeCompletionWrapper`:**

After `await executeCompletion(...)`, if `selectedActions.switchToNextScene` and `nextSceneId` is not null, navigate:

```typescript
if (selectedActions.switchToNextScene && nextSceneId) {
  router.push(`/marker/${nextSceneId}`);
} else if (selectedActions.switchToNextScene && !nextSceneId) {
  router.push("/search");
}
```

If `switchToNextScene` is false (unchecked), do nothing — stay on the current scene as today.

## Edge Cases

- **Last scene in list**: `nextSceneId` is null → `hasNextScene` is false → checkbox is not shown
- **No scene list in sessionStorage** (user navigated directly): `nextSceneId` is null → checkbox not shown
- **Malformed sessionStorage data**: caught by try/catch → `nextSceneId` is null
- **Scene ID not found in list**: `indexOf` returns -1 → `nextSceneId` is null

## Out of Scope

- Updating the scene list when scenes are added/removed during the session
- "Previous scene" navigation
- Showing scene position (e.g. "3 of 47") in the UI
