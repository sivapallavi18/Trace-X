import "dotenv/config"

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"

import cors from "cors"
import multer from "multer"

import {
  createHash,
  randomUUID,
} from "node:crypto"

import {
  createReadStream,
} from "node:fs"

import {
  mkdir,
  stat,
  unlink,
} from "node:fs/promises"

import {
  basename,
  resolve,
} from "node:path"

import {
  anchorEvidenceOnBlockchain,
  getBlockchainStatus,
  recordCustodyEventOnBlockchain,
  verifyEvidenceOnBlockchain,
} from "./blockchain"

import {
  authRouter,
  getAuthContext,
  initializeAuthentication,
  requireAuth,
  requireRoles,
} from "./auth"

import {
  database,
  initializeDatabase,
  testDatabaseConnection,
} from "./database"

/* =========================================================
   TRACE-X BACKEND
========================================================= */

const app =
  express()

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT =
  Number(
    process.env.PORT,
  ) || 5000

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173"

const MAX_EVIDENCE_FILE_SIZE =
  1024 *
  1024 *
  1024

/* =========================================================
   LOCAL OFF-CHAIN STORAGE
========================================================= */

const STORAGE_ROOT =
  resolve(
    process.cwd(),
    "storage",
  )

const EVIDENCE_STORAGE_DIRECTORY =
  resolve(
    STORAGE_ROOT,
    "evidence",
  )

async function ensureEvidenceStorage() {
  await mkdir(
    EVIDENCE_STORAGE_DIRECTORY,
    {
      recursive:
        true,
    },
  )
}

/* =========================================================
   TYPES
========================================================= */

type CaseStatus =
  | "Open"
  | "Under Review"
  | "Closed"

type CasePriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical"

type InvestigationCase = {
  id: string
  title: string
  description: string
  investigator: string
  status: CaseStatus
  priority: CasePriority
  evidenceCount: number
  createdAt: string
  updatedAt: string
}

type CaseRow = {
  id: string
  title: string
  description: string
  investigator: string
  status: CaseStatus
  priority: CasePriority
  evidence_count: number
  created_at: Date | string
  updated_at: Date | string
}

type EvidenceIntegrity =
  | "Verified"
  | "Pending"
  | "Mismatch"

type EvidenceStatus =
  | "Registered"
  | "Sealed"
  | "Archived"

type EvidenceType =
  | "Document"
  | "Disk Image"
  | "Network Capture"
  | "Log Archive"
  | "Image"
  | "Video"
  | "Other"

type BlockchainAnchorStatus =
  | "Not Anchored"
  | "Pending"
  | "Anchored"
  | "Failed"

type EvidenceVersion = {
  version: number
  hash: string
  createdAt: string
  note: string
}

type EvidenceRecord = {
  id: string
  name: string
  description: string
  caseId: string
  caseTitle: string
  type: EvidenceType
  size: number
  hash: string
  custodian: string
  integrity: EvidenceIntegrity
  status: EvidenceStatus
  createdAt: string
  updatedAt: string
  versions: EvidenceVersion[]

  blockchainStatus:
    BlockchainAnchorStatus

  blockchainVersion:
    number | null

  blockchainTransactionHash:
    string | null

  blockchainBlockNumber:
    number | null

  blockchainContractAddress:
    string | null

  blockchainEvidenceKey:
    string | null

  blockchainError:
    string | null
}

type EvidenceRow = {
  id: string
  name: string
  description: string
  case_id: string
  case_title: string
  type: EvidenceType
  size: number | string
  hash: string
  custodian: string
  integrity: EvidenceIntegrity
  status: EvidenceStatus
  created_at: Date | string
  updated_at: Date | string
  versions: EvidenceVersion[]

  blockchain_status:
    BlockchainAnchorStatus

  blockchain_version:
    number | null

  blockchain_tx_hash:
    string | null

  blockchain_block_number:
    number | string | null

  blockchain_contract_address:
    string | null

  blockchain_evidence_key:
    string | null

  blockchain_error:
    string | null
}

type StoredEvidenceRow = {
  id: string
  hash: string
  custodian: string
  case_id: string

  storage_key:
    string | null

  storage_provider:
    string

  blockchain_status:
    BlockchainAnchorStatus

  blockchain_version:
    number | null

  blockchain_tx_hash:
    string | null

  blockchain_block_number:
    number | string | null

  blockchain_contract_address:
    string | null

  blockchain_evidence_key:
    string | null

  blockchain_error:
    string | null
}

type CustodyAction =
  | "REGISTERED"
  | "TRANSFERRED"
  | "RECEIVED"
  | "VERIFIED"
  | "SEALED"
  | "ARCHIVED"

type CustodyEventRow = {
  id: number | string
  evidence_id: string
  sequence: number
  action_code: number
  action: CustodyAction
  from_custodian: string | null
  to_custodian: string | null
  reason: string
  event_digest: string
  blockchain_status: BlockchainAnchorStatus
  blockchain_sequence: number | string | null
  blockchain_tx_hash: string | null
  blockchain_block_number: number | string | null
  blockchain_contract_address: string | null
  blockchain_evidence_key: string | null
  blockchain_error: string | null
  occurred_at: Date | string
  created_at: Date | string
}

type CustodyAnchorRow =
  CustodyEventRow & {
    case_id: string
  }

type AuditLogRow = {
  id: number | string
  event_type: string
  evidence_id: string | null
  case_id: string | null
  actor: string
  details: unknown
  created_at: Date | string
}

/* =========================================================
   CONSTANTS
========================================================= */

const VALID_PRIORITIES:
  CasePriority[] = [
    "Low",
    "Medium",
    "High",
    "Critical",
  ]

const VALID_EVIDENCE_TYPES:
  EvidenceType[] = [
    "Document",
    "Disk Image",
    "Network Capture",
    "Log Archive",
    "Image",
    "Video",
    "Other",
  ]

const CUSTODY_ACTION_REGISTERED =
  1

const CUSTODY_ACTION_TRANSFERRED =
  2

/* =========================================================
   MULTER STORAGE
========================================================= */

const multerStorage =
  multer.diskStorage({
    destination: (
      _request,
      _file,
      callback,
    ) => {
      callback(
        null,
        EVIDENCE_STORAGE_DIRECTORY,
      )
    },

    filename: (
      _request,
      _file,
      callback,
    ) => {
      callback(
        null,
        randomUUID(),
      )
    },
  })

const upload =
  multer({
    storage:
      multerStorage,

    limits: {
      fileSize:
        MAX_EVIDENCE_FILE_SIZE,

      files:
        1,
    },
  })

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    origin:
      FRONTEND_ORIGIN,

    credentials:
      true,
  }),
)

app.use(
  express.json({
    limit:
      "10mb",
  }),
)

/*
 * Authentication endpoints must stay public so a user can
 * obtain a JWT before accessing protected TRACE-X routes.
 */
app.use(
  "/api/auth",
  authRouter,
)

/* =========================================================
   GENERIC HELPERS
========================================================= */

function formatDate(
  value:
    Date | string,
) {
  return new Date(
    value,
  ).toLocaleDateString(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  )
}

function formatTimestamp(
  value:
    Date | string,
) {
  return new Date(
    value,
  ).toISOString()
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return error.message
  }

  return "Unknown TRACE-X error."
}

function sendServerError(
  response: Response,
  error: unknown,
) {
  console.error(
    "TRACE-X server error:",
    error,
  )

  response
    .status(500)
    .json({
      success:
        false,

      message:
        "An internal TRACE-X server error occurred.",
    })
}

/* =========================================================
   DATA MAPPERS
========================================================= */

function mapCase(
  row: CaseRow,
): InvestigationCase {
  return {
    id:
      row.id,

    title:
      row.title,

    description:
      row.description,

    investigator:
      row.investigator,

    status:
      row.status,

    priority:
      row.priority,

    evidenceCount:
      Number(
        row.evidence_count,
      ),

    createdAt:
      formatDate(
        row.created_at,
      ),

    updatedAt:
      formatDate(
        row.updated_at,
      ),
  }
}

