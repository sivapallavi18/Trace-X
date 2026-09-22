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
========================================================= */

const TRACE_X_REGISTRY_ABI = [
  "function owner() view returns (address)",

  "function authorizedWriters(address writer) view returns (bool)",

  "function latestVersion(bytes32 evidenceKey) view returns (uint32)",

  "function anchorEvidenceVersion(bytes32 evidenceKey, bytes32 sha256Hash) returns (uint32 version)",

  "function verifyEvidence(bytes32 evidenceKey, uint32 version, bytes32 sha256Hash) view returns (bool)",

  "function getAnchor(bytes32 evidenceKey, uint32 version) view returns (bytes32 sha256Hash, uint64 anchoredAt, address anchoredBy)",

  "function custodyEventCount(bytes32 evidenceKey) view returns (uint64)",

  "function recordCustodyEvent(bytes32 evidenceKey, uint8 actionCode, bytes32 eventDigest) returns (uint64 sequence)",
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

export type BlockchainCustodyResult = {
  evidenceId: string
  evidenceKey: string
  sequence: number
  actionCode: number
  eventDigest: string
  transactionHash: string
  blockNumber: number
  contractAddress: string
  writerAddress: string
}

type BlockchainRuntime = {
  chainId: bigint
  blockNumber: number
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

function normalizeBytes32Hex(
  value: string,
  label: string,
) {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /^0x/,
        "",
      )

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `${label} must be a valid 32-byte hexadecimal value.`,
    )
  }

  return `0x${normalized}`
}

function normalizeSHA256(
  sha256Hash: string,
) {
  return normalizeBytes32Hex(
    sha256Hash,
    "SHA-256 hash",
  )
}

/* =========================================================
   EVIDENCE KEY
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
   BLOCKCHAIN RUNTIME CHECK

   Every read/write now validates:
   1. RPC connection
   2. Expected chain ID
   3. Current contract address
   4. Contract bytecode actually exists

   This prevents opaque ethers BAD_DATA errors after a
   local Hardhat node is restarted.
========================================================= */

async function assertBlockchainReady():
  Promise<BlockchainRuntime> {
  let network

  try {
    network =
      await blockchainProvider
        .getNetwork()
  } catch (error) {
    throw new Error(
      `TRACE-X cannot connect to the blockchain RPC at ${BLOCKCHAIN_RPC_URL}. Make sure the Hardhat node is running. Original error: ${
        error instanceof Error
          ? error.message
          : "unknown RPC error"
      }`,
    )
  }

  if (
    network.chainId !==
    EXPECTED_CHAIN_ID
  ) {
    throw new Error(
      `TRACE-X expected blockchain chain ID ${EXPECTED_CHAIN_ID.toString()}, but the connected network reports ${network.chainId.toString()}.`,
    )
  }

  const contractAddress =
    getContractAddress()

  let contractCode:
    string

  try {
    contractCode =
      await blockchainProvider
        .getCode(
          contractAddress,
        )
  } catch (error) {
    throw new Error(
      `TRACE-X could not inspect the smart contract at ${contractAddress}. Original error: ${
        error instanceof Error
          ? error.message
          : "unknown blockchain error"
      }`,
    )
  }

  if (
    contractCode ===
    "0x"
  ) {
    throw new Error(
      `TRACE-X smart contract is not deployed at ${contractAddress} on the currently running blockchain. The local Hardhat node may have been restarted, which clears its temporary blockchain state. Redeploy the TRACE-X contract and update BLOCKCHAIN_CONTRACT_ADDRESS if necessary.`,
    )
  }

  const blockNumber =
    await blockchainProvider
      .getBlockNumber()

  return {
    chainId:
      network.chainId,

    blockNumber,

    contractAddress,
  }
}

/* =========================================================
   CONTRACT HELPERS
========================================================= */

async function getReadContract() {
  const runtime =
    await assertBlockchainReady()

  const contract =
    new Contract(
      runtime.contractAddress,
      TRACE_X_REGISTRY_ABI,
      blockchainProvider,
    )

  return {
    contract,
    runtime,
  }
}

async function getWriteContract() {
  const runtime =
    await assertBlockchainReady()

  const signer =
    await blockchainProvider
      .getSigner(0)

  const contract =
    new Contract(
      runtime.contractAddress,
      TRACE_X_REGISTRY_ABI,
      signer,
    )

  return {
    signer,
    contract,
    runtime,
  }
}

/* =========================================================
   BLOCKCHAIN STATUS
========================================================= */

export async function getBlockchainStatus():
  Promise<BlockchainStatus> {
  const runtime =
    await assertBlockchainReady()

  const signer =
    await blockchainProvider
      .getSigner(0)

  const writerAddress =
    await signer
      .getAddress()

  const contract =
    new Contract(
      runtime.contractAddress,
      TRACE_X_REGISTRY_ABI,
      blockchainProvider,
    )

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
      runtime.chainId
        .toString(),

    blockNumber:
      runtime.blockNumber,

    contractAddress:
      runtime.contractAddress,

    contractDeployed:
      true,

    writerAddress,

    writerAuthorized,
  }
}

