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
const source = readFileSync(new URL('../contracts/proof_bid.py', import.meta.url));
const actualSourceSha = createHash('sha256').update(source).digest('hex');
if (proof.source_sha256 !== actualSourceSha) throw new Error('Current contract source differs from the evidenced deployment source.');
const client = createClient({ chain: studionet });
for (const item of proof.transactions) {
  const tx = await client.getTransaction({ hash: item.hash });
  const leader = tx.consensus_data?.leader_receipt?.find(r => r.mode === 'leader');
  const status = tx.statusName;
  const execution = leader?.execution_result;
  if (status !== 'FINALIZED' || execution !== item.expected_execution) {
    throw new Error(`${item.label}: got ${status}/${execution}, expected FINALIZED/${item.expected_execution}`);
  }
  console.log(`${item.label}: ${status}/${execution}`);
}
const raw = await client.readContract({ address: proof.contract_address, functionName: 'get_snapshot', args: [],
  transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
if (typeof raw !== 'string') throw new Error('Unexpected snapshot format.');
const state = JSON.parse(raw);
for (const [key, expected] of Object.entries(proof.expected_snapshot || {})) {
  if (JSON.stringify(state[key]) !== JSON.stringify(expected)) throw new Error(`Snapshot mismatch: ${key}`);
}
console.log(JSON.stringify({ ok: true, contract: proof.contract_address, winner: state.winner,
  winning_price_wei: state.winning_price_wei, status: state.settled ? 'settled' : 'open' }));