function mapEvidence(
  row: EvidenceRow,
): EvidenceRecord {
  return {
    id:
      row.id,

    name:
      row.name,

    description:
      row.description,

    caseId:
      row.case_id,

    caseTitle:
      row.case_title,

    type:
      row.type,

    size:
      Number(
        row.size,
      ),

    hash:
      row.hash,

    custodian:
      row.custodian,

    integrity:
      row.integrity,

    status:
      row.status,

    createdAt:
      formatDate(
        row.created_at,
      ),

    updatedAt:
      formatDate(
        row.updated_at,
      ),

    versions:
      row.versions ||
      [],

    blockchainStatus:
      row.blockchain_status,

    blockchainVersion:
      row.blockchain_version ===
      null
        ? null
        : Number(
            row.blockchain_version,
          ),

    blockchainTransactionHash:
      row.blockchain_tx_hash,

    blockchainBlockNumber:
      row.blockchain_block_number ===
      null
        ? null
        : Number(
            row.blockchain_block_number,
          ),

    blockchainContractAddress:
      row.blockchain_contract_address,

    blockchainEvidenceKey:
      row.blockchain_evidence_key,

    blockchainError:
      row.blockchain_error,
  }
}

function mapCustodyEvent(
  row: CustodyEventRow,
) {
  return {
    id:
      Number(
        row.id,
      ),

    evidenceId:
      row.evidence_id,

    sequence:
      Number(
        row.sequence,
      ),

    actionCode:
      Number(
        row.action_code,
      ),

    action:
      row.action,

    fromCustodian:
      row.from_custodian,

    toCustodian:
      row.to_custodian,

    reason:
      row.reason,

    eventDigest:
      row.event_digest,

    blockchainStatus:
      row.blockchain_status,

    blockchainSequence:
      row.blockchain_sequence ===
      null
        ? null
        : Number(
            row.blockchain_sequence,
          ),

    blockchainTransactionHash:
      row.blockchain_tx_hash,

    blockchainBlockNumber:
      row.blockchain_block_number ===
      null
        ? null
        : Number(
            row.blockchain_block_number,
          ),

    blockchainContractAddress:
      row.blockchain_contract_address,

    blockchainEvidenceKey:
      row.blockchain_evidence_key,

    blockchainError:
      row.blockchain_error,

    occurredAt:
      formatTimestamp(
        row.occurred_at,
      ),

    createdAt:
      formatTimestamp(
        row.created_at,
      ),
  }
}

function mapAuditLog(
  row: AuditLogRow,
) {
  return {
    id:
      Number(
        row.id,
      ),

    eventType:
      row.event_type,

    evidenceId:
      row.evidence_id,

    caseId:
      row.case_id,

    actor:
      row.actor,

    details:
      row.details,

    createdAt:
      formatTimestamp(
        row.created_at,
      ),
  }
}

/* =========================================================
   SHA-256 FILE HASHING
========================================================= */

function calculateFileSHA256(
  filePath: string,
): Promise<string> {
  return new Promise(
    (
      resolveHash,
      rejectHash,
    ) => {
      const hash =
        createHash(
          "sha256",
        )

      const stream =
        createReadStream(
          filePath,
        )

      stream.on(
        "data",
        (chunk) => {
          hash.update(
            chunk,
          )
        },
      )

      stream.on(
        "error",
        (error) => {
          rejectHash(
            error,
          )
        },
      )

      stream.on(
        "end",
        () => {
          resolveHash(
            hash.digest(
              "hex",
            ),
          )
        },
      )
    },
  )
}

/* =========================================================
   CUSTODY EVENT DIGEST
========================================================= */

function calculateCustodyDigest(
  input: {
    evidenceId: string
    sequence: number
    actionCode: number
    action: CustodyAction
    fromCustodian: string | null
    toCustodian: string | null
    reason: string
    occurredAt: string
  },
) {
  const canonical =
    JSON.stringify({
      schema:
        "trace-x-custody-v1",

      evidenceId:
        input.evidenceId,

      sequence:
        input.sequence,

      actionCode:
        input.actionCode,

      action:
        input.action,

      fromCustodian:
        input.fromCustodian,

      toCustodian:
        input.toCustodian,

      reason:
        input.reason,

      occurredAt:
        input.occurredAt,
    })

  return createHash(
    "sha256",
  )
    .update(
      canonical,
      "utf8",
    )
    .digest(
      "hex",
    )
}

/* =========================================================
   STORAGE PATH SAFETY
========================================================= */

function resolveStoredEvidencePath(
  storageKey: string,
) {
  if (
    basename(
      storageKey,
    ) !== storageKey
  ) {
    throw new Error(
      "Invalid evidence storage key.",
    )
  }

  const resolvedPath =
    resolve(
      EVIDENCE_STORAGE_DIRECTORY,
      storageKey,
    )

  const normalizedStorageRoot =
    EVIDENCE_STORAGE_DIRECTORY
      .toLowerCase()

  const normalizedFilePath =
    resolvedPath
      .toLowerCase()

  if (
    !normalizedFilePath.startsWith(
      `${normalizedStorageRoot}\\`,
    ) &&
    normalizedFilePath !==
      normalizedStorageRoot
  ) {
    throw new Error(
      "Evidence path escaped the storage directory.",
    )
  }

  return resolvedPath
}

async function removeFileSafely(
  filePath: string,
) {
  try {
    await unlink(
      filePath,
    )
  } catch (error) {
    const nodeError =
      error as
        NodeJS.ErrnoException

    if (
      nodeError.code !==
      "ENOENT"
    ) {
      console.error(
        "Could not remove evidence file:",
        error,
      )
    }
  }
}

/* =========================================================
   AUDIT LOG
========================================================= */

async function appendAuditLog(
  input: {
    eventType: string
    evidenceId: string | null
    caseId: string | null
    actor: string
    details: unknown
  },
) {
  await database.query(
    `
      INSERT INTO audit_logs (
        event_type,
        evidence_id,
        case_id,
        actor,
        details
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::JSONB
      )
    `,
    [
      input.eventType,
      input.evidenceId,
      input.caseId,
      input.actor,
      JSON.stringify(
        input.details,
      ),
    ],
  )
}

/* =========================================================
   DATABASE QUERY HELPERS
========================================================= */

async function fetchAllCases() {
  const result =
    await database.query<CaseRow>(`
      SELECT
        c.id,
        c.title,
        c.description,
        c.investigator,
        c.status,
        c.priority,

        COUNT(
          e.id
        )::INTEGER
          AS evidence_count,

        c.created_at,
        c.updated_at

      FROM cases c

      LEFT JOIN evidence e
        ON e.case_id = c.id

      GROUP BY
        c.id

      ORDER BY
        c.created_at DESC
    `)

  return result.rows.map(
    mapCase,
  )
}

async function fetchCaseById(
  caseId: string,
) {
  const result =
    await database.query<CaseRow>(
      `
        SELECT
          c.id,
          c.title,
          c.description,
          c.investigator,
          c.status,
          c.priority,

          COUNT(
            e.id
          )::INTEGER
            AS evidence_count,

          c.created_at,
          c.updated_at

        FROM cases c

        LEFT JOIN evidence e
          ON e.case_id = c.id

        WHERE
          c.id = $1

        GROUP BY
          c.id
      `,
      [
        caseId,
      ],
    )

  if (
    result.rows.length ===
    0
  ) {
    return null
  }

  return mapCase(
    result.rows[0],
  )
}

const EVIDENCE_SELECT = `
  SELECT
    e.id,
    e.name,
    e.description,
    e.case_id,

    c.title
      AS case_title,

    e.type,
    e.size,
    e.hash,
    e.custodian,
    e.integrity,
    e.status,
    e.created_at,
    e.updated_at,

    e.blockchain_status,
    e.blockchain_version,
    e.blockchain_tx_hash,
    e.blockchain_block_number,
    e.blockchain_contract_address,
    e.blockchain_evidence_key,
    e.blockchain_error,

    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'version',
          v.version,

          'hash',
          v.hash,

          'createdAt',
          TO_CHAR(
            v.created_at,
            'DD Mon YYYY'
          ),

          'note',
          v.note
        )

        ORDER BY
          v.version
      )
      FILTER (
        WHERE
          v.id IS NOT NULL
      ),

      '[]'::JSONB
    ) AS versions

  FROM evidence e

  INNER JOIN cases c
    ON c.id = e.case_id

  LEFT JOIN evidence_versions v
    ON v.evidence_id = e.id
`

