import { Address } from 'viem';

type AnalyticsExposureItem = {
    collateral: {
        address: Address;
        chainId: number;
        name: string;
        symbol: string;
    };
    positions: {
        open: number;
        originals: number;
        clones: number;
    };
    mint: {
        totalMinted: number;
        totalContribution: number;
        totalLimit: number;
        totalMintedRatio: number;
        interestAverage: number;
        totalTheta: number;
        thetaPerFpsToken: number;
    };
    reserveRiskWiped: {
        fpsPrice: number;
        riskRatio: number;
    };
};
type AnalyticsProfitLossLog = {
    id: string;
    timestamp: string;
    kind: string;
    amount: bigint;
};
type AnalyticsTransactionLog = {
    id: string;
    timestamp: string;
    kind: string;
    amount: bigint;
    txHash: string;
    totalInflow: bigint;
    totalOutflow: bigint;
    totalTradeFee: bigint;
    totalSupply: bigint;
    totalEquity: bigint;
    totalSavings: bigint;
    fpsTotalSupply: bigint;
    fpsPrice: bigint;
    totalMintedV1: bigint;
    totalMintedV2: bigint;
    currentLeadRate: bigint;
    claimableInterests: bigint;
    projectedInterests: bigint;
    annualV1Interests: bigint;
    annualV2Interests: bigint;
    annualV1BorrowRate: bigint;
    annualV2BorrowRate: bigint;
    annualNetEarnings: bigint;
    realizedNetEarnings: bigint;
    earningsPerFPS: bigint;
};
type AnalyticsDailyLog = {
    id: string;
    timestamp: string;
    txHash: string;
    totalInflow: bigint;
    totalOutflow: bigint;
    totalTradeFee: bigint;
    totalSupply: bigint;
    totalEquity: bigint;
    totalSavings: bigint;
    fpsTotalSupply: bigint;
    fpsPrice: bigint;
    totalMintedV1: bigint;
    totalMintedV2: bigint;
    currentLeadRate: bigint;
    claimableInterests: bigint;
    projectedInterests: bigint;
    annualV1Interests: bigint;
    annualV2Interests: bigint;
    annualV1BorrowRate: bigint;
    annualV2BorrowRate: bigint;
    annualNetEarnings: bigint;
    realizedNetEarnings: bigint;
    earningsPerFPS: bigint;
};
type ApiAnalyticsProfitLossLog = {
    num: number;
    logs: AnalyticsProfitLossLog[];
};
type ApiAnalyticsCollateralExposure = {
    general: {
        balanceInReserve: number;
        mintersContribution: number;
        equityInReserve: number;
        fpsPrice: number;
        fpsTotalSupply: number;
        thetaFromPositions: number;
        thetaPerToken: number;
        earningsPerAnnum: number;
        earningsPerToken: number;
        priceToEarnings: number;
        priceToBookValue: number;
    };
    exposures: AnalyticsExposureItem[];
};
type ApiAnalyticsFpsEarnings = {
    investFees: number;
    redeemFees: number;
    minterProposalFees: number;
    positionProposalFees: number;
    otherProfitClaims: number;
    otherContributions: number;
    savingsInterestCosts: number;
    otherLossClaims: number;
};
type ApiTransactionLog = {
    num: number;
    logs: AnalyticsTransactionLog[];
    pageInfo: {
        startCursor: string;
        endCursor: string;
        hasNextPage: boolean;
    };
};
type ApiDailyLog = {
    num: number;
    logs: AnalyticsDailyLog[];
};

