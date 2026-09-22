import {
  Pool,
} from "pg"

/* =========================================================
   TRACE-X POSTGRESQL CONNECTION
========================================================= */

const DATABASE_PORT =
  Number(
    process.env.DATABASE_PORT,
  ) || 5432

export const database =
  new Pool({
    host:
      process.env.DATABASE_HOST ||
      "localhost",

    port:
      DATABASE_PORT,

    database:
      process.env.DATABASE_NAME ||
      "tracex_db",

    user:
      process.env.DATABASE_USER ||
      "postgres",

    password:
      process.env.DATABASE_PASSWORD,

    max:
      10,

    idleTimeoutMillis:
      30000,

    connectionTimeoutMillis:
      5000,
  })

/* =========================================================
   POOL ERROR
========================================================= */

database.on(
  "error",
  (error) => {
    console.error(
      "Unexpected PostgreSQL pool error:",
      error,
    )
  },
)

/* =========================================================
   TEST DATABASE CONNECTION
========================================================= */

export async function testDatabaseConnection() {
  const client =
    await database.connect()

  try {
    const result =
      await client.query<{
        database_name: string
        database_user: string
        server_time: Date
      }>(`
        SELECT
          current_database() AS database_name,
          current_user AS database_user,
          NOW() AS server_time
      `)

    return result.rows[0]
  } finally {
    client.release()
  }
}

/* =========================================================
   INITIALIZE TRACE-X DATABASE
========================================================= */