async function fetchAllEvidence() {
  const result =
    await database.query<EvidenceRow>(`
      ${EVIDENCE_SELECT}

      GROUP BY
        e.id,
        c.title

      ORDER BY
        e.created_at DESC
    `)

  return result.rows.map(
    mapEvidence,
  )
}

async function fetchEvidenceById(
  evidenceId: string,
) {
  const result =
    await database.query<EvidenceRow>(
      `
        ${EVIDENCE_SELECT}

        WHERE
          e.id = $1

        GROUP BY
          e.id,
          c.title
      `,
      [
        evidenceId,
      ],
    )

  if (
    result.rows.length ===
    0
  ) {
    return null
  }

  return mapEvidence(
    result.rows[0],
  )
}

async function fetchCustodyEvents(
  evidenceId: string,
) {
  const result =
    await database.query<CustodyEventRow>(
      `
        SELECT
          id,
          evidence_id,
          sequence,
          action_code,
          action,
          from_custodian,
          to_custodian,
          reason,
          event_digest,
          blockchain_status,
          blockchain_sequence,
          blockchain_tx_hash,
          blockchain_block_number,
          blockchain_contract_address,
          blockchain_evidence_key,
          blockchain_error,
          occurred_at,
          created_at

        FROM custody_events

        WHERE
          evidence_id = $1

        ORDER BY
          sequence ASC
      `,
      [
        evidenceId,
      ],
    )

  return result.rows.map(
    mapCustodyEvent,
  )
}

async function fetchCustodyEventById(
  eventId: number,
) {
  const result =
    await database.query<CustodyEventRow>(
      `
        SELECT
          id,
          evidence_id,
          sequence,
          action_code,
          action,
          from_custodian,
          to_custodian,
          reason,
          event_digest,
          blockchain_status,
          blockchain_sequence,
          blockchain_tx_hash,
          blockchain_block_number,
          blockchain_contract_address,
          blockchain_evidence_key,
          blockchain_error,
          occurred_at,
          created_at

        FROM custody_events

        WHERE
          id = $1
      `,
      [
        eventId,
      ],
    )

  if (
    result.rows.length ===
    0
  ) {
    return null
  }

  return mapCustodyEvent(
    result.rows[0],
  )
}

/* =========================================================
   EVIDENCE BLOCKCHAIN PERSISTENCE
========================================================= */

async function anchorAndPersistEvidence(
  evidenceId: string,
  sha256Hash: string,
) {
  await database.query(
    `
      UPDATE evidence

      SET
        blockchain_status = 'Pending',
        blockchain_error = NULL,
        updated_at = NOW()

      WHERE
        id = $1
    `,
    [
      evidenceId,
    ],
  )

  try {
    const anchor =
      await anchorEvidenceOnBlockchain(
        evidenceId,
        sha256Hash,
      )

    await database.query(
      `
        UPDATE evidence

        SET
          blockchain_status = 'Anchored',

          blockchain_version = $1,

          blockchain_tx_hash = $2,

          blockchain_block_number = $3,

          blockchain_contract_address = $4,

          blockchain_evidence_key = $5,

          blockchain_error = NULL,

          updated_at = NOW()

        WHERE
          id = $6
      `,
      [
        anchor.version,
        anchor.transactionHash,
        anchor.blockNumber,
        anchor.contractAddress,
        anchor.evidenceKey,
        evidenceId,
      ],
    )

    return {
      anchored:
        true as const,

      anchor,
    }
  } catch (error) {
    const message =
      getErrorMessage(
        error,
      )

    console.error(
      `Blockchain anchoring failed for ${evidenceId}:`,
      error,
    )

    await database.query(
      `
        UPDATE evidence

        SET
          blockchain_status = 'Failed',

          blockchain_error = $1,

          updated_at = NOW()

        WHERE
          id = $2
      `,
      [
        message,
        evidenceId,
      ],
    )

    return {
      anchored:
        false as const,

      error:
        message,
    }
  }
}

/* =========================================================
   CUSTODY BLOCKCHAIN PERSISTENCE
========================================================= */

async function anchorAndPersistCustodyEvent(
  eventId: number,
) {
  const result =
    await database.query<CustodyAnchorRow>(
      `
        SELECT
          ce.id,
          ce.evidence_id,
          ce.sequence,
          ce.action_code,
          ce.action,
          ce.from_custodian,
          ce.to_custodian,
          ce.reason,
          ce.event_digest,
          ce.blockchain_status,
          ce.blockchain_sequence,
          ce.blockchain_tx_hash,
          ce.blockchain_block_number,
          ce.blockchain_contract_address,
          ce.blockchain_evidence_key,
          ce.blockchain_error,
          ce.occurred_at,
          ce.created_at,

          e.case_id

        FROM custody_events ce

        INNER JOIN evidence e
          ON e.id = ce.evidence_id

        WHERE
          ce.id = $1
      `,
      [
        eventId,
      ],
    )

  if (
    result.rows.length ===
    0
  ) {
    throw new Error(
      "Custody event not found.",
    )
  }

  const event =
    result.rows[0]

  if (
    event.blockchain_status ===
      "Anchored"
  ) {
    return {
      anchored:
        true as const,

      alreadyAnchored:
        true as const,
    }
  }

  await database.query(
    `
      UPDATE custody_events

      SET
        blockchain_status = 'Pending',
        blockchain_error = NULL

      WHERE
        id = $1
    `,
    [
      eventId,
    ],
  )

  try {
    const anchor =
      await recordCustodyEventOnBlockchain(
        event.evidence_id,
        Number(
          event.sequence,
        ),
        Number(
          event.action_code,
        ),
        event.event_digest,
      )

    await database.query(
      `
        UPDATE custody_events

        SET
          blockchain_status = 'Anchored',

          blockchain_sequence = $1,

          blockchain_tx_hash = $2,

          blockchain_block_number = $3,

          blockchain_contract_address = $4,

          blockchain_evidence_key = $5,

          blockchain_error = NULL

        WHERE
          id = $6
      `,
      [
        anchor.sequence,
        anchor.transactionHash,
        anchor.blockNumber,
        anchor.contractAddress,
        anchor.evidenceKey,
        eventId,
      ],
    )

    await appendAuditLog({
      eventType:
        "CUSTODY_EVENT_ANCHORED",

      evidenceId:
        event.evidence_id,

      caseId:
        event.case_id,

      actor:
        event.to_custodian ||
        event.from_custodian ||
        "TRACE-X System",

      details: {
        custodyEventId:
          eventId,

        sequence:
          Number(
            event.sequence,
          ),

        action:
          event.action,

        eventDigest:
          event.event_digest,

        transactionHash:
          anchor.transactionHash,

        blockNumber:
          anchor.blockNumber,
      },
    })

    return {
      anchored:
        true as const,

      alreadyAnchored:
        false as const,

      anchor,
    }
  } catch (error) {
    const message =
      getErrorMessage(
        error,
      )

    await database.query(
      `
        UPDATE custody_events

        SET
          blockchain_status = 'Failed',

          blockchain_error = $1

        WHERE
          id = $2
      `,
      [
        message,
        eventId,
      ],
    )

    await appendAuditLog({
      eventType:
        "CUSTODY_EVENT_ANCHOR_FAILED",

      evidenceId:
        event.evidence_id,

      caseId:
        event.case_id,

      actor:
        event.to_custodian ||
        event.from_custodian ||
        "TRACE-X System",

      details: {
        custodyEventId:
          eventId,

        sequence:
          Number(
            event.sequence,
          ),

        action:
          event.action,

        eventDigest:
          event.event_digest,

        error:
          message,
      },
    })

    return {
      anchored:
        false as const,

      error:
        message,
    }
  }
}

/* =========================================================
   INITIAL REGISTRATION CUSTODY EVENT
========================================================= */

