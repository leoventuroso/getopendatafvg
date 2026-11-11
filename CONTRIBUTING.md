# Contributing

## Reporting an issue

Open a GitHub issue. The templates separate a bug in the library from a
problem in the data a service publishes; for the latter, check
[docs/upstream-defects.md](docs/upstream-defects.md) first, since known
upstream defects are listed there with how the library handles them.
Include what you tried, the full traceback, and - if it's about a
specific data source - the boundary/comune and parameters that
triggered it. There's no separate support channel yet; issues are also
the right place for usage questions.

## Code of conduct

Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md), the Contributor Covenant 2.1.
Reports go to leo.venturoso@gmail.com.

## Proposing a change

Fork, branch, open a pull request. A new data-fetching function should
follow the conventions every existing module already does:

- take a `boundary` (or a point/line) in WGS84 in, return data clipped
  to it - not a pre-projected CRS the caller has to know about
- keep raw data/computation separate from classification, color, or any
  other presentation choice - those are decisions for the caller
- ship with tests (mock the HTTP calls for the unit test suite) and be
  live-verified against the real service before merging, not just
  against a mock
- pass `ruff check .` and `pytest` (`pip install -e ".[dev]"` gets you
  both)

Three checks in the test suite turn project rules into failures, so a
change that breaks one is caught before review:

- **Public API.** The public API is exactly `getopendatafvg.__all__`.
  Adding or removing a name means updating `PUBLIC_API` in
  `tests/test_public_api.py` and mentioning the name in `CHANGELOG.md`.
  A name is removed only after it has emitted a `DeprecationWarning` for
  at least one minor release and two months.
- **Upstream defects.** A new way a source misbehaves or misleads gets
  an entry in [docs/upstream-defects.md](docs/upstream-defects.md), and
  the test that pins it carries `@pytest.mark.quirk('UD-nn')`. An entry
  with no such test must say why under **Not tested**.
- **Changelog.** Every user-visible change goes under `[Unreleased]` in
  [CHANGELOG.md](CHANGELOG.md).

## AI usage log

Parts of this project were developed with AI assistance. This log records
which tools and models were used, when, and for what, as the
[JOSS AI usage policy](https://joss.readthedocs.io/en/latest/policies.html#ai-usage-policy)
asks. Add a row whenever the tool, the model or the kind of use changes.

| Period | Tool | Model | Used for |
|---|---|---|---|
| September 2026 | Claude (Anthropic) | Claude Sonnet 5.5 | documentation, ROADMAP notes, tests |
| October 2026 to 2026-11-08 | Claude (Anthropic) | Claude Opus 5.5 | documentation, ROADMAP notes, tests |
| 2026-11-09 onwards | Claude Code, VS Code extension | `claude-opus-5-5` | tests, documentation, ROADMAP notes, the strategy in `docs/PLAN.md`, live checks against the upstream services (each run approved in advance) |

All AI-assisted output was checked and validated manually by the
maintainer before being committed. Which modules to build, what
conventions to follow, and what to reject were the maintainer's
decisions. Commits are created only after the maintainer has approved
their content.

Replies in review threads (for example JOSS reviews) are written by the
maintainer, not by AI, except for translation.
