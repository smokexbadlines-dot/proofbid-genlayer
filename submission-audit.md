# ProofBid submission audit — 21 October 2026

## Decision

ProofBid has a public frontend and a complete, finalized StudioNet award demonstration. One MetaMask run from the public frontend verified deployment, rubric seal, funding, bid commitment, timeout settlement, and a full sponsor refund withdrawal. A second run verified no-bid settlement and full sponsor refund withdrawal. **The full frontend wallet flow is still unverified:** the operator missed the first bid's reveal window, so there is no browser-wallet reveal, validator review, winner award, or winner withdrawal receipt. Under the local GenLayer Native project guide, technical submission readiness remains **FAIL** until those core wallet actions are exercised. The prepared Portal packet is an honest draft, not a submitted contribution.

| Area | Result | Evidence |
| --- | --- | --- |
| Contract behavior | PASS | Six direct-mode tests; finalized StudioNet deploy, two reviews, settlement, both withdrawals, and expected rejected reveal |
| Live award proof | PASS | `pnpm verify:proof` checks 13 transactions, agreeing review validators, pinned evidence, and finalized state |
| Public app and source | PASS | [Public app](https://proofbid-genlayer-20261021.opalfairy1.chatgpt.site), [public repository](https://github.com/smokexbadlines-dot/proofbid-genlayer) |
| Browser-wallet timeout/refund | PASS | `pnpm verify:wallet` checks six finalized transactions and final zero sponsor credit for [contract 0x4F5D…f3B5](https://explorer-studio.genlayer.com/address/0x4F5D69C2a9014205A03110DA4B154e9448c3f3B5) |
| Browser-wallet no-bid refund | PASS | `pnpm verify:no-bid` checks five finalized successful transactions and final zero sponsor credit for [contract 0x1729…91ED](https://explorer-studio.genlayer.com/address/0x17291F8F8be299b9990C2CA7BD90dFB8273b91ED); deploy and seal have agreeing validators, routine fund, settle, and withdraw show validator `idle` |
| Browser-wallet reveal and award | FAIL — unverified | The committed bid missed its reveal deadline and forfeited; the full award demo was run through GenLayer Studio |
| Distinct mechanism | PASS, with review risk | Sealed price competition and one lowest eligible winner differ from fixed grant and coverage rewards in earlier projects |

## Browser test details

The first public-app auction deployed with a 0.01 test GEN budget and two-account MetaMask setup. Deploy, `CLEAR` seal, fund, and bid commit finalized with leader `SUCCESS` and an independent agreeing validator. The operator missed the reveal deadline while preparing submission assets. At the resolution deadline, `settle()` marked the unrevealed bid `FORFEITED`; the sponsor withdrew the full 0.01 test GEN. Both transactions finalized successfully. This proves the fail-closed timeout and pull refund in the browser. It does not prove browser reveal or award.

A second 0.005 test GEN auction was deployed, sealed, and funded from the other account. It received no bid before its commit deadline. The public app submitted [settlement](https://explorer-studio.genlayer.com/tx/0x17723a503f1a20925882080b84c9d19a0fb8b0e1fd08ed9c9e4c169b7f72c6ac), which finalized as `REFUNDED`, and [sponsor withdrawal](https://explorer-studio.genlayer.com/tx/0xc18d35b76bc39f97a9880964620894d08fbad2a282de2d24d5c3e3461bc9d6dc), which finalized successfully. The sponsor's claimable balance reads zero. Its deploy and seal have independent agreeing validator receipts; fund, settle, and withdraw have successful leader receipts with validator `idle`. A third 0.004 test GEN auction was deployed and finalized but was never sealed or funded; it holds no budget. These test runs are not successful award cases.

## Before submitting

1. Run one browser-wallet auction with enough time for the two available accounts: sponsor deploys, seals and funds; other account commits and later reveals; validators review; anyone settles; winner and sponsor withdraw. Verify each receipt is `FINALIZED` with leader `SUCCESS`, independent validator agreement for semantic judgments, and matching state readbacks. The original complete auction already proves contract behavior through GenLayer Studio, but the frontend path still needs this check.
2. Keep the seal evidence distinction precise: the original demo seal had leader `SUCCESS` with validator `idle`; both browser auctions' seals had independent agreeing validators. Both file reviews in the original demo also had independent agreeing validators.
3. Treat prompt-injection resistance as unproven against an actually pinned malicious file. The direct-mode injection test changes the file after its hash was committed, so the contract returns `UNCLEAR` before the model sees the injected text.
4. The human owner submits the prepared [Portal packet](portal-submission.md). The local `genlayer-native` guide reserves Portal submission for the owner.

## Distinctiveness check

[PACTPROOF](https://github.com/smokexbadlines-dot/pactproof-genlayer) links validator-qualified evidence to a funded reward. [Marginal Contribution Pool](https://github.com/smokexbadlines-dot/marginal-contribution-pool-genlayer) combines commit-reveal evidence with deterministic payout. ProofBid adds sealed **price** competition: each eligible file is an offer, and code clears exactly one cheapest offer while returning the sponsor's surplus. Stewards may still see overlap in the broader evidence-to-payment pattern.

## Checks performed

- `pnpm build`: PASS after the deadline button update.
- `pnpm verify:proof`: PASS; winner bid 2 at 0.4 StudioNet test GEN.
- `pnpm verify:wallet`: PASS for deploy, seal, fund, commit, timeout settlement, and refund withdrawal.
- `pnpm verify:no-bid`: PASS for deploy, seal, fund, no-bid settlement, and sponsor refund withdrawal.
- Six Python direct-mode tests: PASS in the earlier audit.
- Public Sites project: active with public access.
- Public repository: includes the frontend, proof manifests, verification scripts, audit, and logo.