type ChallengesQueryItem = {
    version: number;
    id: ChallengesId;
    position: Address;
    number: bigint;
    challenger: Address;
    start: bigint;
    created: bigint;
    duration: bigint;
    size: bigint;
    liqPrice: bigint;
    bids: bigint;
    filledSize: bigint;
    acquiredCollateral: bigint;
    status: ChallengesStatus;
};
type BidsQueryItem = {
    version: number;
    id: BidsId;
    position: Address;
    number: bigint;
    numberBid: bigint;
    bidder: Address;
    created: bigint;
    bidType: BidsType;
    bid: bigint;
    price: bigint;
    filledSize: bigint;
    acquiredCollateral: bigint;
    challengeSize: bigint;
};
declare enum ChallengesQueryStatus {
    Active = "Active",
    Success = "Success"
}
type ChallengesStatus = ChallengesQueryStatus;
type ChallengesId = `${Address}-challenge-${bigint}`;
type ChallengesQueryItemMapping = {
    [key: ChallengesId]: ChallengesQueryItem;
};
type ChallengesChallengersMapping = {
    [key: Address]: ChallengesQueryItem[];
};
type ChallengesPositionsMapping = {
    [key: Address]: ChallengesQueryItem[];
};
type ChallengesPricesMapping = {
    [key: ChallengesId]: string;
};
declare enum BidsQueryType {
    Averted = "Averted",
    Succeeded = "Succeeded"
}
type BidsType = BidsQueryType;
type BidsId = `${Address}-challenge-${bigint}-bid-${bigint}`;
type BidsQueryItemMapping = {
    [key: BidsId]: BidsQueryItem;
};
type BidsBidderMapping = {
    [key: Address]: BidsQueryItem[];
};
type BidsChallengesMapping = {
    [key: Address]: BidsQueryItem[];
};
type BidsPositionsMapping = {
    [key: Address]: BidsQueryItem[];
};
type ApiChallengesListing = {
    num: number;
    list: ChallengesQueryItem[];
};
type ApiChallengesMapping = {
    num: number;
    challenges: ChallengesId[];
    map: ChallengesQueryItemMapping;
};
type ApiChallengesChallengers = {
    num: number;
    challengers: Address[];
    map: ChallengesChallengersMapping;
};
type ApiChallengesPositions = {
    num: number;
    positions: Address[];
    map: ChallengesPositionsMapping;
};
type ApiBidsListing = {
    num: number;
    list: BidsQueryItem[];
};
type ApiBidsMapping = {
    num: number;
    bidIds: BidsId[];
    map: BidsQueryItemMapping;
};
type ApiBidsBidders = {
    num: number;
    bidders: Address[];
    map: BidsBidderMapping;
};
type ApiBidsChallenges = {
    num: number;
    challenges: Address[];
    map: BidsChallengesMapping;
};
type ApiBidsPositions = {
    num: number;
    positions: Address[];
    map: BidsPositionsMapping;
};
type ApiChallengesPrices = {
    num: number;
    ids: ChallengesId[];
    map: ChallengesPricesMapping;
};

type MinterQuery = {
    id: Address;
    txHash: string;
    minter: Address;
    applicationPeriod: number;
    applicationFee: number;
    applyMessage: string;
    applyDate: number;
    suggestor: Address;
    denyMessage: string | null;
    denyDate: number | null;
    denyTxHash: string | null;
    vetor: Address | null;
};
type MinterQueryObjectArray = {
    [key: Address]: MinterQuery;
};
type ApiMinterListing = {
    num: number;
    list: MinterQuery[];
};
type ApiMinterMapping = {
    num: number;
    addresses: Address[];
    map: MinterQueryObjectArray;
};

type ERC20InfoObjectArray = {
    [key: Address]: ERC20Info;
};
type ERC20Info = {
    address: Address;
    name: string;
    symbol: string;
    decimals: number;
};
type PriceQueryCurrencies = {
    usd?: number;
    chf?: number;
    eur?: number;
};
type PriceQuery = ERC20Info & {
    timestamp: number;
    price: PriceQueryCurrencies;
};
type PriceQueryObjectArray = {
    [key: Address]: PriceQuery;
};
type ApiPriceListing = PriceQuery[];
type ApiPriceMapping = PriceQueryObjectArray;
type ApiPriceERC20 = ERC20Info;
type ApiPriceERC20Mapping = ERC20InfoObjectArray;

