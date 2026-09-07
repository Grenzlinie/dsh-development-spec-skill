# Builder prompt

Implement the product described in the supplied `brief.md` inside your assigned candidate directory. Work only in that directory. Do not inspect sibling candidates, `playground/evaluation`, `/tmp/dsh-sdd-oracles`, or prior experiment results.

You may ask the product-owner agent concise product questions. The product owner decides behavior and priorities, not architecture. Make reversible engineering decisions yourself.

Deliver a complete runnable source tree with dependency lockfile, automated tests, production build configuration, and `HANDOFF.md` containing exact install, test, build, and run commands plus limitations. Do not retain dependency directories, virtual environments, caches, build output, coverage, runtime databases, or browser profiles.

Run relevant checks and preserve their exact commands and results in `evidence/first-pass.json`. Stop after the first complete pass and report completion to the coordinator.
