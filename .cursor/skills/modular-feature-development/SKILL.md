---
name: modular-feature-development
description: Creates new features in separate modules/components with tests; notifies the user when changes affect existing code. Use when adding new features, creating modules, or when the user asks for modular code structure.
---

# Modular Feature Development

## Rules

1. **One feature = one module/component** — each new piece of functionality goes into its own file (module, component, or class in a separate file), not into an existing shared file.
2. **Tests with every new module** — when creating a new module, add tests that verify its behavior (e.g. unit/integration next to the module or under `tests/`).
3. **Impact on existing code** — if the new module requires changes to existing code (imports, refactoring, API changes), **notify the user first** before making those changes.

---

## Workflow: New Feature

### Step 1: Check impact

- Scan the codebase: can the new feature be implemented entirely in a **new** file?
- If yes → proceed to Step 2.
- If **no** (existing files, API, or dependencies must be changed):
  - **Stop** and tell the user, e.g.:
    - *"The new feature [X] requires changes to existing module [Y] (e.g. [specific changes]). May I apply these changes?"*
  - Wait for confirmation before editing existing code.

### Step 2: Create the module/component

- Add a **new file** (e.g. `src/features/feature-name.ts` or `components/FeatureName.tsx`).
- Follow project conventions (naming, folder structure).
- In that file: only logic for this single feature (single responsibility).

### Step 3: Tests

- Add a test file next to the module (e.g. `feature-name.test.ts`) or under `tests/` per project layout.
- Tests must **verify** the main behavior of the new module (happy path and important edge cases).
- Run the tests and ensure they pass.

### Step 4: Integration (if needed)

- If integration only needs adding an import and a single call (e.g. registering in router/menu), do it without asking separately.
- Any **modification of existing code** (refactoring, signature changes, removals) — only after notifying the user and, if needed, getting confirmation.

---

## Message templates

**When the new module touches existing code:**

```text
Note: The new feature [name] requires changes to existing code:
- [file/area]: [brief description of changes]
May I apply these changes?
```

**After creating a module with tests:**

```text
Added module [path] with tests at [test path]. Tests pass.
```

---

## Checklist

- [ ] New feature in its own file (module/component)
- [ ] Tests added that verify this module
- [ ] If existing code is affected — user notified before changes
- [ ] Naming and structure match the project
