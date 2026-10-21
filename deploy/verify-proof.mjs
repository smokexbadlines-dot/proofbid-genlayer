import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';

const proof = JSON.parse(readFileSync(new URL('./proof.json', import.meta.url), 'utf8'));
if (proof.status !== 'PROVEN' || !proof.contract_address || !Array.isArray(proof.transactions) || proof.transactions.length === 0) {
  console.error('No finalized live proof is recorded yet.');
  process.exit(1);
}
const digest = value => createHash('sha256').update(value).digest('hex');
const pinnedBase = `https://raw.githubusercontent.com/${proof.source_repo}/${proof.source_commit_at_deploy}`;
async function pinnedBytes(path) {
  const response = await fetch(`${pinnedBase}/${path}`);
  if (!response.ok) throw new Error(`Pinned ${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const source = await pinnedBytes('contracts/proof_bid.py');
if (digest(source) !== proof.source_sha256) throw new Error('The pinned contract source differs from the proof manifest.');
const client = createClient({ chain: studionet });
for (const item of proof.transactions) {
  const tx = await client.getTransaction({ hash: item.hash });
  const receipts = tx.consensus_data?.leader_receipt || [];
  const leader = receipts.find(r => r.mode === 'leader');
  const status = tx.statusName;
  const execution = leader?.execution_result;
  if (status !== 'FINALIZED' || execution !== item.expected_execution) {
    throw new Error(`${item.label}: got ${status}/${execution}, expected FINALIZED/${item.expected_execution}`);
  }
  if (tx.leader_only || tx.execution_mode !== 'NORMAL') throw new Error(`${item.label}: not full consensus.`);
  const payload = leader?.result?.payload;
  const readable = typeof payload === 'string' ? payload : payload?.readable;
  if (item.expected_payload && readable !== item.expected_payload) {
    throw new Error(`${item.label}: unexpected leader result ${readable}`);
  }
  if (item.expected_sender && tx.from_address.toLowerCase() !== item.expected_sender.toLowerCase()) {
    throw new Error(`${item.label}: unexpected sender.`);
  }
  if (item.require_validator_agreement && !receipts.some(r => r.mode === 'validator' && r.vote === 'agree' &&
    r.execution_result === 'SUCCESS' && r.result?.payload?.readable === item.expected_payload)) {
    throw new Error(`${item.label}: no independent agreeing validator receipt.`);
  }
  if (item.expected_validator_vote && !receipts.some(r => r.mode === 'validator' && r.vote === item.expected_validator_vote)) {
    throw new Error(`${item.label}: validator vote differs from recorded receipt.`);
  }
  if (item.label === 'Deploy') {
    if (tx.data?.contract_address?.toLowerCase() !== proof.contract_address.toLowerCase()) throw new Error('Deploy address mismatch.');
    const onchain = Buffer.from(tx.data?.contract_code || '', 'base64');
    if (digest(onchain) !== proof.deployed_source_sha256 ||
      onchain.toString('utf8').replace(/\r\n/g, '\n') !== source.toString('utf8').replace(/\r\n/g, '\n')) {
      throw new Error('Deployed contract code differs from the checked source after newline normalization.');
    }
  }
  console.log(`${item.label}: ${status}/${execution}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
}
const raw = await client.readContract({ address: proof.contract_address, functionName: 'get_snapshot', args: [],
  transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
if (typeof raw !== 'string') throw new Error('Unexpected snapshot format.');
const state = JSON.parse(raw);
for (const [key, expected] of Object.entries(proof.expected_snapshot || {})) {
  if (JSON.stringify(state[key]) !== JSON.stringify(expected)) throw new Error(`Snapshot mismatch: ${key}`);
}
for (const expected of proof.evidence || []) {
  const bid = state.bids?.find(b => b.id === expected.bid_id);
  if (!bid || bid.status !== expected.verdict || bid.price_wei !== expected.price_wei ||
    bid.body_sha !== expected.body_sha256 || bid.quote !== expected.quote || bid.path !== expected.path ||
    bid.repo !== proof.source_repo || bid.sha !== proof.source_commit_at_deploy) {
    throw new Error(`Bid ${expected.bid_id}: finalized evidence or verdict mismatch.`);
  }
  const bytes = await pinnedBytes(expected.path);
  if (digest(bytes) !== expected.body_sha256 || !bytes.toString('utf8').includes(expected.quote)) {
    throw new Error(`Bid ${expected.bid_id}: pinned file digest or quote mismatch.`);
  }
}
for (const expected of proof.expected_accounts || []) {
  const result = await client.readContract({ address: proof.contract_address, functionName: 'get_account',
    args: [expected.address], transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
  if (JSON.parse(result).claimable_wei !== expected.claimable_wei) {
    throw new Error(`${expected.address}: unexpected claimable balance.`);
  }
}
console.log(JSON.stringify({ ok: true, contract: proof.contract_address, winner: state.winner,
  winning_price_wei: state.winning_price_wei, status: state.settled ? 'settled' : 'open' }));
