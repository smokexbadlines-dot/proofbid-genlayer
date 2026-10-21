export type Bid = {
  id: number;
  owner: string;
  commitment: string;
  status: string;
  price_wei: string;
  repo: string;
  sha: string;
  path: string;
  body_sha: string;
  quote: string;
  attempts: number;
};

export type Auction = {
  sponsor: string;
  task: string;
  criterion: string;
  budget_wei: string;
  funded_wei: string;
  commit_deadline: number;
  reveal_deadline: number;
  resolution_deadline: number;
  max_bids: number;
  sealed: boolean;
  settled: boolean;
  winner: number;
  winning_price_wei: string;
  bids: Bid[];
};

export type TrackedTx = {
  hash: `0x${string}`;
  label: string;
  status: string;
  execution: string;
  submittedAt: number;
  deploy?: boolean;
};

export type RevealSecret = {
  contract: string;
  owner: string;
  price: string;
  repo: string;
  sha: string;
  path: string;
  bodySha: string;
  quote: string;
  nonce: string;
  commitment: string;
};