/* =========================================================
   EVIDENCE SHA-256 ANCHOR
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
    runtime,
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
      runtime.contractAddress,

    writerAddress,
  }
}

/* =========================================================
   EVIDENCE BLOCKCHAIN VERIFICATION

   Important:
   PostgreSQL may still contain an old blockchain version
   after a local Hardhat blockchain has been reset.

   Before comparing hashes, TRACE-X checks that the expected
   version actually exists on the current smart contract.
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

  const {
    contract,
    runtime,
  } =
    await getReadContract()

  const latestVersionValue =
    await contract
      .latestVersion(
        evidenceKey,
      )

  const latestVersion =
    Number(
      latestVersionValue,
    )

  if (
    latestVersion <
    version
  ) {
    throw new Error(
      `Blockchain anchor state is stale or unavailable for ${evidenceId}. PostgreSQL expects blockchain version ${version}, but the currently running TRACE-X contract reports latest version ${latestVersion}. This commonly occurs after restarting the local Hardhat node because its development blockchain state is temporary.`,
    )
  }

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
      runtime.contractAddress,
  }
}

/* =========================================================
   CURRENT CUSTODY EVENT COUNT
========================================================= */

export async function getBlockchainCustodyCount(
  evidenceId: string,
) {
  const evidenceKey =
    createEvidenceKey(
      evidenceId,
    )

  const {
    contract,
  } =
    await getReadContract()

  const count =
    await contract
      .custodyEventCount(
        evidenceKey,
      )

  return Number(
    count,
  )
}

/* =========================================================
   CUSTODY EVENT ANCHOR
========================================================= */

export async function recordCustodyEventOnBlockchain(
  evidenceId: string,
  expectedSequence: number,
  actionCode: number,
  eventDigest: string,
): Promise<BlockchainCustodyResult> {
  if (
    !Number.isInteger(
      expectedSequence,
    ) ||
    expectedSequence <= 0
  ) {
    throw new Error(
      "Custody sequence must be a positive integer.",
    )
  }

  if (
    !Number.isInteger(
      actionCode,
    ) ||
    actionCode < 1 ||
    actionCode > 6
  ) {
    throw new Error(
      "Custody action code must be between 1 and 6.",
    )
  }

  const evidenceKey =
    createEvidenceKey(
      evidenceId,
    )

  const blockchainDigest =
    normalizeBytes32Hex(
      eventDigest,
      "Custody event digest",
    )

  const {
    signer,
    contract,
    runtime,
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

  const evidenceVersion =
    Number(
      await contract
        .latestVersion(
          evidenceKey,
        ),
    )

  if (
    evidenceVersion <= 0
  ) {
    throw new Error(
      `No blockchain evidence anchor exists for ${evidenceId} on the currently running TRACE-X contract. PostgreSQL may contain an anchor from an earlier Hardhat session. Local Hardhat blockchain state is temporary and is erased when the node is restarted.`,
    )
  }

  /*
   * Protect custody ordering.
   *
   * If PostgreSQL says this should be custody event #3,
   * the blockchain must currently contain exactly two
   * custody events.
   */
  const currentBlockchainCount =
    Number(
      await contract
        .custodyEventCount(
          evidenceKey,
        ),
    )

  const expectedPreviousCount =
    expectedSequence - 1

  if (
    currentBlockchainCount !==
    expectedPreviousCount
  ) {
    throw new Error(
      `Custody blockchain state is inconsistent for ${evidenceId}. TRACE-X expected ${expectedPreviousCount} existing custody event(s), but the current contract reports ${currentBlockchainCount}. This may indicate that the local blockchain was restarted or that PostgreSQL and blockchain state require reconciliation.`,
    )
  }

  const transaction =
    await contract
      .recordCustodyEvent(
        evidenceKey,
        actionCode,
        blockchainDigest,
      )

  const receipt:
    TransactionReceipt | null =
      await transaction.wait()

  if (
    !receipt
  ) {
    throw new Error(
      "Custody blockchain transaction was submitted but no transaction receipt was returned.",
    )
  }

  const blockchainSequence =
    Number(
      await contract
        .custodyEventCount(
          evidenceKey,
        ),
    )

  if (
    blockchainSequence !==
    expectedSequence
  ) {
    throw new Error(
      `Custody blockchain sequence ${blockchainSequence} did not match TRACE-X sequence ${expectedSequence}.`,
    )
  }

  return {
    evidenceId,

    evidenceKey,

    sequence:
      blockchainSequence,

    actionCode,

    eventDigest:
      blockchainDigest,

    transactionHash:
      receipt.hash,

    blockNumber:
      receipt.blockNumber,

    contractAddress:
      runtime.contractAddress,

    writerAddress,
  }
}