export async function initializeDatabase() {
  const client =
    await database.connect()

  try {
    await client.query(
      "BEGIN",
    )

    /* -----------------------------------------------------
       ID SEQUENCES
    ----------------------------------------------------- */

    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS case_id_seq
      START WITH 19
      INCREMENT BY 1
    `)

    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS evidence_id_seq
      START WITH 125
      INCREMENT BY 1
    `)

    /* -----------------------------------------------------
       CASES
    ----------------------------------------------------- */

    await client.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY
          DEFAULT (
            'CASE-' ||
            TO_CHAR(CURRENT_DATE, 'YYYY') ||
            '-' ||
            LPAD(
              nextval('case_id_seq')::TEXT,
              4,
              '0'
            )
          ),

        title TEXT NOT NULL,

        description TEXT NOT NULL,

        investigator TEXT NOT NULL,

        status TEXT NOT NULL
          DEFAULT 'Open'
          CHECK (
            status IN (
              'Open',
              'Under Review',
              'Closed'
            )
          ),

        priority TEXT NOT NULL
          DEFAULT 'Medium'
          CHECK (
            priority IN (
              'Low',
              'Medium',
              'High',
              'Critical'
            )
          ),

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW(),

        updated_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW()
      )
    `)

    /* -----------------------------------------------------
       EVIDENCE
    ----------------------------------------------------- */

    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY
          DEFAULT (
            'EV-' ||
            TO_CHAR(CURRENT_DATE, 'YYYY') ||
            '-' ||
            LPAD(
              nextval('evidence_id_seq')::TEXT,
              4,
              '0'
            )
          ),

        name TEXT NOT NULL,

        description TEXT NOT NULL,

        case_id TEXT NOT NULL
          REFERENCES cases(id)
          ON DELETE RESTRICT,

        type TEXT NOT NULL
          CHECK (
            type IN (
              'Document',
              'Disk Image',
              'Network Capture',
              'Log Archive',
              'Image',
              'Video',
              'Other'
            )
          ),

        size BIGINT NOT NULL
          DEFAULT 0
          CHECK (
            size >= 0
          ),

        hash VARCHAR(64) NOT NULL
          CHECK (
            hash ~ '^[0-9a-f]{64}$'
          ),

        custodian TEXT NOT NULL,

        integrity TEXT NOT NULL
          DEFAULT 'Verified'
          CHECK (
            integrity IN (
              'Verified',
              'Pending',
              'Mismatch'
            )
          ),

        status TEXT NOT NULL
          DEFAULT 'Registered'
          CHECK (
            status IN (
              'Registered',
              'Sealed',
              'Archived'
            )
          ),

        storage_key TEXT,

        storage_provider TEXT NOT NULL
          DEFAULT 'metadata-only',

        mime_type TEXT,

        blockchain_status TEXT NOT NULL
          DEFAULT 'Not Anchored',

        blockchain_version INTEGER,

        blockchain_tx_hash TEXT,

        blockchain_block_number BIGINT,

        blockchain_contract_address TEXT,

        blockchain_evidence_key TEXT,

        blockchain_error TEXT,

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW(),

        updated_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW()
      )
    `)

    /* -----------------------------------------------------
       MIGRATE OLDER TRACE-X DATABASES
    ----------------------------------------------------- */

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS storage_key TEXT
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS storage_provider TEXT
      NOT NULL
      DEFAULT 'metadata-only'
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS mime_type TEXT
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_status TEXT
      NOT NULL
      DEFAULT 'Not Anchored'
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_version INTEGER
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_block_number BIGINT
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_contract_address TEXT
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_evidence_key TEXT
    `)

    await client.query(`
      ALTER TABLE evidence
      ADD COLUMN IF NOT EXISTS blockchain_error TEXT
    `)

    /* -----------------------------------------------------
       BLOCKCHAIN CONSTRAINTS
    ----------------------------------------------------- */

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'evidence_blockchain_status_check'
        ) THEN
          ALTER TABLE evidence
          ADD CONSTRAINT evidence_blockchain_status_check
          CHECK (
            blockchain_status IN (
              'Not Anchored',
              'Pending',
              'Anchored',
              'Failed'
            )
          );
        END IF;
      END
      $$;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'evidence_blockchain_version_check'
        ) THEN
          ALTER TABLE evidence
          ADD CONSTRAINT evidence_blockchain_version_check
          CHECK (
            blockchain_version IS NULL
            OR blockchain_version > 0
          );
        END IF;
      END
      $$;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'evidence_blockchain_block_number_check'
        ) THEN
          ALTER TABLE evidence
          ADD CONSTRAINT evidence_blockchain_block_number_check
          CHECK (
            blockchain_block_number IS NULL
            OR blockchain_block_number >= 0
          );
        END IF;
      END
      $$;
    `)

    /* -----------------------------------------------------
       EVIDENCE VERSION HISTORY
    ----------------------------------------------------- */

    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence_versions (
        id BIGSERIAL PRIMARY KEY,

        evidence_id TEXT NOT NULL
          REFERENCES evidence(id)
          ON DELETE CASCADE,

        version INTEGER NOT NULL
          CHECK (
            version > 0
          ),

        hash VARCHAR(64) NOT NULL
          CHECK (
            hash ~ '^[0-9a-f]{64}$'
          ),

        created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW(),

        note TEXT NOT NULL,

        UNIQUE (
          evidence_id,
          version
        )
      )
    `)

    /* -----------------------------------------------------
       INDEXES
    ----------------------------------------------------- */

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_case_id
      ON evidence(case_id)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_hash
      ON evidence(hash)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_versions_evidence_id
      ON evidence_versions(evidence_id)
    `)

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_storage_key
      ON evidence(storage_key)
      WHERE storage_key IS NOT NULL
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_blockchain_status
      ON evidence(blockchain_status)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_blockchain_tx_hash
      ON evidence(blockchain_tx_hash)
      WHERE blockchain_tx_hash IS NOT NULL
    `)

    /* -----------------------------------------------------
       INITIAL SEED DATA

       Only inserted for a completely empty database.
    ----------------------------------------------------- */

    const caseCountResult =
      await client.query<{
        count: string
      }>(`
        SELECT
          COUNT(*)::TEXT AS count
        FROM cases
      `)

    const evidenceCountResult =
      await client.query<{
        count: string
      }>(`
        SELECT
          COUNT(*)::TEXT AS count
        FROM evidence
      `)

    const caseCount =
      Number(
        caseCountResult
          .rows[0]
          .count,
      )

    const evidenceCount =
      Number(
        evidenceCountResult
          .rows[0]
          .count,
      )

    if (
      caseCount === 0 &&
      evidenceCount === 0
    ) {
      await client.query(`
        INSERT INTO cases (
          id,
          title,
          description,
          investigator,
          status,
          priority,
          created_at,
          updated_at
        )
        VALUES
        (
          'CASE-2026-0018',
          'Unauthorized Access Investigation',
          'Investigation into suspicious remote access activity detected on an internal workstation.',
          'Investigator A',
          'Open',
          'Critical',
          NOW() - INTERVAL '2 days',
          NOW() - INTERVAL '12 minutes'
        ),
        (
          'CASE-2026-0017',
          'Server Compromise',
          'Forensic analysis of a production server following indicators of unauthorized modification.',
          'Investigator B',
          'Under Review',
          'High',
          NOW() - INTERVAL '3 days',
          NOW() - INTERVAL '48 minutes'
        ),
        (
          'CASE-2026-0016',
          'Endpoint Forensic Analysis',
          'Investigation of a potentially compromised employee endpoint and associated user activity.',
          'Investigator C',
          'Open',
          'Medium',
          NOW() - INTERVAL '5 days',
          NOW() - INTERVAL '2 hours'
        ),
        (
          'CASE-2026-0015',
          'Suspicious Network Traffic',
          'Review of unusual outbound network communications identified during security monitoring.',
          'Investigator A',
          'Closed',
          'Low',
          NOW() - INTERVAL '10 days',
          NOW() - INTERVAL '3 days'
        )
      `)

      await client.query(`
        INSERT INTO evidence (
          id,
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
          blockchain_status,
          created_at,
          updated_at
        )
        VALUES
        (
          'EV-2026-0124',
          'network_capture.pcap',
          'Network packet capture acquired during investigation of suspicious remote access traffic.',
          'CASE-2026-0018',
          'Network Capture',
          52428800,
          '91b8f6a4d38e9f72c4a10e8f09dd6b8342ae6ef10b47a9ef67b6fd308a3f2521',
          'Investigator A',
          'Verified',
          'Sealed',
          'metadata-only',
          'Not Anchored',
          NOW() - INTERVAL '2 days',
          NOW() - INTERVAL '20 minutes'
        ),
        (
          'EV-2026-0123',
          'system_logs.zip',
          'Compressed operating-system and application logs collected from the affected server.',
          'CASE-2026-0017',
          'Log Archive',
          17825792,
          '51be229f0da3d17d7cc581d89cc4fcf953e3e35fb331b1a725967a987e2c89aa',
          'Investigator B',
          'Verified',
          'Registered',
          'metadata-only',
          'Not Anchored',
          NOW() - INTERVAL '3 days',
          NOW() - INTERVAL '1 hour'
        ),
        (
          'EV-2026-0122',
          'disk_image.dd',
          'Forensic disk image acquired from the endpoint currently under examination.',
          'CASE-2026-0016',
          'Disk Image',
          536870912,
          'cb99530a5b86832f2f55e9887309f0dbff23043c54bd888f4134c72e77766880',
          'Investigator C',
          'Pending',
          'Registered',
          'metadata-only',
          'Not Anchored',
          NOW() - INTERVAL '5 days',
          NOW() - INTERVAL '2 hours'
        )
      `)

      await client.query(`
        INSERT INTO evidence_versions (
          evidence_id,
          version,
          hash,
          created_at,
          note
        )
        SELECT
          id,
          1,
          hash,
          created_at,
          'Original evidence acquisition'
        FROM evidence
        WHERE id IN (
          'EV-2026-0124',
          'EV-2026-0123',
          'EV-2026-0122'
        )
      `)
    }

    /* -----------------------------------------------------
       ALIGN SEQUENCES
    ----------------------------------------------------- */

    await client.query(`
      SELECT
        setval(
          'case_id_seq',
          GREATEST(
            COALESCE(
              MAX(
                substring(
                  id
                  FROM '([0-9]+)$'
                )::BIGINT
              ),
              18
            ),
            18
          ),
          TRUE
        )
      FROM cases
    `)

    await client.query(`
      SELECT
        setval(
          'evidence_id_seq',
          GREATEST(
            COALESCE(
              MAX(
                substring(
                  id
                  FROM '([0-9]+)$'
                )::BIGINT
              ),
              124
            ),
            124
          ),
          TRUE
        )
      FROM evidence
    `)

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
}