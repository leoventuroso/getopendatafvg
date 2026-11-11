## What and why

<!-- What this changes, and the problem it solves. -->

## Checklist

- [ ] `ruff check .` and `pytest --cov` pass
- [ ] New behaviour has tests, with HTTP calls mocked
- [ ] Verified live against the real service, if it touches one (say how)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] A new public name is in `PUBLIC_API` and the changelog; a removed one went through deprecation first
- [ ] A new upstream defect is in `docs/upstream-defects.md`, with a `quirk`-marked test
