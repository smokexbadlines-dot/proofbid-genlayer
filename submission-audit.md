# ProofBid submission audit — 21 October 2026

## Decision

**Submission ready for the human owner.** The public app and source are accessible. A competitive StudioNet auction and a separate end-to-end public-app MetaMask award are finalized. The browser run used two accounts and nine transactions: deploy, seal, fund, commit, reveal, review, settle, winner withdraw, and sponsor withdraw. The eligible 0.002 test GEN bid won a 0.004 budget; both final claimable balances read zero. The public verifier checks each transaction, the pinned source and evidence, the award state, and both balances. Portal submission itself remains with the owner.

| Area | Result | Evidence |
| --- | --- | --- |
| Technical behavior | PASS | Seven direct-mode tests, production build, finalized on-chain award and fail-closed refund paths |
| Competitive mechanism | PASS | [Original auction](https://explorer-studio.genlayer.com/address/0x0cF6733050F0c338B13ea76Aff1472ddC5755d26): cheaper incomplete bid INELIGIBLE; complete 0.4 test GEN bid ELIGIBLE and awarded |
| Full frontend wallet flow | PASS | [Browser award manifest](deploy/browser-award-proof.json), `pnpm verify:award`, [contract](https://explorer-studio.genlayer.com/address/0x0701Dedfee0a05a9Fd3e2634f3072e44d5A41e18) |
| Failure paths | PASS | `pnpm verify:wallet` checks forfeited unrevealed bid and sponsor refund; `pnpm verify:no-bid` checks empty auction refund |
| Public app and source | PASS | [Public app](https://proofbid-genlayer-20261021.opalfairy1.chatgpt.site), [public repository](https://github.com/smokexbadlines-dot/proofbid-genlayer) |
| Distinctiveness | PASS, with review risk | Sealed price competition and one cheapest eligible winner differ from fixed grants and coverage rewards in earlier projects |

## Receipt precision

The browser award's `seal()` and `review_bid()` each have an independent validator vote of `agree` with the leader's bounded verdict, respectively `CLEAR` and `ELIGIBLE`. Its nine transactions are `FINALIZED` with leader `SUCCESS`. Routine settlement and withdrawal may show validator `idle`; the manifest does not claim semantic agreement for those receipts. The original competitive demo's seal also reports validator `idle`, while both file reviews have independent agreeing validator receipts. The verifier uses the contract source commit recorded at each deployment; evidence is fetched from each bid's own pinned Git commit.

The first browser auction demonstrates the timeout path. Its committed bid missed the reveal deadline, was marked `FORFEITED`, and the sponsor withdrew the entire 0.01 test GEN budget. The second browser auction had no bids; it settled as `REFUNDED`, and the sponsor withdrew its full 0.005 budget. A third test deployment was never funded and holds no budget. These cases are separate from the completed browser award.

## Boundaries

GenLayer validators judge whether a public UTF-8 document explicitly meets one frozen criterion. They do not execute migration steps, verify the file's authorship, or guarantee real-world correctness. A direct-mode injection test alters file contents after the committed digest and therefore proves hash mismatch returns `UNCLEAR`; it does not prove resistance to an actually pinned malicious document. The award proof uses a benign pinned file. This limitation is disclosed rather than presented as tested prompt-injection resistance.

Capacity one closes bidding after a single finalized commitment and enabled the two-account browser run without waiting for a deadline. The original two-bid competition demonstrates the lowest eligible price selection. A capacity-one award alone would not prove competition.

## Distinctiveness check

[PACTPROOF](https://github.com/smokexbadlines-dot/pactproof-genlayer) links validator-qualified evidence to a funded reward. [Marginal Contribution Pool](https://github.com/smokexbadlines-dot/marginal-contribution-pool-genlayer) combines commit-reveal evidence with deterministic payout. ProofBid adds sealed **price** competition: each eligible file is an offer, and code clears exactly one cheapest offer while returning the sponsor's surplus. Stewards may still see overlap in the broader evidence-to-payment pattern.

## Reproduction

1. Open the [public app](https://proofbid-genlayer-20261021.opalfairy1.chatgpt.site) to inspect the preloaded two-bid auction. Use the `?contract=0x0701Dedfee0a05a9Fd3e2634f3072e44d5A41e18` query to inspect the browser award.
2. Run `pnpm build` and `python -m pytest -q tests/test_proof_bid.py` with `genlayer-test` installed.
3. Run `pnpm verify:proof`, `pnpm verify:award`, `pnpm verify:wallet`, and `pnpm verify:no-bid`. Each verifier checks finalized receipts and latest final contract state; the award verifier also checks both zero claimable balances.
4. The human owner submits the prepared [Portal packet](portal-submission.md).
