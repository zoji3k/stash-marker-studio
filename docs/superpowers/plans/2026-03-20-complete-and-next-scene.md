# Complete & Next Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After completing a scene, optionally navigate directly to the next scene in the search results list.

**Architecture:** The search page writes the ordered scene ID list to `sessionStorage["scene-list"]` when navigating to a scene. The marker page reads it to compute `nextSceneId`. A new checkbox in the Complete modal ("Switch to next scene after completing") lets the user opt in. After completion, if selected, `router.push` navigates to the next scene.

**Tech Stack:** Next.js 15, TypeScript, Redux Toolkit, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/serverConfig.ts` | **Modify** | Add `switchToNextScene?: boolean` to `CompletionDefaults` |
| `src/app/search/page.tsx` | **Modify** | Write scene ID list to `sessionStorage` in `handleSceneClick` |
| `src/components/marker/CompletionModal.tsx` | **Modify** | Add `hasNextScene` prop and "Switch to next scene" checkbox |
| `src/app/marker/[sceneId]/page.tsx` | **Modify** | Compute `nextSceneId`, pass `hasNextScene` prop, navigate after completion |

---

## Task 1: Add `switchToNextScene` to `CompletionDefaults`

**Files:**
- Modify: `src/serverConfig.ts`

- [ ] **Step 1: Read `src/serverConfig.ts`**

Confirm the current `CompletionDefaults` interface (lines 17-25):
```typescript
export interface CompletionDefaults {
  deleteVideoCutMarkers: boolean;
  generateMarkers: boolean;
  addAiReviewedTag: boolean;
  addPrimaryTags: boolean;
  removeCorrespondingTags: boolean;
  deleteRejected?: boolean;
  convertCorrespondingTags?: boolean;
}
```

- [ ] **Step 2: Add the new optional field**

Add after `convertCorrespondingTags`:
```typescript
switchToNextScene?: boolean;
```

- [ ] **Step 3: Verify no type errors**

```bash
cd /data/docker/new-marker-studio/stash-marker-studio
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/serverConfig.ts
git commit -m "feat: add switchToNextScene to CompletionDefaults"
```

---

## Task 2: Write scene list to sessionStorage on search page

**Files:**
- Modify: `src/app/search/page.tsx`

- [ ] **Step 1: Read the relevant section of `src/app/search/page.tsx`**

Find `handleSceneClick` (lines 182-187):
```typescript
const handleSceneClick = useCallback(
  (sceneId: string) => {
    router.push(`/marker/${sceneId}`);
  },
  [router]
);
```

Also confirm `scenes` is in scope here (it is — from Redux, line 73).

- [ ] **Step 2: Write scene IDs to sessionStorage before navigating**

Replace `handleSceneClick` with:
```typescript
const handleSceneClick = useCallback(
  (sceneId: string) => {
    sessionStorage.setItem("scene-list", JSON.stringify(scenes.map(s => s.id)));
    router.push(`/marker/${sceneId}`);
  },
  [router, scenes]
);
```

Note: `scenes` is added to the dependency array.

- [ ] **Step 3: Verify no type errors and lint**

```bash
cd /data/docker/new-marker-studio/stash-marker-studio
npx tsc --noEmit 2>&1 | head -20
npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/search/page.tsx
git commit -m "feat: persist scene list to sessionStorage on scene click"
```

---

## Task 3: Add `hasNextScene` prop and checkbox to `CompletionModal`

**Files:**
- Modify: `src/components/marker/CompletionModal.tsx`

The modal already has props `rejectedMarkersCount` and `correspondingTagsCount` added recently. The checkbox list has 7 items: deleteRejected, convertCorrespondingTags, deleteVideoCutMarkers, generateMarkers, addAiReviewedTag, addPrimaryTags, removeCorrespondingTags (lines 135-269).

- [ ] **Step 1: Read `src/components/marker/CompletionModal.tsx` fully**

Pay attention to:
- `CompletionModalProps` interface (lines 7-18)
- `useState` initial value (lines 32-40)
- `loadDefaults` function and its `setSelectedActions` call (lines 49-70)
- The bottom of the checkbox list — the last checkbox is `removeCorrespondingTags` (lines 249-269)
- The `handleActionToggle` function signature (it takes a `keyof CompletionDefaults`)

- [ ] **Step 2: Add `hasNextScene: boolean` to `CompletionModalProps`**

Add after `correspondingTagsCount`:
```typescript
hasNextScene: boolean;
```

And add `hasNextScene` to the destructured props in the function signature.

- [ ] **Step 3: Add `switchToNextScene: true` to `useState` initial value**

Current initial state ends with `convertCorrespondingTags: true`. Add:
```typescript
switchToNextScene: true,
```

- [ ] **Step 4: Add `switchToNextScene: true` to `loadDefaults` spread**

Find the `setSelectedActions` call inside `loadDefaults`. It currently ends with `convertCorrespondingTags: true` in the defaults object before the spread. Add:
```typescript
switchToNextScene: true,
```
**before** the `...config.completionDefaults` spread, so the saved value (if any) takes precedence. The pattern looks like:
```typescript
setSelectedActions({
  deleteVideoCutMarkers: true,
  generateMarkers: true,
  addAiReviewedTag: true,
  addPrimaryTags: true,
  removeCorrespondingTags: true,
  deleteRejected: true,
  convertCorrespondingTags: true,
  switchToNextScene: true,
  ...config.completionDefaults,
});
```

- [ ] **Step 5: Add the new checkbox at the BOTTOM of the checkbox list**

After the closing `</div>` of the `removeCorrespondingTags` checkbox (line ~269), add:

```tsx
{hasNextScene && (
  <div className="flex items-start space-x-3">
    <input
      type="checkbox"
      id="switchToNextScene"
      checked={selectedActions.switchToNextScene ?? true}
      onChange={() => handleActionToggle('switchToNextScene')}
      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
    />
    <label htmlFor="switchToNextScene" className="text-sm text-gray-300 flex-1">
      <span className="font-medium">Switch to next scene after completing</span>
    </label>
  </div>
)}
```

- [ ] **Step 6: Verify type check and lint**

```bash
cd /data/docker/new-marker-studio/stash-marker-studio
npx tsc --noEmit 2>&1 | head -20
npm run lint 2>&1 | tail -10
```

Expected: tsc may show an error about `page.tsx` missing the new `hasNextScene` prop — this is expected and will be fixed in Task 4. Lint should be clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/marker/CompletionModal.tsx
git commit -m "feat: add switch-to-next-scene checkbox to Complete modal"
```