type EcosystemQueryItem = {
    id: string;
    value: string;
    amount: bigint;
};
type EcosystemMintQueryItem = {
    id: string;
    to: string;
    value: bigint;
    blockheight: bigint;
    timestamp: bigint;
};
type EcosystemBurnQueryItem = {
    id: string;
    from: string;
    value: bigint;
    blockheight: bigint;
    timestamp: bigint;
};
type MintBurnAddressMapperQueryItem = {
    id: Address;
    mint: number;
    burn: number;
};
type ServiceEcosystemFrankencoinKeyValues = {
    [key: string]: EcosystemQueryItem;
};
type ServiceEcosystemFrankencoin = {
    raw: {
        mint: string;
        burn: string;
    };
    total: {
        mint: number;
        burn: number;
        supply: number;
    };
    counter: {
        mint: number;
        burn: number;
    };
};
type ServiceEcosystemMintBurnMapping = {
    [key: Address]: {
        mint: number;
        burn: number;
    };
};
type ApiEcosystemFrankencoinKeyValues = ServiceEcosystemFrankencoinKeyValues;
type ApiEcosystemFrankencoinInfo = ServiceEcosystemFrankencoin & {
    erc20: {
        name: string;
        address: Address;
        symbol: string;
        decimals: number;
    };
    chain: {
        name: string;
        id: number;
    };
    price: {
        usd: number;
    };
    fps: {
        price: number;
        totalSupply: number;
        fpsMarketCapInChf: number;
    };
    tvl: PriceQueryCurrencies;
};
type ApiEcosystemMintBurnMapping = {
    num: number;
    addresses: Address[];
    map: {
        [key: Address]: {
            mint: number;
            burn: number;
        };
    };
};

type PositionQueryV1 = {
    version: 1;
    position: Address;
    owner: Address;
    zchf: Address;
    collateral: Address;
    price: string;
    created: number;
    isOriginal: boolean;
    isClone: boolean;
    denied: boolean;
    closed: boolean;
    original: Address;
    minimumCollateral: string;
    annualInterestPPM: number;
    reserveContribution: number;
    start: number;
    cooldown: number;
    expiration: number;
    challengePeriod: number;
    zchfName: string;
    zchfSymbol: string;
    zchfDecimals: number;
    collateralName: string;
    collateralSymbol: string;
    collateralDecimals: number;
    collateralBalance: string;
    limitForPosition: string;
    limitForClones: string;
    availableForPosition: string;
    availableForClones: string;
    minted: string;
};
type PositionQueryV2 = {
    version: 2;
    position: Address;
    owner: Address;
    zchf: Address;
    collateral: Address;
    price: string;
    created: number;
    isOriginal: boolean;
    isClone: boolean;
    denied: boolean;
    closed: boolean;
    original: Address;
    parent: Address;
    minimumCollateral: string;
    annualInterestPPM: number;
    riskPremiumPPM: number;
    reserveContribution: number;
    start: number;
    cooldown: number;
    expiration: number;
    challengePeriod: number;
    zchfName: string;
    zchfSymbol: string;
    zchfDecimals: number;
    collateralName: string;
    collateralSymbol: string;
    collateralDecimals: number;
    collateralBalance: string;
    limitForPosition: string;
    limitForClones: string;
    availableForClones: string;
    availableForMinting: string;
    availableForPosition: string;
    minted: string;
};
type PositionQuery = PositionQueryV1 | PositionQueryV2;
type MintingUpdateQueryId = `${Address}-${number}`;
type MintingUpdateQueryV1 = {
    version: 1;
    id: MintingUpdateQueryId;
    txHash: string;
    created: number;
    position: Address;
    owner: Address;
    isClone: boolean;
    collateral: Address;
    collateralName: string;
    collateralSymbol: string;
    collateralDecimals: number;
    size: string;
    price: string;
    minted: string;
    sizeAdjusted: string;
    priceAdjusted: string;
    mintedAdjusted: string;
    annualInterestPPM: number;
    reserveContribution: number;
    feeTimeframe: number;
    feePPM: number;
    feePaid: string;
};
type MintingUpdateQueryV2 = {
    version: 2;
    id: MintingUpdateQueryId;
    txHash: string;
    created: number;
    position: Address;
    owner: Address;
    isClone: boolean;
    collateral: Address;
    collateralName: string;
    collateralSymbol: string;
    collateralDecimals: number;
    size: string;
    price: string;
    minted: string;
    sizeAdjusted: string;
    priceAdjusted: string;
    mintedAdjusted: string;
    annualInterestPPM: number;
    basePremiumPPM: number;
    riskPremiumPPM: number;
    reserveContribution: number;
    feeTimeframe: number;
    feePPM: number;
    feePaid: string;
};
type MintingUpdateQuery = MintingUpdateQueryV1 | MintingUpdateQueryV2;
type PositionsQueryObjectArray = {
    [key: Address]: PositionQuery;
};
type OwnersPositionsObjectArray = {
    [key: Address]: PositionQuery[];
};
type MintingUpdateQueryObjectArray = {
    [key: Address]: MintingUpdateQuery[];
};
type ApiPositionsListing = {
    num: number;
    list: PositionQuery[];
};
type ApiPositionsMapping = {
    num: number;
    addresses: Address[];
    map: PositionsQueryObjectArray;
};
type ApiPositionsOwners = {
    num: number;
    owners: Address[];
    map: OwnersPositionsObjectArray;
};
type ApiMintingUpdateListing = {
    num: number;
    list: MintingUpdateQuery[];
};
type ApiMintingUpdateMapping = {
    num: number;
    positions: Address[];
    map: MintingUpdateQueryObjectArray;
};

