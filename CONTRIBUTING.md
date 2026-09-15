# Contributing

## Reporting an issue

Open a GitHub issue. Include what you tried, the full traceback, and -
if it's about a specific data source - the boundary/comune and
parameters that triggered it. There's no separate support channel yet;
issues are also the right place for usage questions.

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

## Development notes: AI-assisted work

Parts of this project's code, tests, and documentation were developed
with the assistance of Claude (Anthropic), including Claude Code - used
for code generation, refactoring, test scaffolding, and documentation
drafting. Every function was directed, reviewed, and live-verified
against the real external service by the maintainer before being
merged; which modules to build, what conventions to follow, and what to
reject were the maintainer's decisions, not delegated to the AI. This
note is here for transparency, consistent with disclosure expectations
of venues like [JOSS](https://joss.readthedocs.io/en/latest/policies.html#ai-usage-policy).
