# Two-minute ProofBid demo script

1. **0:00–0:20** Open the public app. Explain the frozen task, one acceptance criterion, GEN budget, and bid capacity. Point out that the app reads finalized onchain state without a wallet.
2. **0:20–0:45** Open the public source commit. Show `docs/partial.md` and `docs/complete.md`; the first lacks SQLite steps, while the second has migration and rollback steps for both engines.
3. **0:45–1:10** Show the finalized commit and reveal transactions. Explain that commitments hid each price with a 32-byte nonce until the commit window closed. Open each pinned file and its exact quote.
4. **1:10–1:35** Show the two finalized review transactions and their leader execution results. The cheaper partial file should be `INELIGIBLE`, the complete one `ELIGIBLE`. Explain that selected validators independently fetched the same raw bytes and agreed on the bounded verdict.
5. **1:35–1:55** Show settlement and final state: the complete bid wins at its stated price, and the sponsor gets the unused budget. Show winner and sponsor withdrawal receipts. Finish with `pnpm verify:proof` against live finalized state.

Do not use this script to claim a live result until `deploy/proof.json` is populated and its verifier passes.