async function ensureRegistrationCustodyEvent(
  evidenceId: string,
) {
  const evidenceResult =
    await database.query<{
      id: string
      case_id: string
      custodian: string
      created_at: Date | string
      blockchain_status: BlockchainAnchorStatus
    }>(
      `
        SELECT
          id,
          case_id,
          custodian,
          created_at,
          blockchain_status

        FROM evidence

        WHERE
          id = $1
      `,
      [
        evidenceId,
      ],
    )

  if (
    evidenceResult.rows.length ===
    0
  ) {
    throw new Error(
      "Evidence record not found.",
    )
  }

  const evidence =
    evidenceResult.rows[0]

  if (
    evidence.blockchain_status !==
    "Anchored"
  ) {
    return {
      anchored:
        false as const,

      error:
        "Evidence must be blockchain anchored before its custody chain can begin.",
    }
  }

  const existingResult =
    await database.query<CustodyEventRow>(
      `
        SELECT
          id,
          evidence_id,
          sequence,
          action_code,
          action,
          from_custodian,
          to_custodian,
          reason,
          event_digest,
          blockchain_status,
          blockchain_sequence,
          blockchain_tx_hash,
          blockchain_block_number,
          blockchain_contract_address,
          blockchain_evidence_key,
          blockchain_error,
          occurred_at,
          created_at

        FROM custody_events

        WHERE
          evidence_id = $1
          AND sequence = 1
      `,
      [
        evidenceId,
      ],
    )

  if (
    existingResult.rows.length >
    0
  ) {
    const existing =
      existingResult.rows[0]

    if (
      existing.blockchain_status ===
      "Anchored"
    ) {
      return {
        anchored:
          true as const,

        eventId:
          Number(
            existing.id,
          ),
      }
    }

    const retry =
      await anchorAndPersistCustodyEvent(
        Number(
          existing.id,
        ),
      )

    return {
      ...retry,

      eventId:
        Number(
          existing.id,
        ),
    }
  }

  const occurredAt =
    new Date(
      evidence.created_at,
    ).toISOString()

  const reason =
    "Evidence registered in TRACE-X and initial custody assigned."

  const digest =
    calculateCustodyDigest({
      evidenceId,

      sequence:
        1,

      actionCode:
        CUSTODY_ACTION_REGISTERED,

      action:
        "REGISTERED",

      fromCustodian:
        null,

      toCustodian:
        evidence.custodian,

      reason,

      occurredAt,
    })

  const client =
    await database.connect()

  let eventId:
    number | null =
      null

  try {
    await client.query(
      "BEGIN",
    )

    const insertResult =
      await client.query<{
        id: number | string
      }>(
        `
          INSERT INTO custody_events (
            evidence_id,
            sequence,
            action_code,
            action,
            from_custodian,
            to_custodian,
            reason,
            event_digest,
            blockchain_status,
            occurred_at
          )

          VALUES (
            $1,
            1,
            $2,
            'REGISTERED',
            NULL,
            $3,
            $4,
            $5,
            'Pending',
            $6
          )

          ON CONFLICT (
            evidence_id,
            sequence
          )

          DO NOTHING

          RETURNING id
        `,
        [
          evidenceId,
          CUSTODY_ACTION_REGISTERED,
          evidence.custodian,
          reason,
          digest,
          occurredAt,
        ],
      )

    if (
      insertResult.rows.length >
      0
    ) {
      eventId =
        Number(
          insertResult
            .rows[0]
            .id,
        )

      await client.query(
        `
          INSERT INTO audit_logs (
            event_type,
            evidence_id,
            case_id,
            actor,
            details
          )

          VALUES (
            'EVIDENCE_REGISTERED',
            $1,
            $2,
            $3,
            $4::JSONB
          )
        `,
        [
          evidenceId,
          evidence.case_id,
          evidence.custodian,
          JSON.stringify({
            custodySequence:
              1,

            eventDigest:
              digest,

            initialCustodian:
              evidence.custodian,
          }),
        ],
      )
    }

    await client.query(
      "COMMIT",
    )
  } catch (error) {
    await client.query(
      "ROLLBACK",
    )

    throw error
  } finally {
    client.release()
  }

  if (
    eventId ===
    null
  ) {
    const concurrentResult =
      await database.query<{
        id: number | string
      }>(
        `
          SELECT id

          FROM custody_events

          WHERE
            evidence_id = $1
            AND sequence = 1
        `,
        [
          evidenceId,
        ],
      )

    if (
      concurrentResult.rows.length ===
      0
    ) {
      throw new Error(
        "Could not create the initial custody event.",
      )
    }

    eventId =
      Number(
        concurrentResult
          .rows[0]
          .id,
      )
  }

  const anchorResult =
    await anchorAndPersistCustodyEvent(
      eventId,
    )

  return {
    ...anchorResult,

    eventId,
  }
}

/* =========================================================
   PUBLIC ROOT
========================================================= */

app.get(
  "/",
  (
    _request:
      Request,

    response:
      Response,
  ) => {
    response.json({
      application:
        "TRACE-X",

      service:
        "Backend API",

      status:
        "running",

      authentication:
        "JWT + RBAC",

      database:
        "PostgreSQL",

      evidenceStorage:
        "Local off-chain storage",

      blockchain:
        "Ethereum-compatible Hardhat network",

      custody:
        "Enabled",
    })
  },
)

/* =========================================================
   PUBLIC HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  async (
    _request:
      Request,

    response:
      Response,
  ) => {
    try {
      const databaseInfo =
        await testDatabaseConnection()

      await stat(
        EVIDENCE_STORAGE_DIRECTORY,
      )

      let blockchain:
        Record<
          string,
          unknown
        >

      try {
        const blockchainStatus =
          await getBlockchainStatus()

        blockchain = {
          connected:
            true,

          chainId:
            blockchainStatus.chainId,

          blockNumber:
            blockchainStatus.blockNumber,

          contractAddress:
            blockchainStatus.contractAddress,

          contractDeployed:
            blockchainStatus.contractDeployed,

          writerAddress:
            blockchainStatus.writerAddress,

          writerAuthorized:
            blockchainStatus.writerAuthorized,
        }
      } catch (error) {
        blockchain = {
          connected:
            false,

          error:
            getErrorMessage(
              error,
            ),
        }
      }

      response.json({
        success:
          true,

        service:
          "TRACE-X API",

        status:
          blockchain.connected
            ? "healthy"
            : "degraded",

        authentication: {
          enabled:
            true,

          type:
            "JWT",

          authorization:
            "RBAC",
        },

        database: {
          connected:
            true,

          name:
            databaseInfo.database_name,

          user:
            databaseInfo.database_user,

          serverTime:
            databaseInfo.server_time,
        },

        storage: {
          provider:
            "local",

          ready:
            true,
        },

        blockchain,

        custody: {
          enabled:
            true,

          auditLog:
            "append-only",
        },

        timestamp:
          new Date().toISOString(),

        environment:
          process.env.NODE_ENV ||
          "development",
      })
    } catch (error) {
      console.error(
        "TRACE-X health check failed:",
        error,
      )

      response
        .status(503)
        .json({
          success:
            false,

          message:
            "TRACE-X database or evidence storage is unavailable.",
        })
    }
  },
)

/* =========================================================
   PROTECT REMAINING /api ROUTES
========================================================= */

app.use(
  "/api",
  requireAuth,
)

/* =========================================================
   CASE ROUTES
========================================================= */

