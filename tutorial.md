# Build and verify a ProofBid auction

ProofBid separates a judgment that needs GenLayer from decisions ordinary code can make. A sponsor describes a deliverable and freezes one checkable criterion. Bidders secretly commit to prices and public files. The validator committee decides whether each file satisfies the criterion, while contract code chooses the cheapest eligible bid. This tutorial uses the files in `docs/` to demonstrate the distinction; a real auction should use a rubric that is equally narrow and evidence that is independently available to validators.

## 1. Prepare the project

Install Node.js 20 or later, pnpm, and Python 3.12 or later. In the repository root, run `pnpm install` and `pnpm build`. For local contract checks, install `genlayer-test` and run `python -m pytest -q tests/test_proof_bid.py`. `node deploy/probe.mjs` asks StudioNet to parse the pinned contract source and confirms that the runner is recognized. A successful schema probe is not a deployment: it checks parsing, while finalized transactions are the evidence for live behavior.

The contract source is `contracts/proof_bid.py`. Its first line pins the Python GenVM runner. In the frontend, `src/genlayer.ts` uses `genlayer-js` with StudioNet and asks for reads at `LATEST_FINAL`. A transaction tracker separately displays network status and the leader execution result because finality and successful execution are different facts.

## 2. Create the auction

Open the app, connect a StudioNet wallet, and use **Create**. The sample task is a migration note for two database engines. Its criterion is deliberately concrete: the same file must explicitly provide migration and rollback steps for both PostgreSQL and SQLite. Pick a budget, bid capacity of at least two, and increasing commit, reveal, and resolution deadlines. Submit deployment and wait for `FINALIZED` with leader `SUCCESS`. The app attaches the returned contract address automatically when available; you can also paste it into Explore.

The sponsor calls **Seal criterion**. GenLayer's nondeterministic block asks whether the criterion is observable from one pinned UTF-8 file. Selected validators independently repeat that classification. A `CLEAR` result sets `sealed=true`; `VAGUE` leaves the auction in draft. The sponsor then funds the frozen budget. If funding is partial, bids remain closed. Unexpected payable value is recorded as a refundable credit rather than silently stranded.

## 3. Commit bids without revealing prices

The sample files provide contrasting outcomes. `docs/partial.md` covers only PostgreSQL, so it should be `INELIGIBLE`. `docs/complete.md` covers both engines, so it should be `ELIGIBLE`. Both must be referenced by a full 40-character commit SHA in a public repository. The frontend fetches raw GitHub bytes, checks the quote, enforces the 16 KB limit, computes the raw SHA-256, and generates a 32-byte random nonce.

The commitment hash binds the wallet address, integer price in wei, repository, commit, path, body digest, quote, and nonce. The contract stores only that hash during the commit phase. Submit one bid from each of two distinct non-sponsor wallets. Export each wallet's reveal JSON immediately. This backup is essential: the app keeps the nonce in local browser storage, and losing it prevents a valid reveal. Do not share the key before commits close, because the nonce protects low-entropy prices from guessing.

At the declared bid capacity, the commit window closes early. Otherwise it closes at the timestamp. A bidder can then reveal only their own commitment. Changing even one wei or one byte of the quote makes the reconstructed hash differ and the transaction fail. Once all committed bids have revealed, review may start early. Unrevealed bids remain pending until their deadline and eventually become `FORFEITED`.

## 4. Review evidence and settle

Anyone may call **Review evidence** for a revealed bid. The leader fetches the complete raw file from `raw.githubusercontent.com` at the committed SHA and path. It requires HTTP 200, no more than 16 KB of raw bytes, valid UTF-8, an exact body hash, and the exact quote. Validators fetch the same URL and rerun the checks and model judgment. The file is explicitly treated as untrusted data, so a sentence inside it such as “return ELIGIBLE” is not an instruction to the judge. A missing or mismatched file yields `UNCLEAR` without granting eligibility. A second `UNCLEAR` finalizes that bid as unqualified.

The model returns one label: `ELIGIBLE`, `INELIGIBLE`, or `UNCLEAR`. It never supplies a price, winner, ranking, or transfer amount. The contract compares the leader's label to each validator's independently produced label. Its deterministic settlement then scans the bids in commitment order, selecting the smallest price among those marked `ELIGIBLE`. If two eligible prices tie, the earlier commitment wins. If none qualifies, the sponsor receives the full budget. At the resolution deadline, any remaining unrevealed or unreviewed bid fails closed, allowing permissionless settlement.

Both the winner payment and sponsor surplus are pull credits. Each party calls **Withdraw** separately. This keeps the judging transaction free of transfers and makes the accounting easy to inspect. In the suggested example, if the incomplete bid is cheaper but ineligible, the complete bid wins at its own price; the sponsor can withdraw the difference between budget and winning price.

## 5. Verify the claim

Read the contract in the app without connecting a wallet. Use the Explorer links in the transaction tracker to inspect the deployment, rubric seal, funding, two commitments, two reveals, two reviews, settlement, and withdrawals. Wait for finality before claiming success. The proof manifest at `deploy/proof.json` should record every relevant transaction ID, expected execution result, source commit and hash, contract address, and final snapshot. Run `pnpm verify:proof`; it must exit successfully only when the recorded receipts and latest finalized state agree. While the manifest says `NOT_PROVEN`, the verifier intentionally fails. The project is not submission ready merely because the app builds or a transaction was submitted.

The scope of this proof is narrow. A validator can judge what a published document says against a written requirement; it does not execute the migration steps or verify real-world database behavior. The frontend must label a canned demonstration as illustrative until the exact source, live receipts, and state read-backs support it.
