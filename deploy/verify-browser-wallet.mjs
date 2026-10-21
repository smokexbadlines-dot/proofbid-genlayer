import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';

const manifestArg = process.argv.find(arg => arg.startsWith('--manifest='));
const manifestName = manifestArg?.slice('--manifest='.length) || 'browser-wallet-proof.json';
if (!/^browser-[a-z-]+\.json$/.test(manifestName)) throw new Error('Invalid browser proof manifest name.');
const proof = JSON.parse(readFileSync(new URL(`./${manifestName}`, import.meta.url), 'utf8'));
if (proof.status !== 'PROVEN' && !process.argv.includes('--partial')) {
  throw new Error('Browser-wallet proof is still in progress. Use --partial to inspect finalized steps.');
}
const digest = value => createHash('sha256').update(value).digest('hex');
const pinnedBase = `https://raw.githubusercontent.com/${proof.source_repo}/${proof.source_commit_at_deploy}`;
async function pinnedFile(path) {
  const response = await fetch(`${pinnedBase}/${path}`);
  if (!response.ok) throw new Error(`Pinned ${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
async function bidFile(bid) {
  const response = await fetch(`https://raw.githubusercontent.com/${bid.repo}/${bid.sha}/${bid.path}`);
  if (!response.ok) throw new Error(`Pinned bid ${bid.path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const source = await pinnedFile('contracts/proof_bid.py');
if (digest(source) !== proof.source_sha256) {
  throw new Error('Public source commit differs from deployed contract source.');
}

const client = createClient({ chain: studionet });
for (const item of proof.transactions) {
  const tx = await client.getTransaction({ hash: item.hash });
  const receipts = tx.consensus_data?.leader_receipt || [];
  const leader = receipts.find(receipt => receipt.mode === 'leader');
  const payload = leader?.result?.payload;
  const readable = typeof payload === 'string' ? payload : payload?.readable;
  if (tx.statusName !== 'FINALIZED' || leader?.execution_result !== item.expected_execution) {
    throw new Error(`${item.label}: ${tx.statusName}/${leader?.execution_result}`);
  }
  if (tx.leader_only || tx.execution_mode !== 'NORMAL') throw new Error(`${item.label}: not full consensus.`);
  if (tx.from_address.toLowerCase() !== item.from.toLowerCase()) throw new Error(`${item.label}: sender mismatch.`);
  if (item.expected_payload && readable !== item.expected_payload) throw new Error(`${item.label}: result mismatch.`);
  if (item.require_validator_agreement && !receipts.some(receipt => receipt.mode === 'validator' &&
    receipt.vote === 'agree' && receipt.execution_result === item.expected_execution &&
    (!item.expected_payload || receipt.result?.payload?.readable === item.expected_payload))) {
    throw new Error(`${item.label}: no independent agreeing validator receipt.`);
  }
  if (item.label === 'Browser wallet deploy') {
    if (tx.data?.contract_address?.toLowerCase() !== proof.contract_address.toLowerCase()) {
      throw new Error('Deployed address mismatch.');
    }
    if (!Buffer.from(tx.data?.contract_code || '', 'base64').equals(source)) {
      throw new Error('Browser-deployed source is not byte-identical to the public contract.');
    }
  }
  console.log(`${item.label}: FINALIZED/${item.expected_execution}`);
  await new Promise(resolve => setTimeout(resolve, 500));
}

const result = await client.readContract({ address: proof.contract_address, functionName: 'get_snapshot', args: [],
  transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
if (typeof result !== 'string') throw new Error('Unexpected snapshot format.');
const snapshot = JSON.parse(result);
for (const [field, expected] of Object.entries(proof.expected_snapshot)) {
  if (JSON.stringify(snapshot[field]) !== JSON.stringify(expected)) throw new Error(`Snapshot mismatch: ${field}`);
}
if (proof.expected_bid) {
  const bid = snapshot.bids?.find(item => item.id === proof.expected_bid.id);
  if (!bid) throw new Error('Expected bid absent.');
  for (const [field, expected] of Object.entries(proof.expected_bid)) {
    if (JSON.stringify(bid[field]) !== JSON.stringify(expected)) throw new Error(`Bid mismatch: ${field}`);
  }
  if (proof.expected_bid.path) {
    const bytes = await bidFile(bid);
    if (digest(bytes) !== bid.body_sha || !bytes.toString('utf8').includes(bid.quote)) {
      throw new Error('Pinned bid file differs from judged evidence.');
    }
  }
}
for (const account of proof.expected_accounts || []) {
  const raw = await client.readContract({ address: proof.contract_address, functionName: 'get_account',
    args: [account.address], transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
  if (JSON.parse(raw).claimable_wei !== account.claimable_wei) throw new Error('Final credit mismatch.');
}
console.log(JSON.stringify({ ok: true, status: proof.status, contract: proof.contract_address,
  bids: snapshot.bids?.length, settled: snapshot.settled, winner: snapshot.winner }));
