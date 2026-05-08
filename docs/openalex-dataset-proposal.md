# OpenAlex Dataset Integration — Proposal

## Data model

### `nodes.json`

```json
{
  "id": 0,
  "name": "Jane Doe",
  "docs": 142,
  "peers": [1, 4, 17],
  "topics": ["immunology", "SARS-CoV-2", "T-cell response"]
}
```

| Field | OpenAlex source |
|---|---|
| `id` | sequential integer mapped from `author.id` |
| `name` | `author.display_name` |
| `docs` | `author.works_count` |
| `peers` | derived from links at build time |
| `topics` | `author.topics[].display_name` (top 8) |

### `links.json`

```json
{
  "source": 0,
  "target": 17,
  "value": 0.6,
  "papers": 3
}
```

| Field | Source |
|---|---|
| `source` / `target` | co-authorship extracted from works |
| `value` | `min(1, papers / 10)` — normalised link strength for simulation |
| `papers` | raw shared paper count |

---

## Build pipeline

1. Choose a field via OpenAlex concept/topic filter (e.g. `virology`, `machine-learning`).
2. Fetch top ~2 500 authors sorted by `cited_by_count`.
3. For each author, fetch their works and collect co-author pairs with shared paper counts.
4. Keep only pairs where both authors are in the top-2 500 set.
5. Filter to the largest connected component; trim to ~2 000 nodes if needed.
6. Normalise `value = min(1, shared_papers / 10)`.
7. Derive `peers` lists and write `nodes.json` + `links.json`.