app.get(
  "/api/cases",
  async (
    _request:
      Request,

    response:
      Response,
  ) => {
    try {
      const cases =
        await fetchAllCases()

      response.json({
        success:
          true,

        count:
          cases.length,

        data:
          cases,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

app.get(
  "/api/cases/:id",
  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const investigationCase =
        await fetchCaseById(
          request.params.id,
        )

      if (
        !investigationCase
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Case not found.",
          })

        return
      }

      response.json({
        success:
          true,

        data:
          investigationCase,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

app.post(
  "/api/cases",

  requireRoles(
    "Investigator",
    "Supervisor",
    "Admin",
  ),

  async (
    request:
      Request,

    response:
      Response,
  ) => {
    try {
      const {
        title,
        description,
        investigator,
        priority,
      } =
        request.body

      if (
        typeof title !==
          "string" ||
        !title.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Case title is required.",
          })

        return
      }

      if (
        typeof investigator !==
          "string" ||
        !investigator.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Investigator is required.",
          })

        return
      }

      const selectedPriority:
        CasePriority =
          VALID_PRIORITIES.includes(
            priority,
          )
            ? priority
            : "Medium"

      const insertResult =
        await database.query<{
          id: string
        }>(
          `
            INSERT INTO cases (
              title,
              description,
              investigator,
              status,
              priority
            )

            VALUES (
              $1,
              $2,
              $3,
              'Open',
              $4
            )

            RETURNING id
          `,
          [
            title.trim(),

            typeof description ===
              "string" &&
            description.trim()
              ? description.trim()
              : "No investigation description has been provided.",

            investigator.trim(),

            selectedPriority,
          ],
        )

      const auth =
        getAuthContext(
          request,
        )

      await appendAuditLog({
        eventType:
          "CASE_CREATED",

        evidenceId:
          null,

        caseId:
          insertResult
            .rows[0]
            .id,

        actor:
          auth.name,

        details: {
          title:
            title.trim(),

          role:
            auth.role,
        },
      })

      const newCase =
        await fetchCaseById(
          insertResult
            .rows[0]
            .id,
        )

      response
        .status(201)
        .json({
          success:
            true,

          message:
            "Case created successfully.",

          data:
            newCase,
        })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   EVIDENCE READ ROUTES
========================================================= */

app.get(
  "/api/evidence",
  async (
    _request:
      Request,

    response:
      Response,
  ) => {
    try {
      const evidence =
        await fetchAllEvidence()

      response.json({
        success:
          true,

        count:
          evidence.length,

        data:
          evidence,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

app.get(
  "/api/evidence/:id",
  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const evidence =
        await fetchEvidenceById(
          request.params.id,
        )

      if (
        !evidence
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Evidence record not found.",
          })

        return
      }

      response.json({
        success:
          true,

        data:
          evidence,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   LEGACY METADATA-ONLY REGISTRATION
========================================================= */

app.post(
  "/api/evidence",

  requireRoles(
    "Investigator",
    "Forensic Analyst",
    "Supervisor",
    "Admin",
  ),

  async (
    request:
      Request,

    response:
      Response,
  ) => {
    const client =
      await database.connect()

    try {
      const {
        name,
        description,
        caseId,
        type,
        size,
        hash,
        custodian,
      } =
        request.body

      if (
        typeof name !==
          "string" ||
        !name.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Evidence filename is required.",
          })

        return
      }

      if (
        typeof caseId !==
          "string" ||
        !caseId.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Case ID is required.",
          })

        return
      }

      if (
        typeof hash !==
          "string" ||
        !/^[a-fA-F0-9]{64}$/.test(
          hash,
        )
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "A valid SHA-256 hash is required.",
          })

        return
      }

      if (
        typeof custodian !==
          "string" ||
        !custodian.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Custodian is required.",
          })

        return
      }

      const caseResult =
        await client.query(
          `
            SELECT id
            FROM cases
            WHERE id = $1
          `,
          [
            caseId,
          ],
        )

      if (
        caseResult.rows.length ===
        0
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Associated case was not found.",
          })

        return
      }

      const selectedType:
        EvidenceType =
          VALID_EVIDENCE_TYPES.includes(
            type,
          )
            ? type
            : "Other"

      const selectedSize =
        typeof size ===
          "number" &&
        size >= 0
          ? size
          : 0

      const normalizedHash =
        hash.toLowerCase()

      await client.query(
        "BEGIN",
      )

      const evidenceInsert =
        await client.query<{
          id: string
        }>(
          `
            INSERT INTO evidence (
              name,
              description,
              case_id,
              type,
              size,
              hash,
              custodian,
              integrity,
              status,
              storage_provider,
              blockchain_status
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              'Pending',
              'Registered',
              'metadata-only',
              'Not Anchored'
            )

            RETURNING id
          `,
          [
            name.trim(),

            typeof description ===
              "string" &&
            description.trim()
              ? description.trim()
              : "No evidence description has been provided.",

            caseId,
            selectedType,
            selectedSize,
            normalizedHash,
            custodian.trim(),
          ],
        )

      const evidenceId =
        evidenceInsert
          .rows[0]
          .id

      await client.query(
        `
          INSERT INTO evidence_versions (
            evidence_id,
            version,
            hash,
            note
          )

          VALUES (
            $1,
            1,
            $2,
            'Client-submitted metadata-only evidence record'
          )
        `,
        [
          evidenceId,
          normalizedHash,
        ],
      )

      await client.query(
        `
          UPDATE cases
          SET updated_at = NOW()
          WHERE id = $1
        `,
        [
          caseId,
        ],
      )

      await client.query(
        "COMMIT",
      )

      const newEvidence =
        await fetchEvidenceById(
          evidenceId,
        )

      response
        .status(201)
        .json({
          success:
            true,

          message:
            "Metadata-only evidence registered. It has not been independently hashed or blockchain anchored.",

          data:
            newEvidence,
        })
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        )
      } catch {
        // Ignore rollback failure.
      }

      sendServerError(
        response,
        error,
      )
    } finally {
      client.release()
    }
  },
)

/* =========================================================
   REAL FILE UPLOAD
========================================================= */

app.post(
  "/api/evidence/upload",

  requireRoles(
    "Investigator",
    "Forensic Analyst",
    "Supervisor",
    "Admin",
  ),

  upload.single(
    "file",
  ),

  async (
    request:
      Request,

    response:
      Response,
  ) => {
    const uploadedFile =
      request.file

    let preserveUploadedFile =
      false

    try {
      if (
        !uploadedFile
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "An evidence file is required.",
          })

        return
      }

      const {
        caseId,
        description,
        type,
        custodian,
      } =
        request.body

      if (
        typeof caseId !==
          "string" ||
        !caseId.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Case ID is required.",
          })

        return
      }

      if (
        typeof custodian !==
          "string" ||
        !custodian.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Custodian is required.",
          })

        return
      }

      const selectedType:
        EvidenceType =
          VALID_EVIDENCE_TYPES.includes(
            type,
          )
            ? type
            : "Other"

      const caseResult =
        await database.query(
          `
            SELECT id
            FROM cases
            WHERE id = $1
          `,
          [
            caseId,
          ],
        )

      if (
        caseResult.rows.length ===
        0
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Associated case was not found.",
          })

        return
      }

      const calculatedHash =
        await calculateFileSHA256(
          uploadedFile.path,
        )

      const client =
        await database.connect()

      let evidenceId =
        ""

      try {
        await client.query(
          "BEGIN",
        )

        const insertResult =
          await client.query<{
            id: string
          }>(
            `
              INSERT INTO evidence (
                name,
                description,
                case_id,
                type,
                size,
                hash,
                custodian,
                integrity,
                status,
                storage_key,
                storage_provider,
                mime_type,
                blockchain_status
              )

              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                'Verified',
                'Registered',
                $8,
                'local',
                $9,
                'Pending'
              )

              RETURNING id
            `,
            [
              uploadedFile.originalname,

              typeof description ===
                "string" &&
              description.trim()
                ? description.trim()
                : "No evidence description has been provided.",

              caseId,
              selectedType,
              uploadedFile.size,
              calculatedHash,
              custodian.trim(),
              uploadedFile.filename,
              uploadedFile.mimetype ||
                null,
            ],
          )

        evidenceId =
          insertResult
            .rows[0]
            .id

        await client.query(
          `
            INSERT INTO evidence_versions (
              evidence_id,
              version,
              hash,
              note
            )

            VALUES (
              $1,
              1,
              $2,
              'Original evidence acquisition - server SHA-256'
            )
          `,
          [
            evidenceId,
            calculatedHash,
          ],
        )

        await client.query(
          `
            UPDATE cases

            SET
              updated_at = NOW()

            WHERE
              id = $1
          `,
          [
            caseId,
          ],
        )

        await client.query(
          "COMMIT",
        )

        preserveUploadedFile =
          true
      } catch (error) {
        try {
          await client.query(
            "ROLLBACK",
          )
        } catch {
          // Ignore rollback failure.
        }

        throw error
      } finally {
        client.release()
      }

      const blockchainResult =
        await anchorAndPersistEvidence(
          evidenceId,
          calculatedHash,
        )

      let custodyRegistration:
        unknown =
          null

      if (
        blockchainResult.anchored
      ) {
        custodyRegistration =
          await ensureRegistrationCustodyEvent(
            evidenceId,
          )
      }

      const auth =
        getAuthContext(
          request,
        )

      await appendAuditLog({
        eventType:
          "EVIDENCE_UPLOAD_COMPLETED",

        evidenceId,

        caseId,

        actor:
          auth.name,

        details: {
          role:
            auth.role,

          fileName:
            uploadedFile.originalname,

          size:
            uploadedFile.size,

          sha256:
            calculatedHash,

          blockchainAnchored:
            blockchainResult.anchored,
        },
      })

      const newEvidence =
        await fetchEvidenceById(
          evidenceId,
        )

      response
        .status(201)
        .json({
          success:
            true,

          message:
            blockchainResult.anchored
              ? "Evidence stored, hashed and blockchain anchored successfully."
              : "Evidence stored and hashed successfully, but blockchain anchoring failed.",

          hashSource:
            "server",

          storageProvider:
            "local",

          blockchainAnchored:
            blockchainResult.anchored,

          blockchainError:
            blockchainResult.anchored
              ? null
              : blockchainResult.error,

          custodyRegistration,

          data:
            newEvidence,
        })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    } finally {
      if (
        uploadedFile &&
        !preserveUploadedFile
      ) {
        await removeFileSafely(
          uploadedFile.path,
        )
      }
    }
  },
)

