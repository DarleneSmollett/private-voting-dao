export enum ProposalStatus {
  Active = 0,
  Ended = 1,
  Cancelled = 2,
}

export enum ResultStrategy {
  PublicOnEnd = 0,
  PrivateToOwner = 1,
  PrivateToDAO = 2,
}

export type Proposal = {
  id: bigint;
  title: string;
  description: string;
  proposer: string;
  startTime: bigint;
  endTime: bigint;
  optionCount: number;
  resultStrategy: ResultStrategy;
  status: ProposalStatus;
  resultsRevealed: boolean;
};

export type VoteData = {
  option: number;
};

export type DecryptedResults = {
  totalVoters: bigint;
  optionVotes: bigint[];
};

