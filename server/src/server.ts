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

/*
 * For this student/local-development version we allow files
 * up to 1 GB.
 *
 * Multer writes directly to disk, so the whole upload is not
 * held in RAM.
 */
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
  created_at:
    | Date
    | string
  updated_at:
    | Date
    | string
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
}

type EvidenceRow = {
  id: string
  name: string
  description: string
  case_id: string
  case_title: string
  type: EvidenceType
  size:
    | number
    | string
  hash: string
  custodian: string
  integrity: EvidenceIntegrity
  status: EvidenceStatus
  created_at:
    | Date
    | string
  updated_at:
    | Date
    | string
  versions:
    EvidenceVersion[]
}

type StoredEvidenceRow = {
  id: string
  hash: string
  storage_key:
    | string
    | null
  storage_provider:
    string
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
   MULTER FILE STORAGE
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
      /*
       * Never trust the filename supplied by the user's
       * computer as a filesystem path.
       *
       * TRACE-X generates an opaque storage identifier.
       */
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
   HELPERS
========================================================= */

function formatDate(
  value:
    | Date
    | string,
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
  }
}

function sendServerError(
  response:
    Response,
  error:
    unknown,
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
   SHA-256 FILE HASHING

   This reads the file as a stream instead of loading the
   complete file into RAM.
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
   SAFE STORAGE PATH RESOLUTION
========================================================= */

function resolveStoredEvidencePath(
  storageKey: string,
) {
  /*
   * A valid local storage key must only be a filename,
   * never a path such as ../../something.
   */
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

/* =========================================================
   CLEANUP
========================================================= */

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
        "Could not remove temporary evidence file:",
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

async function fetchAllEvidence() {
  const result =
    await database.query<EvidenceRow>(`
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

      response
        .status(200)
        .json({
          success:
            true,

          service:
            "TRACE-X API",

          status:
            "healthy",

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
      Request,

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
   EVIDENCE ROUTES
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
      Request,

    response:
      Response,
  ) => {
    try {
      const evidence =
        await fetchEvidenceById(
          request.params.id,
        )

      if (!evidence) {
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
   LEGACY METADATA-ONLY EVIDENCE REGISTRATION

   We keep this temporarily so your existing React frontend
   continues to work before we change it to real file upload.
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
        await client.query<{
          id: string
        }>(
          `
            SELECT
              id
            FROM cases
            WHERE
              id = $1
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
              storage_provider
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
              'metadata-only'
            )

            RETURNING
              id
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
            'Original evidence acquisition'
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
            "Evidence metadata registered successfully.",

          data:
            newEvidence,
        })
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK",
        )
      } catch {
        // Ignore rollback errors.
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

   multipart/form-data fields:

   file
   caseId
   description
   type
   custodian
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
        await database.query<{
          id: string
        }>(
          `
            SELECT
              id

            FROM cases

            WHERE
              id = $1
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

      /*
       * This hash is calculated by the backend from the
       * exact bytes that were written to off-chain storage.
       */
      const calculatedHash =
        await calculateFileSHA256(
          uploadedFile.path,
        )

      const client =
        await database.connect()

      let databaseCommitted =
        false

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
                mime_type
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
                $9
              )

              RETURNING
                id
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
              'Original evidence acquisition'
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

        databaseCommitted =
          true

        preserveUploadedFile =
          true
      } catch (error) {
        try {
          await client.query(
            "ROLLBACK",
          )
        } catch {
          // Ignore rollback errors.
        }

        throw error
      } finally {
        client.release()
      }

      if (
        !databaseCommitted
      ) {
        throw new Error(
          "Evidence transaction was not committed.",
        )
      }

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
            "Evidence file stored and registered successfully.",

          hashSource:
            "server",

          storageProvider:
            "local",

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
   VERIFY STORED EVIDENCE

   Recalculates SHA-256 from the currently stored bytes and
   compares it with the original SHA-256 recorded in the DB.
========================================================= */

app.post(
  "/api/evidence/:id/verify",

  async (
    request:
      Request,

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
              storage_provider

            FROM evidence

            WHERE
              id = $1
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
            })

          return
        }

        throw error
      }

      const currentHash =
        await calculateFileSHA256(
          storedPath,
        )

      const matches =
        currentHash ===
        record.hash

      const integrity:
        EvidenceIntegrity =
          matches
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

      response.json({
        success:
          true,

        verified:
          matches,

        integrity,

        evidenceId:
          record.id,

        algorithm:
          "SHA-256",

        expectedHash:
          record.hash,

        currentHash,

        message:
          matches
            ? "Evidence integrity verified successfully."
            : "Evidence integrity mismatch detected.",
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
        "0.4.0",

      database:
        "PostgreSQL",

      evidenceStorage:
        "Local off-chain storage",

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

        uploadEvidenceFile:
          "POST /api/evidence/upload",

        verifyStoredEvidence:
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

    console.log(
      `Storage directory: ${EVIDENCE_STORAGE_DIRECTORY}`,
    )

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
      "TRACE-X could not initialize its dependencies.",
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