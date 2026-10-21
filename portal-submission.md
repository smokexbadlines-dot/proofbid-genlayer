# ProofBid Portal packet

**Status:** Draft. Do not submit until the live evidence gate passes and the source repository is public.

**Contribution type:** Project / deployed Intelligent Contract

**One-liner:** A sealed-price reverse auction where GenLayer validators qualify pinned deliverables and deterministic code picks the cheapest eligible bid.

**Description (under 1,000 characters):** ProofBid lets a sponsor fund one public task with a frozen, observable acceptance criterion. Contributors commit hidden prices and commit-pinned GitHub files, then reveal both after bidding closes. GenLayer validators independently fetch each complete file, verify its raw SHA-256 and exact quote, and judge one criterion as ELIGIBLE, INELIGIBLE, or UNCLEAR. Contract code selects the lowest-priced eligible bid, credits the winner, and returns unused funds to the sponsor; deadline fallbacks prevent unresolved bids from locking the budget. The live demo should show a cheaper incomplete file losing to a complete file, settlement, withdrawals, and an expected rejected reveal. The app separates recorded receipts from current finalized state. A document judgment does not prove the steps execute successfully.

**How to:** Open the live app; load the contract address; inspect the frozen criterion, bids, verdicts, settlement, and balances; open linked Explorer transactions; compare the pinned files; run `pnpm verify:proof` from the public repository.

**Expected outcome:** Two completed bids are judged independently. Only the file with PostgreSQL and SQLite migration and rollback steps qualifies. The cheapest eligible bid wins, and the unused budget is credited back to the sponsor.

**Evidence URLs:** Add the public app, GitHub repository, pinned contract source at the deployed commit, Explorer contract, proof manifest, settlement transaction, both review transactions, expected rejected reveal, and withdrawal transactions after verifying each one.
