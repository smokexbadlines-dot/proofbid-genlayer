import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Check, CircleHelp, Clock3, Code2, Coins, ExternalLink,
  FileCheck2, Fingerprint, Gavel, GitCommitHorizontal, LockKeyhole, RefreshCcw, ShieldCheck, Wallet } from 'lucide-react';
import { appeal, connectWallet, deploy, explorer, formatGen, makeCommitment, parseGen,
  rawUrl, readAuction, readCredit, sha256, txStatus, validAddress, write } from './genlayer';
import type { Auction, RevealSecret, TrackedTx } from './types';
import proof from '../deploy/proof.json';
import './styles.css';

const TX_KEY = 'proofbid-tx-v1';
const ADDRESS_KEY = 'proofbid-address-v1';
const SECRET_KEY = 'proofbid-reveal-v1';
const DEFAULT_TASK = 'Publish a migration note for both supported database engines.';
const DEFAULT_CRITERION = 'The file explicitly gives migration and rollback steps for PostgreSQL and SQLite.';
const DEMO_ADDRESS = proof.contract_address as `0x${string}`;
const proofTx = (label: string) => proof.transactions.find(item => item.label === label)?.hash;

function getStored<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

function dateInput(days: number) {
  const d = new Date(Date.now() + days * 86400_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function date(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value * 1000);
}

function short(value: string, n = 8) {
  return value.length > 2 * n ? `${value.slice(0, n)}…${value.slice(-n)}` : value;
}

function stage(a: Auction): string {
  if (a.settled) return a.winner ? 'Awarded' : 'Refunded';
  if (!a.sealed) return 'Draft';
  if (a.funded_wei !== a.budget_wei) return 'Awaiting funding';
  const now = Date.now() / 1000;
  if (now < a.commit_deadline && a.bids.length < a.max_bids) return 'Sealed bids open';
  if (now < a.reveal_deadline && a.bids.some(b => b.status === 'COMMITTED')) return 'Reveal window';
  return 'Review and settle';
}

function App() {
  const [addressInput, setAddressInput] = useState(localStorage.getItem(ADDRESS_KEY) || DEMO_ADDRESS);
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [credit, setCredit] = useState('0');
  const [publicCredits, setPublicCredits] = useState<{sponsor: string | null; winner: string | null}>({sponsor: null, winner: null});
  const [txs, setTxs] = useState<TrackedTx[]>(() => getStored(TX_KEY, []));
  const [secrets, setSecrets] = useState<RevealSecret[]>(() => getStored(SECRET_KEY, []));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'explore' | 'create'>('explore');
  const [task, setTask] = useState(DEFAULT_TASK);
  const [criterion, setCriterion] = useState(DEFAULT_CRITERION);
  const [budget, setBudget] = useState('0.1');
  const [capacity, setCapacity] = useState('2');
  const [commitAt, setCommitAt] = useState(dateInput(1));
  const [revealAt, setRevealAt] = useState(dateInput(2));
  const [resolveAt, setResolveAt] = useState(dateInput(3));
  const [price, setPrice] = useState('0.03');
  const [repo, setRepo] = useState('');
  const [sha, setSha] = useState('');
  const [path, setPath] = useState('');
  const [quote, setQuote] = useState('');
  const [importText, setImportText] = useState('');

  useEffect(() => { localStorage.setItem(TX_KEY, JSON.stringify(txs)); }, [txs]);
  useEffect(() => { localStorage.setItem(SECRET_KEY, JSON.stringify(secrets)); }, [secrets]);

  const refresh = useCallback(async (target = address, wallet = account) => {
    if (!target) return;
    setLoading(true);
    setPublicCredits({sponsor: null, winner: null});
    try {
      const next = await readAuction(target);
      setAuction(next);
      setCredit(wallet ? await readCredit(target, wallet) : '0');
      const winningOwner = next.bids.find(b => b.id === next.winner)?.owner;
      const [sponsorBalance, winnerBalance] = await Promise.allSettled([
        readCredit(target, next.sponsor as `0x${string}`),
        winningOwner ? readCredit(target, winningOwner as `0x${string}`) : Promise.resolve(null),
      ]);
      setPublicCredits({
        sponsor: sponsorBalance.status === 'fulfilled' ? sponsorBalance.value : null,
        winner: winnerBalance.status === 'fulfilled' ? winnerBalance.value : null,
      });
      setError('');
    } catch (cause) {
      setAuction(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  }, [address, account]);

  useEffect(() => {
    const candidate = new URLSearchParams(location.search).get('contract') || localStorage.getItem(ADDRESS_KEY) || DEMO_ADDRESS;
    if (validAddress(candidate)) { setAddress(candidate); setAddressInput(candidate); }
  }, []);
  useEffect(() => { if (address) void refresh(address, account); }, [address, account, refresh]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      const pending = txs.filter(t => !['FINALIZED', 'CANCELED', 'UNDETERMINED'].includes(t.status));
      if (!pending.length) return;
      const results = await Promise.all(pending.map(async t => {
        try { return { tx: t, result: await txStatus(t.hash) }; } catch { return null; }
      }));
      if (!alive) return;
      setTxs(previous => previous.map(t => {
        const match = results.find(r => r?.tx.hash === t.hash);
        return match ? { ...t, status: match.result.status, execution: match.result.execution } : t;
      }));
      for (const item of results) {
        if (item?.result.status === 'FINALIZED' && item.result.execution === 'SUCCESS') {
          if (item.tx.deploy && item.result.contractAddress) attach(item.result.contractAddress);
          else void refresh();
        }
      }
    }
    void poll();
    const timer = setInterval(() => { void poll(); }, 9000);
    return () => { alive = false; clearInterval(timer); };
  }, [txs, refresh]);

  function attach(next: `0x${string}`) {
    setAddress(next); setAddressInput(next);
    localStorage.setItem(ADDRESS_KEY, next);
    const params = new URLSearchParams(location.search);
    params.set('contract', next);
    history.replaceState(null, '', `${location.pathname}?${params}`);
    setTab('explore');
  }

  function track(hash: `0x${string}`, label: string, isDeploy = false) {
    setTxs(previous => [{ hash, label, status: 'SUBMITTED', execution: 'UNKNOWN',
      submittedAt: Date.now(), deploy: isDeploy }, ...previous].slice(0, 40));
    setMessage(`${label} submitted. Its result is provisional until finality.`);
  }

  async function action(label: string, run: () => Promise<`0x${string}`>, isDeploy = false) {
    setBusy(true); setError(''); setMessage('');
    try { track(await run(), label, isDeploy); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!account) { setError('Connect a wallet to create an auction.'); return; }
    const times = [commitAt, revealAt, resolveAt].map(x => Math.floor(new Date(x).getTime() / 1000));
    if (times.some(x => !Number.isFinite(x)) || !(times[0] < times[1] && times[1] < times[2])) {
      setError('Choose three increasing deadlines.'); return;
    }
    await action('Deploy ProofBid', () => deploy(account, [task, criterion, parseGen(budget), Number(capacity), ...times]), true);
  }

  async function call(label: string, method: string, args: (string | number | bigint)[] = [], value = 0n) {
    if (!address || !account) { setError('Attach a contract and connect a wallet.'); return; }
    await action(label, () => write(address, account, method, args, value));
  }

  async function handleCommit(event: React.FormEvent) {
    event.preventDefault();
    if (!address || !account || !auction) { setError('Attach a contract and connect a wallet.'); return; }
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[a-fA-F0-9]{40}$/.test(sha) || !path || quote.length < 12 || /[\r\n]/.test(quote)) {
      setError('Enter a repository, 40-character commit, file path, and a one-line quote of at least 12 characters.'); return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(rawUrl(repo, sha, path), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Pinned evidence returned HTTP ${response.status}.`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 16000) throw new Error('Evidence file exceeds the 16 KB contract limit.');
      const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!body.includes(quote)) throw new Error('The quote is absent from the pinned file.');
      const bodySha = await sha256(bytes);
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x => x.toString(16).padStart(2, '0')).join('');
      const priceWei = parseGen(price);
      if (priceWei > BigInt(auction.budget_wei)) throw new Error('Bid price exceeds the sponsor budget.');
      const commitment = await makeCommitment(account, priceWei, repo, sha, path, bodySha, quote, nonce);
      const secret: RevealSecret = { contract: address, owner: account, price: priceWei.toString(), repo,
        sha: sha.toLowerCase(), path, bodySha, quote, nonce, commitment };
      setSecrets(previous => [secret, ...previous.filter(x => x.commitment !== commitment)]);
      track(await write(address, account, 'commit_bid', [commitment]), 'Commit sealed bid');
      setMessage('Commit submitted. Export your reveal key before changing browsers or clearing storage.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  function findSecret(commitment: string) {
    return secrets.find(x => x.commitment.toLowerCase() === commitment.toLowerCase() &&
      x.contract.toLowerCase() === address?.toLowerCase());
  }

  function exportSecret(secret: RevealSecret) {
    const blob = new Blob([JSON.stringify(secret, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `proofbid-reveal-${secret.commitment.slice(0, 10)}.json`; link.click();
    URL.revokeObjectURL(url);
  }

  function importSecret() {
    try {
      const parsed = JSON.parse(importText) as RevealSecret;
      if (!parsed.contract || !parsed.owner || !/^[a-f0-9]{64}$/i.test(parsed.commitment) || !/^[a-f0-9]{64}$/i.test(parsed.nonce)) {
        throw new Error('Invalid reveal key.');
      }
      setSecrets(previous => [parsed, ...previous.filter(x => x.commitment !== parsed.commitment)]);
      setImportText(''); setMessage('Reveal key restored.'); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function reveal(bidId: number, commitment: string) {
    const secret = findSecret(commitment);
    if (!secret) { setError('This browser has no reveal key for that commitment. Import the saved JSON key.'); return; }
    await call('Reveal bid', 'reveal_bid', [bidId, BigInt(secret.price), secret.repo, secret.sha,
      secret.path, secret.bodySha, secret.quote, secret.nonce]);
  }

  const localBid = useMemo(() => auction?.bids.find(b => b.owner.toLowerCase() === account?.toLowerCase()), [auction, account]);
  const canFund = auction && account?.toLowerCase() === auction.sponsor.toLowerCase() && auction.sealed && !auction.settled && BigInt(auction.funded_wei) < BigInt(auction.budget_wei);
  const remaining = auction ? (BigInt(auction.budget_wei) - BigInt(auction.funded_wei)).toString() : '0';
  const commitsClosed = auction && (Date.now() / 1000 >= auction.commit_deadline || auction.bids.length >= auction.max_bids);
  const revealsClosed = auction && (Date.now() / 1000 >= auction.reveal_deadline || (commitsClosed && auction.bids.every(b => b.status !== 'COMMITTED')));
  const isDemo = address?.toLowerCase() === DEMO_ADDRESS.toLowerCase();

  return <>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar wrap">
      <a className="brand" href="/" aria-label="ProofBid home"><span className="brand-icon"><Fingerprint size={25}/></span><span>Proof<span>Bid</span></span></a>
      <div className="top-right"><span className="network"><i/> STUDIO<span>NET</span></span>
        <button className="wallet-button" disabled={busy} onClick={() => void (async () => { try { setAccount(await connectWallet()); setError(''); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } })()}>
          <Wallet size={16}/> {account ? short(account, 5) : 'Connect wallet'}
        </button></div>
    </header>

    <main className="wrap">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> THE GENLAYER NATIVE REVERSE AUCTION</div>
          <h1>Evidence decides eligibility.<br/><em>Code decides price.</em></h1>
          <p>Post one verifiable task. Contributors seal their prices, reveal commit-pinned work, and let independent validators check the rubric. The lowest eligible bid wins by code.</p>
          <div className="hero-actions"><button className="primary" onClick={() => { setTab('create'); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>Launch an auction <ArrowRight size={17}/></button>
            <button className="ghost" onClick={() => { setTab('explore'); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore a contract <ArrowUpRight size={17}/></button></div>
          <div className="hero-note"><ShieldCheck size={15}/> All verdicts stay provisional until GenLayer finality.</div>
        </div>
        <div className="hero-visual" aria-label="Auction steps"><div className="visual-header"><span>PROOFBID / PROTOCOL</span><span className="visual-dots"><i/><i/><i/></span></div>
          <div className="visual-flow"><div><span className="flow-number">01</span><LockKeyhole/><strong>SEALED BID</strong><small>Price + pinned artifact</small></div><span className="flow-arrow">↓</span>
            <div><span className="flow-number">02</span><FileCheck2/><strong>VALIDATOR REVIEW</strong><small>One criterion, one file</small></div><span className="flow-arrow">↓</span>
            <div><span className="flow-number">03</span><Coins/><strong>LOWEST ELIGIBLE</strong><small>Deterministic settlement</small></div></div>
          <div className="visual-footer"><span>NO MODEL SETS THE PRICE</span><span>↗</span></div></div>
      </section>

      <section className="metrics" aria-label="Protocol rules"><div><span>01 /</span><strong>Frozen rubric</strong><small>Terms cannot change after deployment.</small></div><div><span>02 /</span><strong>Pinned evidence</strong><small>Exact Git commit and SHA-256 checked.</small></div><div><span>03 /</span><strong>Open settlement</strong><small>Anyone can review and settle on time.</small></div></section>

      <section className="live-proof" aria-label="Finalized StudioNet demonstration"><div className="live-proof-head"><div><div className="eyebrow">LIVE STUDIO NET PROOF</div><h2>Cheapest is not always eligible.</h2><p>Two pinned files were reviewed. The 0.2 GEN bid failed the rubric; the 0.4 GEN bid met it and won. Settlement and both withdrawals are finalized.</p></div><span className="proof-tag"><Check size={14}/> FINALIZED</span></div>
        <div className="proof-results"><div><span>BID 01 · 0.2 GEN</span><strong className="proof-no">INELIGIBLE</strong><a href={`${explorer}/tx/${proofTx('Review cheaper bid')}`} target="_blank" rel="noreferrer">Review receipt <ExternalLink size={12}/></a></div><div><span>BID 02 · 0.4 GEN</span><strong className="proof-yes">ELIGIBLE · WINNER</strong><a href={`${explorer}/tx/${proofTx('Review complete bid')}`} target="_blank" rel="noreferrer">Review receipt <ExternalLink size={12}/></a></div><div><span>SETTLEMENT</span><strong>0.1 GEN SURPLUS</strong><a href={`${explorer}/tx/${proofTx('Settle auction')}`} target="_blank" rel="noreferrer">Award receipt <ExternalLink size={12}/></a></div></div>
        <div className="proof-links"><button className="secondary" onClick={() => { attach(DEMO_ADDRESS); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>Inspect finalized auction <ArrowRight size={15}/></button><a href={`https://github.com/${proof.source_repo}/blob/main/deploy/proof.json`} target="_blank" rel="noreferrer">Full proof manifest <ArrowUpRight size={14}/></a><a href={`${explorer}/tx/${proofTx('Unauthorized reveal rejected')}`} target="_blank" rel="noreferrer">Rejected reveal <ArrowUpRight size={14}/></a></div>
      </section>

      <section id="workspace" className="workspace"><div className="section-heading"><div><div className="eyebrow">WORKSPACE</div><h2>Operate the auction</h2></div><div className="tabs"><button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Explore</button><button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>Create</button></div></div>
        {error && <div className="alert error" role="alert">{error}</div>}{message && <div className="alert notice">{message}</div>}
        {tab === 'create' ? <div className="grid two"><form className="panel form" onSubmit={e => void handleCreate(e)}><div className="panel-head"><span className="badge">01</span><h3>Define a new auction</h3></div>
          <label>Public task<textarea value={task} onChange={e => setTask(e.target.value)} rows={2} minLength={20} maxLength={240} required/></label>
          <label>One observable acceptance criterion<textarea value={criterion} onChange={e => setCriterion(e.target.value)} rows={3} minLength={30} maxLength={300} required/></label>
          <div className="field-row"><label>Budget (GEN)<input value={budget} onChange={e => setBudget(e.target.value)} required/></label><label>Bid capacity<input type="number" min="2" max="8" value={capacity} onChange={e => setCapacity(e.target.value)} required/></label></div>
          <div className="field-row"><label>Commit deadline<input type="datetime-local" value={commitAt} onChange={e => setCommitAt(e.target.value)} required/></label><label>Reveal deadline<input type="datetime-local" value={revealAt} onChange={e => setRevealAt(e.target.value)} required/></label></div>
          <label>Resolution deadline<input type="datetime-local" value={resolveAt} onChange={e => setResolveAt(e.target.value)} required/></label>
          <button className="primary full" disabled={busy || !account} type="submit">Deploy contract <ArrowRight size={16}/></button><small>After finality, seal the criterion and fund the budget in Explore.</small></form>
          <aside className="panel explainer"><div className="panel-head"><span className="badge amber">!</span><h3>How the rules work</h3></div><p>A validator first checks that your criterion is observable from one UTF-8 file. Contributors then commit to a price and artifact before revealing either.</p><ol><li>Fund the exact budget.</li><li>Collect 2–8 sealed bids.</li><li>Review each revealed file against the frozen criterion.</li><li>Settle the lowest eligible price and credit any surplus.</li></ol><div className="callout"><CircleHelp size={18}/><span>At capacity, commits close early. If every bidder reveals, review can start early. All unresolved bids expire at the resolution deadline.</span></div></aside></div> : <>
          <div className="attach-bar"><label htmlFor="contract-address">CONTRACT ADDRESS</label><input id="contract-address" value={addressInput} placeholder="0x…" onChange={e => setAddressInput(e.target.value)}/><button className="secondary" onClick={() => validAddress(addressInput) ? attach(addressInput) : setError('Enter a valid 0x contract address.')}>Load contract</button><button className="icon-button" title="Refresh finalized state" onClick={() => void refresh()} disabled={!address || loading}><RefreshCcw size={17} className={loading ? 'spin' : ''}/></button></div>
           {!auction ? <div className="empty panel"><Code2 size={36}/><h3>No auction loaded</h3><p>Check the StudioNet connection, or paste another ProofBid address to inspect its finalized state.</p></div> : <>
            <div className="auction-banner"><div><div className="eyebrow">FINALIZED CONTRACT STATE</div><h3>{auction.task}</h3><p>{auction.criterion}</p></div><span className="status-pill">{stage(auction)}</span></div>
            <div className="stats"><div><span>SPONSOR BUDGET</span><strong>{formatGen(auction.budget_wei)}</strong></div><div><span>FUNDED</span><strong>{formatGen(auction.funded_wei)}</strong></div><div><span>BIDS</span><strong>{auction.bids.length} / {auction.max_bids}</strong></div><div><span>WINNING PRICE</span><strong>{auction.winner ? formatGen(auction.winning_price_wei) : '—'}</strong></div></div>
            {auction.settled && <div className="public-ledger" aria-label="Finalized claimable balances"><div><span>SPONSOR · {short(auction.sponsor, 6)}</span><strong>Claimable: {publicCredits.sponsor === null ? 'Unavailable' : formatGen(publicCredits.sponsor)}</strong>{isDemo && <a href={`${explorer}/tx/${proofTx('Sponsor withdrawal')}`} target="_blank" rel="noreferrer">Withdrawal receipt <ExternalLink size={12}/></a>}</div>{auction.winner > 0 && <div><span>WINNER · {short(auction.bids[auction.winner - 1].owner, 6)}</span><strong>Claimable: {publicCredits.winner === null ? 'Unavailable' : formatGen(publicCredits.winner)}</strong>{isDemo && <a href={`${explorer}/tx/${proofTx('Winner withdrawal')}`} target="_blank" rel="noreferrer">Withdrawal receipt <ExternalLink size={12}/></a>}</div>}</div>}
            <div className="grid two"><div className="panel"><div className="panel-head"><span className="badge">01</span><h3>Sponsor controls</h3></div><div className="deadline"><Clock3 size={16}/><span>Commit closes {date(auction.commit_deadline)}</span></div><p>Frozen terms are set. Seal only when the criterion is clear enough for validators to judge from one file.</p>
              {!auction.sealed && <button className="secondary full" disabled={busy || account?.toLowerCase() !== auction.sponsor.toLowerCase()} onClick={() => void call('Seal criterion', 'seal')}>Seal criterion</button>}
              {canFund && <button className="primary full" disabled={busy} onClick={() => void call('Fund auction', 'fund', [], BigInt(remaining))}>Fund remaining {formatGen(remaining)}</button>}
              {auction.sealed && !canFund && <div className="subtle"><Check size={16}/> {auction.funded_wei === auction.budget_wei ? 'Fully funded' : 'Connect sponsor wallet to fund'}</div>}
              <div className="divider"/><div className="small-head">Deadlines</div><div className="key-values"><span>Reveal</span><strong>{date(auction.reveal_deadline)}</strong><span>Resolution</span><strong>{date(auction.resolution_deadline)}</strong></div>
            </div><div className="panel"><div className="panel-head"><span className="badge purple">02</span><h3>Submit a sealed bid</h3></div><p>Use a public UTF-8 GitHub file pinned to a 40-character commit. Your price and evidence remain hidden until reveal.</p>
              <form className="form compact" onSubmit={e => void handleCommit(e)}><div className="field-row"><label>Bid (GEN)<input value={price} onChange={e => setPrice(e.target.value)} required/></label><label>Repository<input placeholder="owner/repo" value={repo} onChange={e => setRepo(e.target.value)} required/></label></div>
                <label>Commit SHA<input placeholder="40 hexadecimal characters" value={sha} onChange={e => setSha(e.target.value)} required/></label><label>File path<input placeholder="docs/migration.md" value={path} onChange={e => setPath(e.target.value)} required/></label><label>Exact one-line quote<input placeholder="A sentence from the pinned file" value={quote} onChange={e => setQuote(e.target.value)} required/></label>
                <button className="primary full" type="submit" disabled={busy || !account || account.toLowerCase() === auction.sponsor.toLowerCase() || !!localBid || !auction.sealed || auction.funded_wei !== auction.budget_wei || !!commitsClosed}>Check evidence & commit <LockKeyhole size={16}/></button></form>
              {localBid && <p className="hint">Your bid is #{localBid.id} · {localBid.status}. Keep your reveal key until finality.</p>}
            </div></div>
            <div className="section-heading small"><div><div className="eyebrow">BID REGISTER</div><h2>Submitted work</h2></div><span className="muted">Prices appear only after reveal</span></div>
            <div className="bid-list">{auction.bids.length ? auction.bids.map(b => <div className="bid-card" key={b.id}><div className="bid-top"><span className="bid-index">BID {String(b.id).padStart(2, '0')}</span><span className={`bid-status ${b.status.toLowerCase()}`}>{b.status}</span></div><div className="bid-main"><strong>{b.status === 'COMMITTED' ? 'Sealed artifact' : b.repo + '/' + b.path}</strong><span>{b.price_wei === '0' ? 'Price sealed' : formatGen(b.price_wei)}</span></div><div className="bid-meta"><span>{short(b.owner, 7)}</span>{b.sha && <a href={rawUrl(b.repo, b.sha, b.path)} target="_blank" rel="noreferrer">View pinned file <ExternalLink size={12}/></a>}{b.quote && <q>{b.quote}</q>}</div><div className="bid-actions">
                {b.status === 'COMMITTED' && account?.toLowerCase() === b.owner.toLowerCase() && findSecret(b.commitment) && <button className="text-button" onClick={() => exportSecret(findSecret(b.commitment)!)}>Export reveal key</button>}
                {b.status === 'COMMITTED' && account?.toLowerCase() === b.owner.toLowerCase() && commitsClosed && Date.now() / 1000 < auction.reveal_deadline && <button className="secondary" disabled={busy} onClick={() => void reveal(b.id, b.commitment)}>Reveal bid</button>}
                {b.status === 'REVEALED' && revealsClosed && Date.now() / 1000 < auction.resolution_deadline && <button className="secondary" disabled={busy} onClick={() => void call(`Review bid ${b.id}`, 'review_bid', [b.id])}>Review evidence</button>}
              </div></div>) : <div className="empty compact-empty">No bids committed yet.</div>}</div>
            <div className="grid two footer-panels"><div className="panel"><div className="panel-head"><span className="badge amber"><Gavel size={16}/></span><h3>Settle & withdraw</h3></div><p>Anyone may settle when all revealed bids have final verdicts, or once the resolution deadline passes. Unreviewed bids then fail closed.</p><button className="secondary full" disabled={busy || !account || auction.settled} onClick={() => void call('Settle auction', 'settle')}>Settle auction</button><div className="divider"/><div className="claim-row"><div><span>YOUR CLAIMABLE BALANCE</span><strong>{account ? formatGen(credit) : 'Connect wallet'}</strong></div><button className="primary" disabled={busy || !account || BigInt(credit) === 0n} onClick={() => void call('Withdraw GEN', 'withdraw')}>Withdraw</button></div></div>
              <div className="panel"><div className="panel-head"><span className="badge purple"><GitCommitHorizontal size={16}/></span><h3>Reveal key backup</h3></div><p>Your nonce lives only in this browser unless you export it. Restore a saved JSON key here before revealing.</p><textarea className="import-box" rows={4} placeholder="Paste saved reveal JSON" value={importText} onChange={e => setImportText(e.target.value)}/><button className="secondary full" disabled={!importText} onClick={importSecret}>Import reveal key</button><div className="callout"><ShieldCheck size={17}/><span>Never publish your reveal key before the commit window closes.</span></div></div></div>
          </>}
        </>}
      </section>

      <section className="transactions"><div className="section-heading small"><div><div className="eyebrow">TRANSACTION TRACKER</div><h2>Proof takes finality</h2></div><span className="muted">Polling every 9 seconds</span></div>
        <div className="tx-list">{txs.length ? txs.slice(0, 12).map(tx => <div className="tx-row" key={tx.hash}><div><strong>{tx.label}</strong><a href={`${explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer">{short(tx.hash, 10)} <ExternalLink size={12}/></a></div><div className="tx-right"><span className={`tx-state ${tx.status.toLowerCase()}`}>{tx.status}</span><small>Leader: {tx.execution}</small>{tx.status === 'ACCEPTED' && account && <button className="text-button" onClick={() => void (async () => { try { await appeal(account, tx.hash); setMessage('Appeal submitted.'); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } })()}>Appeal</button>}</div></div>) : <div className="empty compact-empty">Submitted transactions will appear here.</div>}</div></section>
      <footer><div className="brand small-brand"><span className="brand-icon"><Fingerprint size={19}/></span><span>Proof<span>Bid</span></span></div><p>Independent semantic eligibility. Deterministic economic outcome.</p><a href="https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle" target="_blank" rel="noreferrer">How GenLayer validation works <ArrowUpRight size={14}/></a></footer>
    </main>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
