# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo keeps its domain context in the existing internal docs instead of a root `CONTEXT.md`.

## Before exploring, read these

- **`docs/internals/glossary.md`**: the domain glossary. Treat it as this repo's `CONTEXT.md`.
- **`docs/internals/overview.md`**: architecture and its constraints.
- Other **`docs/internals/*.md`** pages that touch the area you're about to work in (e.g. `providers.md`, `remote.md`, `effect-services.md`).
- **`docs/adr/`**: read ADRs that touch the area, if the directory exists.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.

## Where new domain knowledge goes

- New or sharpened terms go in `docs/internals/glossary.md`, not a new `CONTEXT.md`. Follow the documentation rules in `AGENTS.md`: the glossary defines shared vocabulary; it is not a feature index.
- Architectural decisions go in `docs/adr/` (created lazily by `/domain-modeling` when a decision actually gets resolved), or in the relevant `docs/internals/` page when that page already owns the topic.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/internals/glossary.md` and the glossary in `AGENTS.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR or a documented decision in `docs/internals/`, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