---

## Task 4: Wire up `nextSceneId` and navigation in `page.tsx`

**Files:**
- Modify: `src/app/marker/[sceneId]/page.tsx`

`useMemo` is already imported (line 3). `useRouter` is already imported and `router` is already instantiated. The current `executeCompletionWrapper` deps array is `[executeCompletion, completionModalData, dispatch, actionMarkers, scene]`.

- [ ] **Step 1: Read the relevant sections of `src/app/marker/[sceneId]/page.tsx`**

Confirm:
1. `useMemo` is in the React import (line 3) ✓
2. `router` is declared via `useRouter()` (line 121 area)
3. `scene` is available from Redux (the `selectScene` selector)
4. `executeCompletionWrapper` location (lines 452-492)
5. `<CompletionModal>` JSX location (lines 1200-1211)

- [ ] **Step 2: Add `nextSceneId` useMemo before `executeCompletionWrapper`**

Add this immediately before the `executeCompletionWrapper` declaration (around line 452):

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

- [ ] **Step 3: Update `executeCompletionWrapper` to navigate after completion**

After `await executeCompletion(modalData.videoCutMarkersToDelete, selectedActions);`, add:

```typescript
if (selectedActions.switchToNextScene && nextSceneId) {
  router.push(`/marker/${nextSceneId}`);
}
```

Also add `nextSceneId` and `router` to the `useCallback` dependency array:

```typescript
}, [executeCompletion, completionModalData, dispatch, actionMarkers, scene, nextSceneId, router]);
```

- [ ] **Step 4: Pass `hasNextScene` prop to `<CompletionModal>`**

Find the `<CompletionModal>` JSX. Add `hasNextScene` before `onCancel`:

```tsx
hasNextScene={nextSceneId !== null}
```

The full updated JSX:
```tsx
<CompletionModal
  isOpen={isCompletionModalOpen}
  completionWarnings={completionModalData?.warnings || []}
  videoCutMarkersToDelete={completionModalData?.videoCutMarkersToDelete || []}
  hasAiReviewedTag={completionModalData?.hasAiReviewedTag || false}
  primaryTagsToAdd={completionModalData?.primaryTagsToAdd || []}
  tagsToRemove={completionModalData?.tagsToRemove || []}
  rejectedMarkersCount={actionMarkers?.filter(isMarkerRejected).length ?? 0}
  correspondingTagsCount={actionMarkers?.filter(m => isMarkerConfirmed(m) && (m.primary_tag.description ?? "").toLowerCase().includes("corresponding tag:")).length ?? 0}
  hasNextScene={nextSceneId !== null}
  onCancel={() => dispatch(closeModal())}
  onConfirm={executeCompletionWrapper}
/>
```

- [ ] **Step 5: Verify type check and lint**

```bash
cd /data/docker/new-marker-studio/stash-marker-studio
npx tsc --noEmit 2>&1 | head -30
npm run lint 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```bash
npm test -- --no-coverage 2>&1 | tail -15
```

Expected: all passing.

- [ ] **Step 7: Commit**

```bash
git add "src/app/marker/[sceneId]/page.tsx"
git commit -m "feat: navigate to next scene after completion when selected"
```

---

## Task 5: Smoke Test

- [ ] **Step 1: Rebuild Docker container**

```bash
cd /data/docker/new-marker-studio/stash-marker-studio
docker compose up -d --build 2>&1 | tail -5
```

- [ ] **Step 2: Manual smoke test**

1. Open the search page — click a scene that is NOT the last one in the list
2. Open the Complete modal — confirm "Switch to next scene after completing" checkbox appears at the bottom, checked by default
3. Click Complete — confirm navigation goes to the next scene in the list
4. Open the Complete modal on the **last** scene in search — confirm the checkbox does NOT appear
5. Navigate directly to a scene (not from search) — confirm the checkbox does NOT appear
6. Uncheck the "Switch to next scene" box and complete — confirm you stay on the current scene
7. Click "Save as Default" with it unchecked — reopen modal, confirm it remembers `false`

- [ ] **Step 3: Final type check**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.
