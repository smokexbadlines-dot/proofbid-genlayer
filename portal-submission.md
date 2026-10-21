# ProofBid Portal packet

**Status:** Public app, finalized auction proof, browser-wallet timeout/refund proof, and browser-wallet no-bid refund proof are verified. Browser-wallet reveal and award remain unverified; see the [submission audit](submission-audit.md). Portal submission remains with the human owner.

**Contribution type:** Project / deployed Intelligent Contract

**One-liner:** A sealed-price reverse auction where GenLayer validators qualify pinned deliverables and deterministic code picks the cheapest eligible bid.

**Description (under 1,000 characters):** ProofBid lets a sponsor fund one public task with a frozen, observable acceptance criterion. Contributors commit hidden prices and commit-pinned GitHub files, then reveal both after bidding closes. GenLayer validators independently fetch each complete file, verify its raw SHA-256 and exact quote, and judge one criterion as ELIGIBLE, INELIGIBLE, or UNCLEAR. Contract code selects the lowest-priced eligible bid, credits the winner, and returns unused funds to the sponsor. In a finalized StudioNet auction, an incomplete 0.2 GEN file lost to a complete 0.4 GEN file; settlement and both withdrawals finalized. A separate public-app MetaMask test proved deploy, seal, fund, commit, timeout settlement, and full sponsor refund withdrawal. Browser reveal and award remain untested.

**How to:** Open the app and inspect the preloaded finalized auction. Read both pinned files, review receipts, settlement, and withdrawal transactions. Clone the public repository and run `pnpm verify:proof` for the award demo, `pnpm verify:wallet` for the browser timeout/refund case, and `pnpm verify:no-bid` for the browser no-bid refund. A wallet is only needed to create or act on a new auction.

**Expected outcome:** Bid 1 is INELIGIBLE at 0.2 test GEN. Bid 2 is ELIGIBLE at 0.4 test GEN and wins. The sponsor receives a 0.1 test GEN surplus plus 0.5 test GEN excess funding credit; winner receives 0.4 test GEN. Both claimable balances are zero after withdrawal.

## Links

- Public app: https://proofbid-genlayer-20261021.opalfairy1.chatgpt.site
- Public source: https://github.com/smokexbadlines-dot/proofbid-genlayer
- Pinned contract source: https://github.com/smokexbadlines-dot/proofbid-genlayer/blob/f625b40fd83ef7e7ab5de65cb79b61604490d430/contracts/proof_bid.py
- Contract Explorer: https://explorer-studio.genlayer.com/address/0x0cF6733050F0c338B13ea76Aff1472ddC5755d26
- Proof manifest: https://github.com/smokexbadlines-dot/proofbid-genlayer/blob/main/deploy/proof.json

- Browser-wallet refund manifest: https://github.com/smokexbadlines-dot/proofbid-genlayer/blob/main/deploy/browser-wallet-proof.json

- Browser-wallet no-bid refund manifest: https://github.com/smokexbadlines-dot/proofbid-genlayer/blob/main/deploy/browser-no-bid-proof.json

- No-bid settlement: https://explorer-studio.genlayer.com/tx/0x17723a503f1a20925882080b84c9d19a0fb8b0e1fd08ed9c9e4c169b7f72c6ac

- No-bid sponsor withdrawal: https://explorer-studio.genlayer.com/tx/0xc18d35b76bc39f97a9880964620894d08fbad2a282de2d24d5c3e3461bc9d6dc
- Cheaper bid review: https://explorer-studio.genlayer.com/tx/0xb63c253b98ccd87767b68f9815d193680ab3bdc531eecce7e7bbb27dd1bcb9a4
- Complete bid review: https://explorer-studio.genlayer.com/tx/0x52a3f6ab65dcfbc321da75ef0dff3788b13651c84e19c011c5f9952f42c50b54
- Settlement: https://explorer-studio.genlayer.com/tx/0xaa31b1d52ff9d97a0b2dd549b66e45ba5bdd7fb3f679aaafd7ab5faf89bedb05
- Sponsor withdrawal: https://explorer-studio.genlayer.com/tx/0x0cc4967aa70b03b914745ba448dee2df733e2fa523f14d7b4c9e850aff116a14
- Winner withdrawal: https://explorer-studio.genlayer.com/tx/0x3497857caad7a37a63145a25e24ee8d0a6df11afe0f0984edebe0ee32396c1c9
- Rejected unauthorized reveal: https://explorer-studio.genlayer.com/tx/0x69b5a1ce321f91f83d020a8418c164fa7182f529cd0552dac823d00909eca2d5

## Submission gates

| Gate | Result |
| --- | --- |
| Technical behavior, local tests, production build | PASS |
| Distinct mechanism versus earlier projects | PASS |
| Live finalized evidence and reproducible verifier | PASS |
| Publicly accessible frontend | PASS |
| Frontend wallet deployment, funding, bid commit, timeout settlement, refund withdrawal | PASS: six finalized MetaMask transactions with agreeing validator receipts |
| Frontend wallet no-bid settlement and refund withdrawal | PASS: five finalized successful transactions; deploy and seal have agreeing validator receipts, while fund, settle, and withdraw show validator `idle` |
| Frontend wallet reveal, review, award, winner withdrawal | NOT VERIFIED; these were exercised in the separate StudioNet demo through Studio |
| Portal submission | PENDING: human owner submits |

The original award demo's seal transaction has a successful leader result but an `idle` validator receipt. Both file reviews have independent agreeing validator receipts. All amounts are StudioNet test GEN.