type EcosystemCollateralPositionsItem = ERC20Info & {
    num: number;
    addresses: Address[];
};
type EcosystemCollateralPositionsDetailsItem = ERC20Info & {
    num: number;
    addresses: Address[];
    positions: PositionQuery[];
};
type ApiEcosystemCollateralStatsItem = ERC20Info & {
    positions: {
        total: number;
        open: number;
        requested: number;
        closed: number;
        denied: number;
        originals: number;
        clones: number;
    };
    totalBalanceRaw: string;
    totalValueLocked: PriceQueryCurrencies;
    price: PriceQueryCurrencies;
};
type ApiEcosystemCollateralListArray = {
    num: number;
    list: ERC20Info[];
};
type ApiEcosystemCollateralList = {
    num: number;
    addresses: Address[];
    map: ERC20InfoObjectArray;
};
type ApiEcosystemCollateralPositions = {
    [key: Address]: EcosystemCollateralPositionsItem;
};
type ApiEcosystemCollateralPositionsDetails = {
    [key: Address]: EcosystemCollateralPositionsDetailsItem;
};
type ApiEcosystemCollateralStats = {
    num: number;
    addresses: Address[];
    totalValueLocked: PriceQueryCurrencies;
    map: {
        [key: Address]: ApiEcosystemCollateralStatsItem;
    };
};

type ApiEcosystemFpsInfo = {
    earnings: {
        profit: number;
        loss: number;
    };
    values: {
        price: number;
        totalSupply: number;
        fpsMarketCapInChf: number;
    };
    reserve: {
        balance: number;
        equity: number;
        minter: number;
    };
};

type LeadrateRateQuery = {
    id: string;
    created: number;
    blockheight: number;
    txHash: string;
    approvedRate: number;
};
type LeadrateProposed = {
    id: string;
    created: number;
    blockheight: number;
    txHash: string;
    proposer: Address;
    nextRate: number;
    nextChange: number;
};
type LeadrateRateObjectArray = {
    [key: number]: LeadrateRateQuery;
};
type LeadrateRateProposedObjectArray = {
    [key: string]: LeadrateProposed;
};
type ApiLeadrateInfo = {
    rate: number;
    nextRate: number;
    nextchange: number;
    isProposal: boolean;
    isPending: boolean;
};
type ApiLeadrateRate = {
    created: number;
    blockheight: number;
    rate: number;
    num: number;
    list: LeadrateRateQuery[];
};
type ApiLeadrateProposed = {
    created: number;
    blockheight: number;
    nextRate: number;
    nextchange: number;
    num: number;
    list: LeadrateProposed[];
};

type SavingsBalanceQuery = {
    id: Address;
    created: number;
    blockheight: number;
    updated: number;
    interest: string;
    balance: string;
};
type SavingsIdSaved = `${Address}-${number}`;
type SavingsSavedQuery = {
    id: SavingsIdSaved;
    created: number;
    blockheight: number;
    txHash: string;
    account: Address;
    amount: string;
    rate: number;
    total: string;
    balance: string;
};
type SavingsIdInterest = `${Address}-${number}`;
type SavingsInterestQuery = {
    id: SavingsIdInterest;
    created: number;
    blockheight: number;
    txHash: string;
    account: Address;
    amount: string;
    rate: number;
    total: string;
    balance: string;
};
type SavingsIdWithdraw = `${Address}-${number}`;
type SavingsWithdrawQuery = {
    id: SavingsIdWithdraw;
    created: number;
    blockheight: number;
    txHash: string;
    account: Address;
    amount: string;
    rate: number;
    total: string;
    balance: string;
};
type ApiSavingsInfo = {
    totalSaved: number;
    totalWithdrawn: number;
    totalBalance: number;
    totalInterest: number;
    rate: number;
    ratioOfSupply: number;
};
type ApiSavingsBalance = {
    ranked: SavingsBalanceQuery[];
};
type ApiSavingsUserTable = {
    save: SavingsSavedQuery[];
    interest: SavingsInterestQuery[];
    withdraw: SavingsWithdrawQuery[];
};

