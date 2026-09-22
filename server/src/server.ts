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
  verifyEvidenceOnBlockchain,
} from "./blockchain"

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

  blockchainStatus: BlockchainAnchorStatus
  blockchainVersion: number | null
  blockchainTransactionHash: string | null
  blockchainBlockNumber: number | null
  blockchainContractAddress: string | null
  blockchainEvidenceKey: string | null
  blockchainError: string | null
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

/* =========================================================
   VALID VALUES
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
   SHA-256 STREAMING
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

/* =========================================================
   BLOCKCHAIN PERSISTENCE
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
   ROOT
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

      database:
        "PostgreSQL",

      evidenceStorage:
        "Local off-chain storage",

      blockchain:
        "Ethereum-compatible Hardhat network",
    })
  },
)

/* =========================================================
   HEALTH
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

          service:
            "TRACE-X API",

          status:
            "dependency_unavailable",

          message:
            "TRACE-X database or evidence storage is unavailable.",
        })
    }
  },
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

            RETURNING
              id
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
   REAL FILE UPLOAD + AUTOMATIC BLOCKCHAIN ANCHOR
========================================================= */

app.post(
  "/api/evidence/upload",

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

      /* ---------------------------------------------------
         AUTHORITATIVE SERVER SHA-256
      --------------------------------------------------- */

      const calculatedHash =
        await calculateFileSHA256(
          uploadedFile.path,
        )

      /* ---------------------------------------------------
         POSTGRESQL TRANSACTION
      --------------------------------------------------- */

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

      /* ---------------------------------------------------
         BLOCKCHAIN ANCHOR
      --------------------------------------------------- */

      const blockchainResult =
        await anchorAndPersistEvidence(
          evidenceId,
          calculatedHash,
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
            blockchainResult.anchored
              ? "Evidence stored, hashed and blockchain anchored successfully."
              : "Evidence stored and hashed successfully, but blockchain anchoring failed. The anchor can be retried.",

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
   RETRY BLOCKCHAIN ANCHOR
========================================================= */

app.post(
  "/api/evidence/:id/anchor",

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
              "Metadata-only evidence cannot be automatically blockchain anchored because TRACE-X does not possess the original evidence bytes.",
          })

        return
      }

      if (
        record.blockchain_status ===
          "Anchored" &&
        record.blockchain_version
      ) {
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
   DUAL INTEGRITY VERIFICATION
========================================================= */

app.post(
  "/api/evidence/:id/verify",

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
              "This evidence record does not have a locally stored evidence file. Older metadata-only records cannot be rehashed.",
          })

        return
      }

      const storedPath =
        resolveStoredEvidencePath(
          record.storage_key,
        )

      /* ---------------------------------------------------
         CHECK THAT FILE STILL EXISTS
      --------------------------------------------------- */

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

      /* ---------------------------------------------------
         CHECK 1: FILE VS DATABASE
      --------------------------------------------------- */

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

      /* ---------------------------------------------------
         CHECK 2: BLOCKCHAIN
      --------------------------------------------------- */

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
   API OVERVIEW
========================================================= */

app.get(
  "/api",
  (
    _request:
      Request,

    response:
      Response,
  ) => {
    response.json({
      application:
        "TRACE-X",

      version:
        "0.5.0",

      database:
        "PostgreSQL",

      evidenceStorage:
        "Local off-chain storage",

      blockchain:
        "TRACE-X Evidence Registry",

      endpoints: {
        health:
          "GET /api/health",

        cases:
          "GET /api/cases",

        caseById:
          "GET /api/cases/:id",

        createCase:
          "POST /api/cases",

        evidence:
          "GET /api/evidence",

        evidenceById:
          "GET /api/evidence/:id",

        metadataOnlyEvidence:
          "POST /api/evidence",

        uploadEvidence:
          "POST /api/evidence/upload",

        retryBlockchainAnchor:
          "POST /api/evidence/:id/anchor",

        verifyEvidence:
          "POST /api/evidence/:id/verify",
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
      "Preparing off-chain evidence storage...",
    )

    await ensureEvidenceStorage()

    console.log(
      "Evidence storage: READY",
    )

    /* -----------------------------------------------------
       BLOCKCHAIN STARTUP CHECK
    ----------------------------------------------------- */

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

      console.warn(
        "Evidence can still be stored. Blockchain anchoring will be marked Failed until retried.",
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
          "Database: PostgreSQL",
        )

        console.log(
          "Evidence storage: Local off-chain",
        )

        console.log(
          "Blockchain anchoring: ENABLED",
        )

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

    console.error(
      "TRACE-X could not initialize PostgreSQL or local storage.",
    )

    console.error("")
    console.error(
      error,
    )
    console.error("")

    console.error(
      "Check PostgreSQL and server/.env.",
    )

    console.error(
      "======================================",
    )
  }
}

void startServer()