/* =========================================================
   RETRY EVIDENCE BLOCKCHAIN ANCHOR
========================================================= */

app.post(
  "/api/evidence/:id/anchor",

  requireRoles(
    "Supervisor",
    "Admin",
  ),

  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const result =
        await database.query<StoredEvidenceRow>(
          `
            SELECT
              id,
              hash,
              custodian,
              case_id,
              storage_key,
              storage_provider,
              blockchain_status,
              blockchain_version,
              blockchain_tx_hash,
              blockchain_block_number,
              blockchain_contract_address,
              blockchain_evidence_key,
              blockchain_error

            FROM evidence

            WHERE id = $1
          `,
          [
            request.params.id,
          ],
        )

      if (
        result.rows.length ===
        0
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Evidence record not found.",
          })

        return
      }

      const record =
        result.rows[0]

      if (
        !record.storage_key ||
        record.storage_provider !==
          "local"
      ) {
        response
          .status(409)
          .json({
            success:
              false,

            message:
              "Metadata-only evidence cannot be automatically blockchain anchored.",
          })

        return
      }

      if (
        record.blockchain_status ===
          "Anchored" &&
        record.blockchain_version
      ) {
        await ensureRegistrationCustodyEvent(
          record.id,
        )

        const evidence =
          await fetchEvidenceById(
            record.id,
          )

        response.json({
          success:
            true,

          alreadyAnchored:
            true,

          message:
            "Evidence is already blockchain anchored.",

          data:
            evidence,
        })

        return
      }

      const blockchainResult =
        await anchorAndPersistEvidence(
          record.id,
          record.hash,
        )

      if (
        blockchainResult.anchored
      ) {
        await ensureRegistrationCustodyEvent(
          record.id,
        )
      }

      const evidence =
        await fetchEvidenceById(
          record.id,
        )

      if (
        !blockchainResult.anchored
      ) {
        response
          .status(503)
          .json({
            success:
              false,

            message:
              "Blockchain anchoring failed.",

            blockchainError:
              blockchainResult.error,

            data:
              evidence,
          })

        return
      }

      response.json({
        success:
          true,

        alreadyAnchored:
          false,

        message:
          "Evidence blockchain anchor created successfully.",

        data:
          evidence,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   FILE + BLOCKCHAIN VERIFICATION
========================================================= */

app.post(
  "/api/evidence/:id/verify",

  requireRoles(
    "Investigator",
    "Forensic Analyst",
    "Supervisor",
    "Reviewer",
    "Admin",
  ),

  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const evidenceResult =
        await database.query<StoredEvidenceRow>(
          `
            SELECT
              id,
              hash,
              custodian,
              case_id,
              storage_key,
              storage_provider,
              blockchain_status,
              blockchain_version,
              blockchain_tx_hash,
              blockchain_block_number,
              blockchain_contract_address,
              blockchain_evidence_key,
              blockchain_error

            FROM evidence

            WHERE id = $1
          `,
          [
            request.params.id,
          ],
        )

      if (
        evidenceResult.rows.length ===
        0
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Evidence record not found.",
          })

        return
      }

      const record =
        evidenceResult
          .rows[0]

      if (
        !record.storage_key ||
        record.storage_provider !==
          "local"
      ) {
        response
          .status(409)
          .json({
            success:
              false,

            message:
              "This evidence record does not have a locally stored evidence file.",
          })

        return
      }

      const storedPath =
        resolveStoredEvidencePath(
          record.storage_key,
        )

      try {
        await stat(
          storedPath,
        )
      } catch (error) {
        const nodeError =
          error as
            NodeJS.ErrnoException

        if (
          nodeError.code ===
          "ENOENT"
        ) {
          await database.query(
            `
              UPDATE evidence

              SET
                integrity = 'Mismatch',
                updated_at = NOW()

              WHERE
                id = $1
            `,
            [
              record.id,
            ],
          )

          response
            .status(410)
            .json({
              success:
                false,

              verified:
                false,

              integrity:
                "Mismatch",

              message:
                "The stored evidence file is missing.",

              blockchain: {
                status:
                  record.blockchain_status,

                checked:
                  false,

                verified:
                  null,
              },
            })

          return
        }

        throw error
      }

      const currentHash =
        await calculateFileSHA256(
          storedPath,
        )

      const fileMatchesDatabase =
        currentHash ===
        record.hash

      const integrity:
        EvidenceIntegrity =
          fileMatchesDatabase
            ? "Verified"
            : "Mismatch"

      await database.query(
        `
          UPDATE evidence

          SET
            integrity = $1,
            updated_at = NOW()

          WHERE
            id = $2
        `,
        [
          integrity,
          record.id,
        ],
      )

      let blockchainChecked =
        false

      let databaseHashVerified:
        boolean | null =
          null

      let currentFileHashVerified:
        boolean | null =
          null

      let blockchainVerificationError:
        string | null =
          null

      if (
        record.blockchain_status ===
          "Anchored" &&
        record.blockchain_version
      ) {
        try {
          const databaseVerification =
            await verifyEvidenceOnBlockchain(
              record.id,
              record.blockchain_version,
              record.hash,
            )

          const currentFileVerification =
            await verifyEvidenceOnBlockchain(
              record.id,
              record.blockchain_version,
              currentHash,
            )

          blockchainChecked =
            true

          databaseHashVerified =
            databaseVerification.verified

          currentFileHashVerified =
            currentFileVerification.verified
        } catch (error) {
          blockchainVerificationError =
            getErrorMessage(
              error,
            )
        }
      }

      const auth =
        getAuthContext(
          request,
        )

      await appendAuditLog({
        eventType:
          "EVIDENCE_VERIFIED",

        evidenceId:
          record.id,

        caseId:
          record.case_id,

        actor:
          auth.name,

        details: {
          role:
            auth.role,

          fileMatchesDatabase,

          blockchainChecked,

          databaseHashVerified,

          currentFileHashVerified,
        },
      })

      response.json({
        success:
          true,

        verified:
          fileMatchesDatabase,

        integrity,

        evidenceId:
          record.id,

        algorithm:
          "SHA-256",

        expectedHash:
          record.hash,

        currentHash,

        message:
          fileMatchesDatabase
            ? "Evidence file matches the PostgreSQL SHA-256."
            : "Evidence file does not match the PostgreSQL SHA-256.",

        fileVerification: {
          checked:
            true,

          verified:
            fileMatchesDatabase,

          databaseHash:
            record.hash,

          currentFileHash:
            currentHash,
        },

        blockchain: {
          status:
            record.blockchain_status,

          checked:
            blockchainChecked,

          version:
            record.blockchain_version,

          databaseHashVerified,

          currentFileHashVerified,

          transactionHash:
            record.blockchain_tx_hash,

          blockNumber:
            record.blockchain_block_number ===
            null
              ? null
              : Number(
                  record.blockchain_block_number,
                ),

          contractAddress:
            record.blockchain_contract_address,

          evidenceKey:
            record.blockchain_evidence_key,

          error:
            blockchainVerificationError ||
            record.blockchain_error,
        },
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   CUSTODY HISTORY
========================================================= */

app.get(
  "/api/evidence/:id/custody",

  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const evidence =
        await fetchEvidenceById(
          request.params.id,
        )

      if (
        !evidence
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Evidence record not found.",
          })

        return
      }

      const custodyEvents =
        await fetchCustodyEvents(
          request.params.id,
        )

      response.json({
        success:
          true,

        evidenceId:
          request.params.id,

        currentCustodian:
          evidence.custodian,

        count:
          custodyEvents.length,

        data:
          custodyEvents,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   CUSTODY TRANSFER
========================================================= */

app.post(
  "/api/evidence/:id/transfer",

  requireRoles(
    "Investigator",
    "Forensic Analyst",
    "Supervisor",
    "Admin",
  ),

  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const {
        toCustodian,
        reason,
      } =
        request.body

      if (
        typeof toCustodian !==
          "string" ||
        !toCustodian.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Destination custodian is required.",
          })

        return
      }

      if (
        typeof reason !==
          "string" ||
        !reason.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Transfer reason is required.",
          })

        return
      }

      const registration =
        await ensureRegistrationCustodyEvent(
          request.params.id,
        )

      if (
        !registration.anchored
      ) {
        response
          .status(503)
          .json({
            success:
              false,

            message:
              "The initial custody registration event is not blockchain anchored. Resolve that before transferring custody.",

            blockchainError:
              "error" in registration
                ? registration.error
                : null,
          })

        return
      }

      const unresolvedResult =
        await database.query<{
          count: string
        }>(
          `
            SELECT
              COUNT(*)::TEXT AS count

            FROM custody_events

            WHERE
              evidence_id = $1
              AND blockchain_status <> 'Anchored'
          `,
          [
            request.params.id,
          ],
        )

      if (
        Number(
          unresolvedResult
            .rows[0]
            .count,
        ) > 0
      ) {
        response
          .status(409)
          .json({
            success:
              false,

            message:
              "A previous custody event has not been blockchain anchored. Retry that event before creating another transfer.",
          })

        return
      }

      const client =
        await database.connect()

      let custodyEventId =
        0

      let newSequence =
        0

      let fromCustodian =
        ""

      let caseId =
        ""

      try {
        await client.query(
          "BEGIN",
        )

        const evidenceResult =
          await client.query<{
            id: string
            case_id: string
            custodian: string
          }>(
            `
              SELECT
                id,
                case_id,
                custodian

              FROM evidence

              WHERE
                id = $1

              FOR UPDATE
            `,
            [
              request.params.id,
            ],
          )

        if (
          evidenceResult.rows.length ===
          0
        ) {
          await client.query(
            "ROLLBACK",
          )

          response
            .status(404)
            .json({
              success:
                false,

              message:
                "Evidence record not found.",
            })

          return
        }

        fromCustodian =
          evidenceResult
            .rows[0]
            .custodian

        caseId =
          evidenceResult
            .rows[0]
            .case_id

        const destination =
          toCustodian.trim()

        if (
          destination.toLowerCase() ===
          fromCustodian
            .trim()
            .toLowerCase()
        ) {
          await client.query(
            "ROLLBACK",
          )

          response
            .status(400)
            .json({
              success:
                false,

              message:
                "The destination custodian must be different from the current custodian.",
            })

          return
        }

        const sequenceResult =
          await client.query<{
            next_sequence: number
          }>(
            `
              SELECT
                (
                  COALESCE(
                    MAX(sequence),
                    0
                  ) + 1
                )::INTEGER
                  AS next_sequence

              FROM custody_events

              WHERE
                evidence_id = $1
            `,
            [
              request.params.id,
            ],
          )

        newSequence =
          Number(
            sequenceResult
              .rows[0]
              .next_sequence,
          )

        const timeResult =
          await client.query<{
            occurred_at: Date
          }>(`
            SELECT
              NOW() AS occurred_at
          `)

        const occurredAt =
          timeResult
            .rows[0]
            .occurred_at
            .toISOString()

        const transferReason =
          reason.trim()

        const eventDigest =
          calculateCustodyDigest({
            evidenceId:
              request.params.id,

            sequence:
              newSequence,

            actionCode:
              CUSTODY_ACTION_TRANSFERRED,

            action:
              "TRANSFERRED",

            fromCustodian,

            toCustodian:
              destination,

            reason:
              transferReason,

            occurredAt,
          })

        const insertResult =
          await client.query<{
            id: number | string
          }>(
            `
              INSERT INTO custody_events (
                evidence_id,
                sequence,
                action_code,
                action,
                from_custodian,
                to_custodian,
                reason,
                event_digest,
                blockchain_status,
                occurred_at
              )

              VALUES (
                $1,
                $2,
                $3,
                'TRANSFERRED',
                $4,
                $5,
                $6,
                $7,
                'Pending',
                $8
              )

              RETURNING id
            `,
            [
              request.params.id,
              newSequence,
              CUSTODY_ACTION_TRANSFERRED,
              fromCustodian,
              destination,
              transferReason,
              eventDigest,
              occurredAt,
            ],
          )

        custodyEventId =
          Number(
            insertResult
              .rows[0]
              .id,
          )

        await client.query(
          `
            UPDATE evidence

            SET
              custodian = $1,
              updated_at = NOW()

            WHERE
              id = $2
          `,
          [
            destination,
            request.params.id,
          ],
        )

        const auth =
          getAuthContext(
            request,
          )

        await client.query(
          `
            INSERT INTO audit_logs (
              event_type,
              evidence_id,
              case_id,
              actor,
              details
            )

            VALUES (
              'CUSTODY_TRANSFER_RECORDED',
              $1,
              $2,
              $3,
              $4::JSONB
            )
          `,
          [
            request.params.id,
            caseId,
            auth.name,
            JSON.stringify({
              custodyEventId,

              sequence:
                newSequence,

              fromCustodian,

              toCustodian:
                destination,

              reason:
                transferReason,

              eventDigest,

              authenticatedRole:
                auth.role,
            }),
          ],
        )

        await client.query(
          "COMMIT",
        )
      } catch (error) {
        try {
          await client.query(
            "ROLLBACK",
          )
        } catch {
          // Ignore rollback failure.
        }

        throw error
      } finally {
        client.release()
      }

      const blockchainResult =
        await anchorAndPersistCustodyEvent(
          custodyEventId,
        )

      const event =
        await fetchCustodyEventById(
          custodyEventId,
        )

      const evidence =
        await fetchEvidenceById(
          request.params.id,
        )

      response
        .status(201)
        .json({
          success:
            true,

          message:
            blockchainResult.anchored
              ? "Custody transfer recorded and blockchain anchored successfully."
              : "Custody transfer was recorded, but blockchain anchoring failed. Retry the custody event before making another transfer.",

          blockchainAnchored:
            blockchainResult.anchored,

          blockchainError:
            blockchainResult.anchored
              ? null
              : blockchainResult.error,

          data: {
            custodyEvent:
              event,

            evidence,
          },
        })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   RETRY CUSTODY BLOCKCHAIN EVENT
========================================================= */

app.post(
  "/api/custody/:id/anchor",

  requireRoles(
    "Supervisor",
    "Admin",
  ),

  async (
    request:
      Request<{
        id: string
      }>,

    response:
      Response,
  ) => {
    try {
      const eventId =
        Number(
          request.params.id,
        )

      if (
        !Number.isInteger(
          eventId,
        ) ||
        eventId <= 0
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid custody event ID.",
          })

        return
      }

      const eventResult =
        await database.query<CustodyEventRow>(
          `
            SELECT
              id,
              evidence_id,
              sequence,
              action_code,
              action,
              from_custodian,
              to_custodian,
              reason,
              event_digest,
              blockchain_status,
              blockchain_sequence,
              blockchain_tx_hash,
              blockchain_block_number,
              blockchain_contract_address,
              blockchain_evidence_key,
              blockchain_error,
              occurred_at,
              created_at

            FROM custody_events

            WHERE
              id = $1
          `,
          [
            eventId,
          ],
        )

      if (
        eventResult.rows.length ===
        0
      ) {
        response
          .status(404)
          .json({
            success:
              false,

            message:
              "Custody event not found.",
          })

        return
      }

      const event =
        eventResult.rows[0]

      const earlierUnresolved =
        await database.query<{
          count: string
        }>(
          `
            SELECT
              COUNT(*)::TEXT AS count

            FROM custody_events

            WHERE
              evidence_id = $1
              AND sequence < $2
              AND blockchain_status <> 'Anchored'
          `,
          [
            event.evidence_id,
            event.sequence,
          ],
        )

      if (
        Number(
          earlierUnresolved
            .rows[0]
            .count,
        ) > 0
      ) {
        response
          .status(409)
          .json({
            success:
              false,

            message:
              "An earlier custody event must be blockchain anchored first.",
          })

        return
      }

      const blockchainResult =
        await anchorAndPersistCustodyEvent(
          eventId,
        )

      const updatedEvent =
        await fetchCustodyEventById(
          eventId,
        )

      if (
        !blockchainResult.anchored
      ) {
        response
          .status(503)
          .json({
            success:
              false,

            message:
              "Custody blockchain anchoring failed.",

            blockchainError:
              blockchainResult.error,

            data:
              updatedEvent,
          })

        return
      }

      response.json({
        success:
          true,

        message:
          "Custody event blockchain anchor is complete.",

        data:
          updatedEvent,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   AUDIT LOG
========================================================= */

app.get(
  "/api/audit",

  requireRoles(
    "Supervisor",
    "Reviewer",
    "Admin",
  ),

  async (
    request:
      Request,

    response:
      Response,
  ) => {
    try {
      const requestedLimit =
        Number(
          request.query.limit,
        )

      const limit =
        Number.isInteger(
          requestedLimit,
        )
          ? Math.min(
              Math.max(
                requestedLimit,
                1,
              ),
              500,
            )
          : 100

      const result =
        await database.query<AuditLogRow>(
          `
            SELECT
              id,
              event_type,
              evidence_id,
              case_id,
              actor,
              details,
              created_at

            FROM audit_logs

            ORDER BY
              created_at DESC,
              id DESC

            LIMIT $1
          `,
          [
            limit,
          ],
        )

      const logs =
        result.rows.map(
          mapAuditLog,
        )

      response.json({
        success:
          true,

        count:
          logs.length,

        data:
          logs,
      })
    } catch (error) {
      sendServerError(
        response,
        error,
      )
    }
  },
)

/* =========================================================
   API OVERVIEW
========================================================= */

app.get(
  "/api",

  (
    request:
      Request,

    response:
      Response,
  ) => {
    const auth =
      getAuthContext(
        request,
      )

    response.json({
      application:
        "TRACE-X",

      version:
        "0.7.0",

      authentication: {
        type:
          "JWT",

        authorization:
          "Role-Based Access Control",

        currentUser: {
          name:
            auth.name,

          email:
            auth.email,

          role:
            auth.role,
        },
      },

      database:
        "PostgreSQL",

      evidenceStorage:
        "Local off-chain storage",

      blockchain:
        "TRACE-X Evidence Registry",

      custody:
        "Blockchain-anchored chain of custody",

      endpoints: {
        login:
          "POST /api/auth/login",

        currentUser:
          "GET /api/auth/me",

        health:
          "GET /api/health",

        cases:
          "GET /api/cases",

        createCase:
          "POST /api/cases",

        evidence:
          "GET /api/evidence",

        uploadEvidence:
          "POST /api/evidence/upload",

        anchorEvidence:
          "POST /api/evidence/:id/anchor",

        verifyEvidence:
          "POST /api/evidence/:id/verify",

        custodyHistory:
          "GET /api/evidence/:id/custody",

        custodyTransfer:
          "POST /api/evidence/:id/transfer",

        retryCustodyAnchor:
          "POST /api/custody/:id/anchor",

        audit:
          "GET /api/audit",
      },
    })
  },
)

/* =========================================================
   404
========================================================= */

app.use(
  (
    request:
      Request,

    response:
      Response,
  ) => {
    response
      .status(404)
      .json({
        success:
          false,

        message:
          "TRACE-X API route not found.",

        path:
          request.originalUrl,
      })
  },
)

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error:
      unknown,

    _request:
      Request,

    response:
      Response,

    _next:
      NextFunction,
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        response
          .status(413)
          .json({
            success:
              false,

            message:
              "Evidence file exceeds the 1 GB local-development upload limit.",
          })

        return
      }

      response
        .status(400)
        .json({
          success:
            false,

          message:
            `Evidence upload failed: ${error.message}`,
        })

      return
    }

    console.error(
      "Unhandled TRACE-X error:",
      error,
    )

    response
      .status(500)
      .json({
        success:
          false,

        message:
          "An unexpected TRACE-X server error occurred.",
      })
  },
)

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    const databaseInfo =
      await testDatabaseConnection()

    console.log("")
    console.log(
      "======================================",
    )
    console.log(
      "          TRACE-X BACKEND",
    )
    console.log(
      "======================================",
    )

    console.log(
      "PostgreSQL: CONNECTED",
    )

    console.log(
      `Database: ${databaseInfo.database_name}`,
    )

    console.log(
      `Database user: ${databaseInfo.database_user}`,
    )

    console.log(
      "Creating/checking TRACE-X database tables...",
    )

    await initializeDatabase()

    console.log(
      "PostgreSQL schema: READY",
    )

    console.log(
      "Chain of custody tables: READY",
    )

    console.log(
      "Append-only audit log: READY",
    )

    console.log(
      "Creating/checking authentication users...",
    )

    await initializeAuthentication()

    console.log(
      "Authentication: READY",
    )

    console.log(
      "RBAC: ENABLED",
    )

    await ensureEvidenceStorage()

    console.log(
      "Evidence storage: READY",
    )

    try {
      const blockchainStatus =
        await getBlockchainStatus()

      console.log(
        "Blockchain: CONNECTED",
      )

      console.log(
        `Chain ID: ${blockchainStatus.chainId}`,
      )

      console.log(
        `Contract: ${blockchainStatus.contractAddress}`,
      )

      console.log(
        `Writer authorized: ${blockchainStatus.writerAuthorized}`,
      )
    } catch (error) {
      console.warn(
        "Blockchain: DEGRADED",
      )

      console.warn(
        getErrorMessage(
          error,
        ),
      )
    }

    console.log(
      "--------------------------------------",
    )

    app.listen(
      PORT,
      () => {
        console.log(
          `API running on: http://localhost:${PORT}`,
        )

        console.log(
          `Frontend origin: ${FRONTEND_ORIGIN}`,
        )

        console.log(
          "Authentication: JWT",
        )

        console.log(
          "Authorization: RBAC",
        )

        console.log(
          "Chain of custody: ENABLED",
        )

        console.log(
          "Blockchain anchoring: ENABLED",
        )

        if (
          (
            process.env.NODE_ENV ||
            "development"
          ) !==
          "production"
        ) {
          console.log(
            "--------------------------------------",
          )

          console.log(
            "Development accounts:",
          )

          console.log(
            "investigator@tracex.local",
          )

          console.log(
            "analyst@tracex.local",
          )

          console.log(
            "supervisor@tracex.local",
          )

          console.log(
            "reviewer@tracex.local",
          )

          console.log(
            "admin@tracex.local",
          )

          console.log(
            "Development password: TraceX@2026!",
          )
        }

        console.log(
          "======================================",
        )

        console.log("")
      },
    )
  } catch (error) {
    console.error("")
    console.error(
      "======================================",
    )
    console.error(
      "     TRACE-X STARTUP FAILED",
    )
    console.error(
      "======================================",
    )

    console.error("")
    console.error(
      error,
    )
    console.error("")
  }
}

void startServer()