declare class SubscriptionGroups {
    constructor();
    groups: string[];
}

type TelegramState = {
    minterApplied: number;
    minterVetoed: number;
    leadrateProposal: number;
    leadrateChanged: number;
    positions: number;
    positionsExpiringSoon7: number;
    positionsExpiringSoon3: number;
    positionsExpired: number;
    mintingUpdates: number;
    challenges: number;
    bids: number;
};
type TelegramGroupState = {
    apiVersion: string;
    createdAt: number;
    updatedAt: number;
    groups: string[];
    ignore: string[];
    subscription: {
        [key: string]: SubscriptionGroups;
    };
};

export { type AnalyticsDailyLog, type AnalyticsExposureItem, type AnalyticsProfitLossLog, type AnalyticsTransactionLog, type ApiAnalyticsCollateralExposure, type ApiAnalyticsFpsEarnings, type ApiAnalyticsProfitLossLog, type ApiBidsBidders, type ApiBidsChallenges, type ApiBidsListing, type ApiBidsMapping, type ApiBidsPositions, type ApiChallengesChallengers, type ApiChallengesListing, type ApiChallengesMapping, type ApiChallengesPositions, type ApiChallengesPrices, type ApiDailyLog, type ApiEcosystemCollateralList, type ApiEcosystemCollateralListArray, type ApiEcosystemCollateralPositions, type ApiEcosystemCollateralPositionsDetails, type ApiEcosystemCollateralStats, type ApiEcosystemCollateralStatsItem, type ApiEcosystemFpsInfo, type ApiEcosystemFrankencoinInfo, type ApiEcosystemFrankencoinKeyValues, type ApiEcosystemMintBurnMapping, type ApiLeadrateInfo, type ApiLeadrateProposed, type ApiLeadrateRate, type ApiMinterListing, type ApiMinterMapping, type ApiMintingUpdateListing, type ApiMintingUpdateMapping, type ApiPositionsListing, type ApiPositionsMapping, type ApiPositionsOwners, type ApiPriceERC20, type ApiPriceERC20Mapping, type ApiPriceListing, type ApiPriceMapping, type ApiSavingsBalance, type ApiSavingsInfo, type ApiSavingsUserTable, type ApiTransactionLog, type BidsBidderMapping, type BidsChallengesMapping, type BidsId, type BidsPositionsMapping, type BidsQueryItem, type BidsQueryItemMapping, BidsQueryType, type BidsType, type ChallengesChallengersMapping, type ChallengesId, type ChallengesPositionsMapping, type ChallengesPricesMapping, type ChallengesQueryItem, type ChallengesQueryItemMapping, ChallengesQueryStatus, type ChallengesStatus, type ERC20Info, type ERC20InfoObjectArray, type EcosystemBurnQueryItem, type EcosystemCollateralPositionsDetailsItem, type EcosystemCollateralPositionsItem, type EcosystemMintQueryItem, type EcosystemQueryItem, type LeadrateProposed, type LeadrateRateObjectArray, type LeadrateRateProposedObjectArray, type LeadrateRateQuery, type MintBurnAddressMapperQueryItem, type MinterQuery, type MinterQueryObjectArray, type MintingUpdateQuery, type MintingUpdateQueryId, type MintingUpdateQueryObjectArray, type MintingUpdateQueryV1, type MintingUpdateQueryV2, type OwnersPositionsObjectArray, type PositionQuery, type PositionQueryV1, type PositionQueryV2, type PositionsQueryObjectArray, type PriceQuery, type PriceQueryCurrencies, type PriceQueryObjectArray, type SavingsBalanceQuery, type SavingsIdInterest, type SavingsIdSaved, type SavingsIdWithdraw, type SavingsInterestQuery, type SavingsSavedQuery, type SavingsWithdrawQuery, type ServiceEcosystemFrankencoin, type ServiceEcosystemFrankencoinKeyValues, type ServiceEcosystemMintBurnMapping, type TelegramGroupState, type TelegramState };
