"""Keeps docs/upstream-defects.md and the `quirk` test markers in step.

Every entry in the registry is either pinned by at least one test marked
`@pytest.mark.quirk('UD-nn')` or explicitly flagged **Not tested**, and
every marker names an entry that exists. The checks are plain functions
over text, so they are also tested here against tampered inputs: a
checker that cannot fail would make the registry look kept when it is not.
"""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / 'docs' / 'upstream-defects.md'
TESTS = ROOT / 'tests'

ENTRY_HEADING = re.compile(r'^### (UD-\d{2}) ', re.MULTILINE)
MARKER = re.compile(r"""^\s*@pytest\.mark\.quirk\(['"](UD-\d{2})['"]\)""", re.MULTILINE)
NOT_TESTED = '**Not tested.**'


def entries_in(registry: str) -> dict[str, str]:
    """Entry ID -> the entry's text, up to the next heading."""
    entries = {}
    for section in re.split(r'^#{2,3} ', registry, flags=re.MULTILINE):
        match = re.match(r'(UD-\d{2}) ', section)
        if match:
            entries[match.group(1)] = section
    return entries


def markers_in(test_sources: list[str]) -> set[str]:
    return {entry_id for source in test_sources for entry_id in MARKER.findall(source)}


def registry_problems(registry: str, test_sources: list[str]) -> list[str]:
    problems = []
    ids = ENTRY_HEADING.findall(registry)
    if ids != [f'UD-{n:02d}' for n in range(1, len(ids) + 1)]:
        problems.append(f'entry IDs are not unique and sequential: {ids}')

    entries = entries_in(registry)
    marked = markers_in(test_sources)
    flagged = {entry_id for entry_id, text in entries.items() if NOT_TESTED in text}
    if unknown := sorted(marked - entries.keys()):
        problems.append(f'quirk markers with no registry entry: {unknown}')
    if untested := sorted(entries.keys() - marked - flagged):
        problems.append(f'entries with no quirk-marked test and no "Not tested" flag: {untested}')
    if stale := sorted(flagged & marked):
        problems.append(f'entries flagged "Not tested" that now have a marked test: {stale}')
    return problems


def test_the_registry_and_the_markers_agree():
    sources = [path.read_text(encoding='utf-8') for path in sorted(TESTS.glob('test_*.py'))]
    problems = registry_problems(REGISTRY.read_text(encoding='utf-8'), sources)
    assert not problems, '\n'.join(problems)


# Synthetic inputs for the checker itself.

REGISTRY_SAMPLE = """# Upstream defects

## Source

### UD-01 · Tested

- **Kind:** defect.

### UD-02 · Untested on purpose

- **Not tested.** No code path.
"""

TEST_SAMPLE = """
@pytest.mark.quirk('UD-01')
def test_one(): ...
"""


def test_checker_accepts_a_consistent_registry():
    assert registry_problems(REGISTRY_SAMPLE, [TEST_SAMPLE]) == []


def test_checker_ignores_a_marker_that_is_only_mentioned_in_text():
    prose = "# see @pytest.mark.quirk('UD-09') in the docs\n"
    assert markers_in([prose]) == set()


@pytest.mark.parametrize(
    ('registry', 'tests', 'expected'),
    [
        pytest.param(
            REGISTRY_SAMPLE,
            [TEST_SAMPLE + "\n@pytest.mark.quirk('UD-07')\ndef test_two(): ...\n"],
            'no registry entry',
            id='unknown-marker',
        ),
        pytest.param(REGISTRY_SAMPLE, [''], 'no quirk-marked test', id='entry-lost-its-test'),
        pytest.param(
            REGISTRY_SAMPLE,
            [TEST_SAMPLE + "\n@pytest.mark.quirk('UD-02')\ndef test_two(): ...\n"],
            'now have a marked test',
            id='stale-not-tested-flag',
        ),
        pytest.param(
            REGISTRY_SAMPLE.replace('UD-02', 'UD-03'),
            [TEST_SAMPLE],
            'not unique and sequential',
            id='gap-in-ids',
        ),
        pytest.param(
            REGISTRY_SAMPLE.replace('UD-02', 'UD-01'),
            [TEST_SAMPLE],
            'not unique and sequential',
            id='duplicate-id',
        ),
    ],
)
def test_checker_reports_each_kind_of_drift(registry, tests, expected):
    problems = registry_problems(registry, tests)
    assert any(expected in problem for problem in problems), problems
