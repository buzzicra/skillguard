# SkillGuard Demo Lab

Run the intentionally unsafe sample:

```bash
npm run build
node dist/cli.js scan examples/bad-skill
```

Expected result: critical findings for environment variable exfiltration and remote script execution.

The root repository scan ignores `examples/**` through `.skillguardignore` so demo fixtures do not break CI.
