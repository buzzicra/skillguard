# Contributing

Thanks for helping make AI agent configs safer.

## Local Setup

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Adding A Rule

1. Add the rule in `src/rules.ts`.
2. Add a behavior test in `tests/scanner.test.ts`.
3. Include at least one safe non-match when the pattern risks false positives.
4. Run `npm test`, `npm run typecheck`, `npm run build`, and `npm audit --audit-level=high`.

Rules should be specific enough to catch real risky agent behavior without flagging ordinary documentation.

## Pull Request Checklist

- Tests cover changed behavior.
- No real secrets in fixtures.
- No generated `dist/` files committed.
- No dependency audit findings at high or critical severity.
