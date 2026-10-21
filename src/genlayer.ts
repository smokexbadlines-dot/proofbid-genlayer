import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import type { TransactionHash } from 'genlayer-js/types';
import contractCode from '../contracts/proof_bid.py?raw';
import type { Auction } from './types';

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
declare global { interface Window { ethereum?: EthereumProvider } }

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const txPattern = /^0x[0-9a-fA-F]{64}$/;
export const validAddress = (value: string): value is `0x${string}` => addressPattern.test(value);
const validTx = (value: string): value is `0x${string}` => txPattern.test(value);
export const explorer = 'https://explorer-studio.genlayer.com';
export const readClient = () => createClient({ chain: studionet });

async function walletClient(account: `0x${string}`) {
  if (!window.ethereum) throw new Error('A browser wallet such as MetaMask is required for writes.');
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  const active = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof active !== 'string' || active.toLowerCase() !== account.toLowerCase()) {
    throw new Error('The active wallet account changed. Connect again before writing.');
  }
  const client = createClient({ chain: studionet, account, provider: window.ethereum });
  await client.connect('studionet');
  return client;
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (!window.ethereum) throw new Error('A browser wallet such as MetaMask is required for writes.');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const account = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof account !== 'string' || !validAddress(account)) throw new Error('Wallet did not return an address.');
  await walletClient(account);
  return account;
}

export async function readAuction(address: `0x${string}`): Promise<Auction> {
  const result = await readClient().readContract({
    address, functionName: 'get_snapshot', args: [],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
  if (typeof result !== 'string') throw new Error('Unexpected contract read format.');
  const value = JSON.parse(result) as Auction;
  if (!Array.isArray(value.bids) || !value.task || !value.criterion) throw new Error('This address is not a ProofBid auction.');
  return value;
}

export async function readCredit(address: `0x${string}`, account: `0x${string}`): Promise<string> {
  const result = await readClient().readContract({
    address, functionName: 'get_account', args: [account],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
  if (typeof result !== 'string') throw new Error('Unexpected account read format.');
  return (JSON.parse(result) as {claimable_wei: string}).claimable_wei;
}

function txHash(result: unknown): `0x${string}` {
  const candidate = typeof result === 'string' ? result :
    result && typeof result === 'object' ?
      ('hash' in result ? result.hash : 'txId' in result ? result.txId : 'transactionHash' in result ? result.transactionHash : undefined) : undefined;
  if (typeof candidate !== 'string' || !validTx(candidate)) {
    throw new Error('The wallet may have submitted the transaction, but no transaction ID was returned. Check the wallet before retrying.');
  }
  return candidate;
}

export async function deploy(account: `0x${string}`, args: (string | number | bigint)[]) {
  return txHash(await (await walletClient(account)).deployContract({ code: contractCode, args }));
}

export async function write(address: `0x${string}`, account: `0x${string}`, functionName: string,
  args: (string | number | bigint)[] = [], value = 0n) {
  return txHash(await (await walletClient(account)).writeContract({ address, functionName, args, value }));
}

export async function txStatus(hash: `0x${string}`) {
  const tx = await readClient().getTransaction({ hash: hash as TransactionHash });
  const decoded = tx.txDataDecoded;
  const contractAddress = decoded && 'contractAddress' in decoded ? decoded.contractAddress : tx.recipient;
  const receipts = (tx.consensus_data as {leader_receipt?: Array<{mode?: string; execution_result?: string}>} | undefined)?.leader_receipt;
  const leader = receipts?.find(r => r.mode === 'leader');
  return {
    status: tx.statusName ?? 'UNKNOWN',
    execution: leader?.execution_result ?? 'UNKNOWN',
    contractAddress: typeof contractAddress === 'string' && validAddress(contractAddress) ? contractAddress : undefined,
  };
}

export async function appeal(account: `0x${string}`, txId: `0x${string}`) {
  const client = await walletClient(account);
  if (!await client.canAppeal({ txId })) throw new Error('This transaction is not currently appealable.');
  const charge = await client.getMinAppealBond({ txId });
  await client.appealTransaction({ txId, value: charge });
}

export function parseGen(value: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value)) throw new Error('Enter a GEN amount with up to 18 decimals.');
  const [whole, decimals = ''] = value.split('.');
  const wei = BigInt(whole) * 10n ** 18n + BigInt(decimals.padEnd(18, '0'));
  if (wei <= 0n) throw new Error('Amount must be greater than zero.');
  return wei;
}

export function formatGen(value: string): string {
  try {
    const amount = BigInt(value);
    const whole = amount / 10n ** 18n;
    const fraction = (amount % 10n ** 18n).toString().padStart(18, '0').slice(0, 6).replace(/0+$/, '');
    return `${whole}${fraction ? '.' + fraction : ''} GEN`;
  } catch { return '—'; }
}

export function rawUrl(repo: string, sha: string, path: string) {
  return `https://raw.githubusercontent.com/${repo}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function sha256(bytes: ArrayBuffer | Uint8Array | string): Promise<string> {
  const data: ArrayBuffer = typeof bytes === 'string' ? new TextEncoder().encode(bytes).buffer :
    bytes instanceof Uint8Array ? new Uint8Array(bytes).buffer : bytes;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function makeCommitment(owner: string, priceWei: bigint, repo: string, sha: string,
  path: string, bodySha: string, quote: string, nonce: string) {
  return sha256(['PROOFBID1', owner.toLowerCase(), priceWei.toString(), repo, sha.toLowerCase(), path,
    bodySha.toLowerCase(), quote, nonce.toLowerCase()].join('\n'));
}
