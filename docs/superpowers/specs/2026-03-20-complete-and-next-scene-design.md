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

Optional, so existing saved configs without it default to `true` in the modal (same pattern as the other pre-step fields). This field is persisted when the user clicks "Save as Default", like all other `CompletionDefaults` fields.

### 3. New prop and checkbox in `CompletionModal` (`src/components/marker/CompletionModal.tsx`)

Add prop:
```typescript
hasNextScene: boolean;
```

When `hasNextScene` is `true`, render a new checkbox at the **bottom** of the action list:

- Label: **"Switch to next scene after completing"**
- Default checked: `true`
- `id="switchToNextScene"`
- Driven by `selectedActions.switchToNextScene ?? true`

When `hasNextScene` is `false`, the checkbox is not rendered. Because the checkbox is gated on `hasNextScene`, `selectedActions.switchToNextScene` can only be `true` when a next scene actually exists.

Update `useState` initial value and `loadDefaults` spread to include `switchToNextScene: true`. In `loadDefaults`, use the same backward-compat spread pattern as the other fields: provide `switchToNextScene: true` as the default, then spread `...config.completionDefaults` on top, so a saved `false` preference is respected. The `true` default only applies when the field is absent from saved config.

### 4. Wire up in `page.tsx` (`src/app/marker/[sceneId]/page.tsx`)

**Compute `nextSceneId`** inside the component body (client component), declared before `executeCompletionWrapper` so the callback can close over it:

```typescript
const nextSceneId = useMemo(() => {
  try {
    const list: string[] = JSON.parse(sessionStorage.getItem("scene-list") ?? "[]");
    const idx = list.indexOf(scene?.id ?? "");
    return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  } catch {
    return null;
  }
}, [scene?.id]);
```

`scene` is initially `null` in Redux until the data loads, so `nextSceneId` will be `null` on the first render and resolve to the correct value once the scene is available. This means the checkbox may briefly not render on initial load — this is acceptable UX since the modal is not open on first render anyway.

Pass `hasNextScene={nextSceneId !== null}` to `<CompletionModal>`.

**After completion in `executeCompletionWrapper`** (this is a `useCallback` defined inside the component body, so it closes over `nextSceneId`; this function requires modification):

After `await executeCompletion(...)`, navigate if selected:

```typescript
if (selectedActions.switchToNextScene && nextSceneId) {
  router.push(`/marker/${nextSceneId}`);
}
```

The `else` branch (navigate to `/search`) is not needed: when `nextSceneId` is null, `hasNextScene` is false and the checkbox is not rendered, so `switchToNextScene` can never be `true` in that case.

`nextSceneId` must be added to the `useCallback` dependency array.

If `switchToNextScene` is false (unchecked), stay on the current scene as today.

## Edge Cases

- **Last scene in list**: `nextSceneId` is null → `hasNextScene` is false → checkbox not shown
- **No scene list in sessionStorage** (user navigated directly to the page): `nextSceneId` is null → checkbox not shown
- **Malformed sessionStorage data**: caught by try/catch → `nextSceneId` is null
- **Scene ID not found in list**: `indexOf` returns -1 → `nextSceneId` is null

## Out of Scope

- Updating the scene list when scenes are added/removed during the session
- "Previous scene" navigation
- Showing scene position (e.g. "3 of 47") in the UI
