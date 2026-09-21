import {
  Contract,
  JsonRpcProvider,
  getAddress,
  isAddress,
  keccak256,
  toUtf8Bytes,
  type TransactionReceipt,
} from "ethers"

/* =========================================================
   TRACE-X BLOCKCHAIN CONFIGURATION
========================================================= */

const BLOCKCHAIN_RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL ||
  "http://127.0.0.1:8545"

const EXPECTED_CHAIN_ID =
  BigInt(
    process.env.BLOCKCHAIN_CHAIN_ID ||
      "31337",
  )

const CONTRACT_ADDRESS =
  process.env.BLOCKCHAIN_CONTRACT_ADDRESS ||
  ""

/* =========================================================
   MINIMAL TRACE-X CONTRACT ABI

   We only include functions the backend currently needs.
========================================================= */

const TRACE_X_REGISTRY_ABI = [
  "function owner() view returns (address)",

  "function authorizedWriters(address writer) view returns (bool)",

  "function latestVersion(bytes32 evidenceKey) view returns (uint32)",

  "function anchorEvidenceVersion(bytes32 evidenceKey, bytes32 sha256Hash) returns (uint32 version)",

  "function verifyEvidence(bytes32 evidenceKey, uint32 version, bytes32 sha256Hash) view returns (bool)",

  "function getAnchor(bytes32 evidenceKey, uint32 version) view returns (bytes32 sha256Hash, uint64 anchoredAt, address anchoredBy)",

  "function custodyEventCount(bytes32 evidenceKey) view returns (uint64)",
] as const

/* =========================================================
   TYPES
========================================================= */

export type BlockchainStatus = {
  connected: boolean
  rpcUrl: string
  chainId: string
  blockNumber: number
  contractAddress: string
  contractDeployed: boolean
  writerAddress: string
  writerAuthorized: boolean
}

export type BlockchainAnchorResult = {
  evidenceId: string
  evidenceKey: string
  sha256Hash: string
  version: number
  transactionHash: string
  blockNumber: number
  contractAddress: string
  writerAddress: string
}

export type BlockchainVerificationResult = {
  evidenceId: string
  evidenceKey: string
  version: number
  sha256Hash: string
  verified: boolean
  contractAddress: string
}

/* =========================================================
   PROVIDER
========================================================= */

export const blockchainProvider =
  new JsonRpcProvider(
    BLOCKCHAIN_RPC_URL,
  )

/* =========================================================
   VALIDATION
========================================================= */

function getContractAddress() {
  if (
    !CONTRACT_ADDRESS ||
    !isAddress(
      CONTRACT_ADDRESS,
    )
  ) {
    throw new Error(
      "BLOCKCHAIN_CONTRACT_ADDRESS is missing or invalid in server/.env.",
    )
  }

  return getAddress(
    CONTRACT_ADDRESS,
  )
}

function normalizeSHA256(
  sha256Hash: string,
) {
  const normalized =
    sha256Hash
      .trim()
      .toLowerCase()

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "TRACE-X blockchain anchoring requires a valid 64-character SHA-256 hash.",
    )
  }

  return `0x${normalized}`
}

/* =========================================================
   EVIDENCE IDENTIFIER

   We don't put the raw TRACE-X evidence ID on-chain.

   EV-2026-0125
        │
        ▼
   keccak256(UTF-8 bytes)
        │
        ▼
   bytes32 evidenceKey
========================================================= */

export function createEvidenceKey(
  evidenceId: string,
) {
  const normalizedId =
    evidenceId.trim()

  if (
    !normalizedId
  ) {
    throw new Error(
      "Evidence ID is required.",
    )
  }

  return keccak256(
    toUtf8Bytes(
      normalizedId,
    ),
  )
}

/* =========================================================
   READ-ONLY CONTRACT
========================================================= */

function getReadContract() {
  return new Contract(
    getContractAddress(),
    TRACE_X_REGISTRY_ABI,
    blockchainProvider,
  )
}

/* =========================================================
   WRITABLE CONTRACT

   For our LOCAL Hardhat blockchain we use account 0 exposed
   by the development JSON-RPC node.

   We are deliberately NOT placing a development private key
   inside TRACE-X's source code.

   For a real deployment later, this will be replaced by a
   proper protected signer/wallet.
========================================================= */

