# ProofBid Portal packet

**Status:** Public app and live StudioNet proof ready for review. Portal submission remains with the human owner.

**Contribution type:** Project / deployed Intelligent Contract

**One-liner:** A sealed-price reverse auction where GenLayer validators qualify pinned deliverables and deterministic code picks the cheapest eligible bid.

**Description (under 1,000 characters):** ProofBid lets a sponsor fund one public task with a frozen, observable acceptance criterion. Contributors commit hidden prices and commit-pinned GitHub files, then reveal both after bidding closes. GenLayer validators independently fetch each complete file, verify its raw SHA-256 and exact quote, and judge one criterion as ELIGIBLE, INELIGIBLE, or UNCLEAR. Contract code selects the lowest-priced eligible bid, credits the winner, and returns unused funds to the sponsor; deadline fallbacks prevent unresolved bids from locking the budget. In the finalized StudioNet demo, an incomplete 0.2 GEN file lost to a complete 0.4 GEN file. Settlement, both withdrawals, and an expected rejected reveal are recorded. A document judgment does not prove the steps execute successfully.

**How to:** Open the app and inspect the preloaded finalized auction. Read both pinned files, review receipts, settlement, and withdrawal transactions. Clone the public repository and run `pnpm verify:proof` to check all recorded receipts and current finalized state. A wallet is only needed to create or act on a new auction.

**Expected outcome:** Bid 1 is INELIGIBLE at 0.2 test GEN. Bid 2 is ELIGIBLE at 0.4 test GEN and wins. The sponsor receives a 0.1 test GEN surplus plus 0.5 test GEN excess funding credit; winner receives 0.4 test GEN. Both claimable balances are zero after withdrawal.

## Links

- Public app: https://proofbid-genlayer-20261021.opalfairy1.chatgpt.site
- Public source: https://github.com/smokexbadlines-dot/proofbid-genlayer
- Pinned contract source: https://github.com/smokexbadlines-dot/proofbid-genlayer/blob/f625b40fd83ef7e7ab5de65cb79b61604490d430/contracts/proof_bid.py
- Contract Explorer: https://explorer-studio.genlayer.com/address/0x0cF6733050F0c338B13ea76Aff1472ddC5755d26
- Proof manifest: https://github.com/smokexbadlines-dot/proofbid-genlayer/blob/main/deploy/proof.json
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
| Frontend wallet writes from a browser extension | NOT VERIFIED; contract writes and withdrawals were exercised in Studio |
| Portal submission | PENDING: human owner submits |

The seal transaction has a successful leader result but an `idle` validator receipt. Both file reviews have independent agreeing validator receipts. All amounts are StudioNet test GEN.
