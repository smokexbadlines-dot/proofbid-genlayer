# ProofBid submission audit — 21 October 2026

## Decision

The public read-only demonstration and its on-chain proof are ready for a reviewer. **The full app is not yet end-to-end verified:** no browser-extension wallet has completed a ProofBid write from the deployed frontend. The GenLayer Native project guide treats that as a submission readiness gate. The contract writes in the proof manifest were executed through GenLayer Studio.

| Area | Result | Evidence |
| --- | --- | --- |
| Contract behavior | PASS | Six direct-mode tests; finalized StudioNet deploy, two reviews, settlement, withdrawals and expected rejected reveal |
| Live proof | PASS | `pnpm verify:proof` checks 13 finalized transactions, agreeing validator receipts for both reviews, pinned file hashes and latest finalized state |
| Public app and source | PASS | [Public app](https://proofbid-genlayer-20261021.opalfairy1.chatgpt.site), [public repository](https://github.com/smokexbadlines-dot/proofbid-genlayer) |
| Wallet flows from the app | FAIL — unverified | No deployed-frontend receipt for deploy, fund, commit, reveal, review, settle or withdraw |
| Distinct mechanism | PASS, with review risk | Price competition and one lowest eligible winner differ from fixed grant and coverage rewards in the author's prior projects |

## Before submitting

1. Use a browser wallet on StudioNet with **test GEN** to run a small ProofBid auction from the public app. Verify the wallet's transaction hashes finalize with leader `SUCCESS`, the app re-reads the contract, and the winner and sponsor can withdraw. A human must approve the wallet transactions. The installed `genlayer-js@1.1.8` uses its legacy wallet transaction path; [current GenLayer documentation](https://docs.genlayer.com/developers/decentralized-applications/writing-data) describes fee estimation for fee-charging deployments. The version difference is not a confirmed failure, but it makes a real wallet check necessary.
2. Do not claim that the rubric seal had an agreeing independent validator: its receipt recorded leader `CLEAR`/`SUCCESS` and validator `idle`/`ERROR`. Both file reviews **did** have independent agreeing validator receipts. The [manifest](deploy/proof.json) and verifier preserve this distinction.
3. Treat prompt-injection resistance as unproven. The direct-mode injected-file test changes the file after its hash was committed, so the contract returns `UNCLEAR` before the model sees the injected text. A stronger case would commit a pinned file that contains an instruction attempt and show an honest verdict live.
4. Sign in to the [GenLayer Portal](https://portal.genlayer.foundation/how-it-works/), confirm the builder profile and GitHub connection, then submit the prepared [Portal packet](portal-submission.md). The public Portal describes steward review and GitHub OAuth verification; account-specific eligibility was not inspected in this audit. Under the local `genlayer-native` guide, the human owner submits.

## Distinctiveness check

[PACTPROOF](https://github.com/smokexbadlines-dot/pactproof-genlayer) already links validator-qualified evidence to a funded reward, and [Marginal Contribution Pool](https://github.com/smokexbadlines-dot/marginal-contribution-pool-genlayer) already combines commit-reveal evidence with deterministic payout. ProofBid's added mechanism is sealed **price** competition: each eligible file is an offer, and code clears exactly one cheapest offer while returning the sponsor's surplus. That distinction is real, but stewards may still see overlap in the broader evidence-to-payment pattern. Lead with the auction outcome, not generic escrow language.

## Checks performed

- `pnpm build`: PASS.
- `pnpm verify:proof`: PASS; winner bid 2 at 0.4 StudioNet test GEN.
- Six Python direct-mode tests: PASS on this audit.
- Public Sites project: active, access mode `public`.
- Repository `main`: public and pushed.
- Read-only frontend: preloads the finalized auction and displays both verdicts, settlement, pinned files, sponsor and winner claimable balances, and withdrawal receipts without a wallet.