async function getWriteContract() {
  const signer =
    await blockchainProvider
      .getSigner(0)

  const contract =
    new Contract(
      getContractAddress(),
      TRACE_X_REGISTRY_ABI,
      signer,
    )

  return {
    signer,
    contract,
  }
}

/* =========================================================
   BLOCKCHAIN STATUS
========================================================= */

export async function getBlockchainStatus():
  Promise<BlockchainStatus> {
  const network =
    await blockchainProvider
      .getNetwork()

  if (
    network.chainId !==
    EXPECTED_CHAIN_ID
  ) {
    throw new Error(
      `TRACE-X expected chain ID ${EXPECTED_CHAIN_ID.toString()} but connected to ${network.chainId.toString()}.`,
    )
  }

  const blockNumber =
    await blockchainProvider
      .getBlockNumber()

  const contractAddress =
    getContractAddress()

  const contractCode =
    await blockchainProvider
      .getCode(
        contractAddress,
      )

  const contractDeployed =
    contractCode !==
    "0x"

  if (
    !contractDeployed
  ) {
    throw new Error(
      `No smart contract code exists at ${contractAddress}. Make sure the TRACE-X contract is deployed to the currently running Hardhat node.`,
    )
  }

  const {
    signer,
  } =
    await getWriteContract()

  const writerAddress =
    await signer
      .getAddress()

  const contract =
    getReadContract()

  const writerAuthorized =
    await contract
      .authorizedWriters(
        writerAddress,
      ) as boolean

  return {
    connected:
      true,

    rpcUrl:
      BLOCKCHAIN_RPC_URL,

    chainId:
      network.chainId
        .toString(),

    blockNumber,

    contractAddress,

    contractDeployed,

    writerAddress,

    writerAuthorized,
  }
}

/* =========================================================
   ANCHOR EVIDENCE SHA-256
========================================================= */

export async function anchorEvidenceOnBlockchain(
  evidenceId: string,
  sha256Hash: string,
): Promise<BlockchainAnchorResult> {
  const evidenceKey =
    createEvidenceKey(
      evidenceId,
    )

  const blockchainHash =
    normalizeSHA256(
      sha256Hash,
    )

  const {
    signer,
    contract,
  } =
    await getWriteContract()

  const writerAddress =
    await signer
      .getAddress()

  const authorized =
    await contract
      .authorizedWriters(
        writerAddress,
      ) as boolean

  if (
    !authorized
  ) {
    throw new Error(
      `Blockchain writer ${writerAddress} is not authorized by the TRACE-X smart contract.`,
    )
  }

  const transaction =
    await contract
      .anchorEvidenceVersion(
        evidenceKey,
        blockchainHash,
      )

  const receipt:
    TransactionReceipt | null =
      await transaction.wait()

  if (
    !receipt
  ) {
    throw new Error(
      "TRACE-X blockchain transaction was submitted but no transaction receipt was returned.",
    )
  }

  const versionValue =
    await contract
      .latestVersion(
        evidenceKey,
      )

  const version =
    Number(
      versionValue,
    )

  return {
    evidenceId,

    evidenceKey,

    sha256Hash:
      blockchainHash,

    version,

    transactionHash:
      receipt.hash,

    blockNumber:
      receipt.blockNumber,

    contractAddress:
      getContractAddress(),

    writerAddress,
  }
}

/* =========================================================
   VERIFY AGAINST BLOCKCHAIN
========================================================= */

export async function verifyEvidenceOnBlockchain(
  evidenceId: string,
  version: number,
  sha256Hash: string,
): Promise<BlockchainVerificationResult> {
  if (
    !Number.isInteger(
      version,
    ) ||
    version <= 0
  ) {
    throw new Error(
      "Blockchain evidence version must be a positive integer.",
    )
  }

  const evidenceKey =
    createEvidenceKey(
      evidenceId,
    )

  const blockchainHash =
    normalizeSHA256(
      sha256Hash,
    )

  const contract =
    getReadContract()

  const verified =
    await contract
      .verifyEvidence(
        evidenceKey,
        version,
        blockchainHash,
      ) as boolean

  return {
    evidenceId,

    evidenceKey,

    version,

    sha256Hash:
      blockchainHash,

    verified,

    contractAddress:
      getContractAddress(),
  }
}