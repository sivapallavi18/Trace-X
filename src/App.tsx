import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react"

import {
  AnimatePresence,
  motion,
} from "motion/react"

import {
  Activity,
  ArrowLeftRight,
  ArrowRight,
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  FileCheck2,
  FileText,
  Fingerprint,
  FolderKanban,
  HardDrive,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  UserRound,
  WifiOff,
  X,
} from "lucide-react"

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL =
  "http://localhost:5000"

const BROWSER_HASH_LIMIT =
  256 * 1024 * 1024

/* =========================================================
   GENERIC API TYPES
========================================================= */

type ApiListResponse<T> = {
  success: boolean
  count: number
  data: T[]
}

type ApiItemResponse<T> = {
  success: boolean
  message?: string
  data: T
}

type ApiErrorResponse = {
  success?: boolean
  message?: string
  blockchainError?: string
}

/* =========================================================
   BLOCKCHAIN TYPES
========================================================= */

type BlockchainAnchorStatus =
  | "Not Anchored"
  | "Pending"
  | "Anchored"
  | "Failed"

type BlockchainVerification = {
  status:
    BlockchainAnchorStatus

  checked:
    boolean

  version:
    number | null

  databaseHashVerified:
    boolean | null

  currentFileHashVerified:
    boolean | null

  transactionHash:
    string | null

  blockNumber:
    number | null

  contractAddress:
    string | null

  evidenceKey:
    string | null

  error:
    string | null
}

/* =========================================================
   CASE TYPES
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

type CreateCasePayload = {
  title: string
  description: string
  investigator: string
  priority: CasePriority
}

/* =========================================================
   EVIDENCE TYPES
========================================================= */

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

type UploadEvidencePayload = {
  file: File
  caseId: string
  description: string
  type: EvidenceType
  custodian: string
}

/* =========================================================
   VERIFICATION TYPES
========================================================= */

type VerifyEvidenceResponse = {
  success: boolean
  verified: boolean
  integrity: EvidenceIntegrity
  evidenceId: string
  algorithm: string
  expectedHash: string
  currentHash: string
  message: string

  fileVerification: {
    checked: boolean
    verified: boolean
    databaseHash: string
    currentFileHash: string
  }

  blockchain:
    BlockchainVerification
}

/* =========================================================
   CUSTODY TYPES
========================================================= */

type CustodyAction =
  | "REGISTERED"
  | "TRANSFERRED"
  | "RECEIVED"
  | "VERIFIED"
  | "SEALED"
  | "ARCHIVED"

type CustodyEvent = {
  id: number
  evidenceId: string
  sequence: number
  actionCode: number
  action: CustodyAction
  fromCustodian: string | null
  toCustodian: string | null
  reason: string
  eventDigest: string

  blockchainStatus:
    BlockchainAnchorStatus

  blockchainSequence:
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

  occurredAt: string
  createdAt: string
}

type CustodyHistoryResponse = {
  success: boolean
  evidenceId: string
  currentCustodian: string
  count: number
  data: CustodyEvent[]
}

type TransferCustodyResponse = {
  success: boolean
  message: string

  blockchainAnchored:
    boolean

  blockchainError:
    string | null

  data: {
    custodyEvent:
      CustodyEvent | null

    evidence:
      EvidenceRecord | null
  }
}

/* =========================================================
   AUDIT TYPES
========================================================= */

type AuditLog = {
  id: number
  eventType: string
  evidenceId: string | null
  caseId: string | null
  actor: string

  details:
    Record<
      string,
      unknown
    >

  createdAt: string
}

/* =========================================================
   NAVIGATION
========================================================= */

const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "cases",
    label: "Cases",
    icon: FolderKanban,
  },
  {
    id: "evidence",
    label: "Evidence",
    icon: FileText,
  },
  {
    id: "transfers",
    label: "Transfers",
    icon: ArrowLeftRight,
  },
  {
    id: "verify",
    label: "Verify",
    icon: ScanSearch,
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: Activity,
  },
] as const

type Page =
  (typeof navigation)[number]["id"]

const pageInfo: Record<
  Page,
  {
    title: string
    description: string
  }
> = {
  dashboard: {
    title: "Dashboard",
    description:
      "Overview of evidence integrity, blockchain anchoring and investigations.",
  },

  cases: {
    title: "Cases",
    description:
      "Manage investigations and associated digital evidence.",
  },

  evidence: {
    title: "Evidence",
    description:
      "Register, store and blockchain-anchor digital forensic evidence.",
  },

  transfers: {
    title: "Custody Transfers",
    description:
      "Transfer evidence custody and inspect its blockchain-backed chain of custody.",
  },

  verify: {
    title: "Integrity Verification",
    description:
      "Compare stored evidence against PostgreSQL and the blockchain anchor.",
  },

  audit: {
    title: "Audit Log",
    description:
      "Review append-only TRACE-X evidence and custody activity.",
  },
}

/* =========================================================
   APPLICATION
========================================================= */

function App() {
  const [
    authenticated,
    setAuthenticated,
  ] =
    useState(false)

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false)

  const [
    activePage,
    setActivePage,
  ] =
    useState<Page>(
      "dashboard",
    )

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false)

  const [
    cases,
    setCases,
  ] =
    useState<
      InvestigationCase[]
    >([])

  const [
    evidence,
    setEvidence,
  ] =
    useState<
      EvidenceRecord[]
    >([])

  const [
    apiLoading,
    setApiLoading,
  ] =
    useState(false)

  const [
    apiError,
    setApiError,
  ] =
    useState<
      string | null
    >(null)

  /* -------------------------------------------------------
     LOAD DATA
  ------------------------------------------------------- */

  async function loadBackendData() {
    setApiLoading(
      true,
    )

    setApiError(
      null,
    )

    try {
      const [
        casesResponse,
        evidenceResponse,
      ] =
        await Promise.all([
          requestJson<
            ApiListResponse<InvestigationCase>
          >(
            "/api/cases",
          ),

          requestJson<
            ApiListResponse<EvidenceRecord>
          >(
            "/api/evidence",
          ),
        ])

      setCases(
        casesResponse.data,
      )

      setEvidence(
        evidenceResponse.data,
      )
    } catch (error) {
      setApiError(
        getErrorMessage(
          error,
        ),
      )
    } finally {
      setApiLoading(
        false,
      )
    }
  }

  useEffect(() => {
    if (
      !authenticated
    ) {
      return
    }

    void loadBackendData()
  }, [
    authenticated,
  ])

  /* -------------------------------------------------------
     CREATE CASE
  ------------------------------------------------------- */

  async function createCaseOnServer(
    payload:
      CreateCasePayload,
  ) {
    const response =
      await requestJson<
        ApiItemResponse<InvestigationCase>
      >(
        "/api/cases",
        {
          method:
            "POST",

          body:
            JSON.stringify(
              payload,
            ),
        },
      )

    setCases(
      (current) => [
        response.data,
        ...current,
      ],
    )
  }

  /* -------------------------------------------------------
     UPLOAD EVIDENCE
  ------------------------------------------------------- */

  async function uploadEvidenceOnServer(
    payload:
      UploadEvidencePayload,
  ) {
    const formData =
      new FormData()

    formData.append(
      "file",
      payload.file,
    )

    formData.append(
      "caseId",
      payload.caseId,
    )

    formData.append(
      "description",
      payload.description,
    )

    formData.append(
      "type",
      payload.type,
    )

    formData.append(
      "custodian",
      payload.custodian,
    )

    const response =
      await requestJson<
        ApiItemResponse<EvidenceRecord>
      >(
        "/api/evidence/upload",
        {
          method:
            "POST",

          body:
            formData,
        },
      )

    setEvidence(
      (current) => [
        response.data,
        ...current,
      ],
    )

    setCases(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            payload.caseId
              ? {
                  ...item,

                  evidenceCount:
                    item.evidenceCount +
                    1,

                  updatedAt:
                    "Just now",
                }
              : item,
        ),
    )

    return response.data
  }

  /* -------------------------------------------------------
     RETRY EVIDENCE ANCHOR
  ------------------------------------------------------- */

  async function retryBlockchainAnchor(
    evidenceId: string,
  ) {
    try {
      const response =
        await requestJson<
          ApiItemResponse<EvidenceRecord>
        >(
          `/api/evidence/${encodeURIComponent(
            evidenceId,
          )}/anchor`,
          {
            method:
              "POST",
          },
        )

      setEvidence(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              evidenceId
                ? response.data
                : item,
          ),
      )

      return response.data
    } catch (error) {
      await loadBackendData()

      throw error
    }
  }

  /* -------------------------------------------------------
     VERIFY EVIDENCE
  ------------------------------------------------------- */

  async function verifyEvidenceOnServer(
    evidenceId: string,
  ) {
    try {
      const response =
        await requestJson<
          VerifyEvidenceResponse
        >(
          `/api/evidence/${encodeURIComponent(
            evidenceId,
          )}/verify`,
          {
            method:
              "POST",
          },
        )

      setEvidence(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              evidenceId
                ? {
                    ...item,

                    integrity:
                      response.integrity,

                    updatedAt:
                      "Just now",
                  }
                : item,
          ),
      )

      return response
    } catch (error) {
      await loadBackendData()

      throw error
    }
  }

  /* -------------------------------------------------------
     CUSTODY TRANSFER
  ------------------------------------------------------- */

  async function transferEvidenceCustody(
    evidenceId:
      string,

    toCustodian:
      string,

    reason:
      string,
  ) {
    const response =
      await requestJson<
        TransferCustodyResponse
      >(
        `/api/evidence/${encodeURIComponent(
          evidenceId,
        )}/transfer`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              toCustodian,
              reason,
            }),
        },
      )

    if (
      response.data.evidence
    ) {
      setEvidence(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              evidenceId
                ? response.data.evidence!
                : item,
          ),
      )
    }

    return response
  }

  /* -------------------------------------------------------
     RETRY CUSTODY EVENT
  ------------------------------------------------------- */

  async function retryCustodyAnchor(
    custodyEventId:
      number,
  ) {
    const response =
      await requestJson<
        ApiItemResponse<CustodyEvent>
      >(
        `/api/custody/${custodyEventId}/anchor`,
        {
          method:
            "POST",
        },
      )

    return response.data
  }

  if (
    !authenticated
  ) {
    return (
      <LoginScreen
        showPassword={
          showPassword
        }
        setShowPassword={
          setShowPassword
        }
        onLogin={() =>
          setAuthenticated(
            true,
          )
        }
      />
    )
  }

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#050506]
        text-white
      "
    >
      <AmbientBackground />

      {/* ===================================================
          DESKTOP SIDEBAR
      =================================================== */}

      <aside
        className="
          glass
          fixed
          bottom-4
          left-4
          top-4
          z-40
          hidden
          w-[250px]
          flex-col
          rounded-[30px]
          p-4
          lg:flex
        "
      >
        <SidebarContent
          activePage={
            activePage
          }
          setActivePage={
            setActivePage
          }
          onLogout={() => {
            setAuthenticated(
              false,
            )

            setActivePage(
              "dashboard",
            )
          }}
        />
      </aside>

      {/* ===================================================
          MOBILE SIDEBAR
      =================================================== */}

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setMobileMenuOpen(
                  false,
                )
              }
              className="
                fixed
                inset-0
                z-40
                bg-black/60
                backdrop-blur-md
                lg:hidden
              "
            />

            <motion.aside
              initial={{
                x: -300,
                opacity: 0,
              }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              exit={{
                x: -300,
                opacity: 0,
              }}
              transition={{
                type:
                  "spring",

                stiffness:
                  260,

                damping:
                  28,
              }}
              className="
                glass
                fixed
                bottom-4
                left-4
                top-4
                z-50
                flex
                w-[260px]
                flex-col
                rounded-[30px]
                p-4
                lg:hidden
              "
            >
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(
                    false,
                  )
                }
                className="
                  absolute
                  right-4
                  top-4
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-white/5
                  text-white/50
                "
              >
                <X
                  size={17}
                />
              </button>

              <SidebarContent
                activePage={
                  activePage
                }
                setActivePage={(
                  page,
                ) => {
                  setActivePage(
                    page,
                  )

                  setMobileMenuOpen(
                    false,
                  )
                }}
                onLogout={() => {
                  setAuthenticated(
                    false,
                  )

                  setActivePage(
                    "dashboard",
                  )
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <div
        className="
          relative
          z-10
          min-h-screen
          w-full
          lg:pl-[282px]
        "
      >
        <header
          className="
            flex
            h-[86px]
            items-center
            justify-between
            px-5
            md:px-8
            lg:px-10
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <motion.button
              type="button"
              whileTap={{
                scale:
                  0.92,
              }}
              onClick={() =>
                setMobileMenuOpen(
                  true,
                )
              }
              className="
                glass
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                lg:hidden
              "
            >
              <Menu
                size={19}
              />
            </motion.button>

            <div>
              <p
                className="
                  text-xs
                  text-white/35
                "
              >
                TRACE-X
              </p>

              <h1
                className="
                  text-lg
                  font-semibold
                "
              >
                {
                  pageInfo[
                    activePage
                  ].title
                }
              </h1>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                glass
                hidden
                items-center
                gap-2
                rounded-2xl
                px-4
                py-3
                text-xs
                text-emerald-200/55
                md:flex
              "
            >
              <Blocks
                size={14}
              />

              Blockchain Enabled
            </div>

            <motion.button
              type="button"
              whileTap={{
                scale:
                  0.95,
              }}
              className="
                glass
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
              "
            >
              <UserRound
                size={18}
                className="
                  text-white/60
                "
              />
            </motion.button>
          </div>
        </header>

        <div
          className="
            px-5
            pb-10
            md:px-8
            lg:px-10
          "
        >
          <AnimatePresence
            mode="wait"
          >
            <motion.div
              key={
                activePage
              }
              initial={{
                opacity:
                  0,

                y:
                  12,
              }}
              animate={{
                opacity:
                  1,

                y:
                  0,
              }}
              exit={{
                opacity:
                  0,

                y:
                  -8,
              }}
              transition={{
                duration:
                  0.25,
              }}
            >
              <PageHeader
                page={
                  activePage
                }
              />

              {(apiLoading ||
                apiError) && (
                <ApiConnectionBanner
                  loading={
                    apiLoading
                  }
                  error={
                    apiError
                  }
                  onRetry={() =>
                    void loadBackendData()
                  }
                />
              )}

              {activePage ===
              "dashboard" ? (
                <Dashboard
                  cases={
                    cases
                  }
                  evidence={
                    evidence
                  }
                />
              ) : activePage ===
                "cases" ? (
                <CasesPage
                  cases={
                    cases
                  }
                  onCreateCase={
                    createCaseOnServer
                  }
                />
              ) : activePage ===
                "evidence" ? (
                <EvidencePage
                  evidence={
                    evidence
                  }
                  cases={
                    cases
                  }
                  onUploadEvidence={
                    uploadEvidenceOnServer
                  }
                  onRetryAnchor={
                    retryBlockchainAnchor
                  }
                />
              ) : activePage ===
                "transfers" ? (
                <TransfersPage
                  evidence={
                    evidence
                  }
                  onTransfer={
                    transferEvidenceCustody
                  }
                  onRetryCustodyAnchor={
                    retryCustodyAnchor
                  }
                />
              ) : activePage ===
                "verify" ? (
                <VerifyPage
                  evidence={
                    evidence
                  }
                  onVerify={
                    verifyEvidenceOnServer
                  }
                  onRetryAnchor={
                    retryBlockchainAnchor
                  }
                />
              ) : activePage ===
                "audit" ? (
                <AuditLogPage />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}

/* =========================================================
   SIDEBAR
========================================================= */

function SidebarContent({
  activePage,
  setActivePage,
  onLogout,
}: {
  activePage:
    Page

  setActivePage:
    (page: Page) => void

  onLogout:
    () => void
}) {
  return (
    <>
      <div
        className="
          flex
          items-center
          gap-3
          px-2
          py-3
        "
      >
        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-2xl
            border
            border-white/15
            bg-white/10
          "
        >
          <Fingerprint
            size={21}
          />
        </div>

        <div>
          <p
            className="
              text-sm
              font-semibold
              tracking-[0.18em]
            "
          >
            TRACE-X
          </p>

          <p
            className="
              text-[10px]
              text-white/30
            "
          >
            Evidence Integrity
          </p>
        </div>
      </div>

      <Divider />

      <nav
        className="
          space-y-1.5
        "
      >
        {navigation.map(
          (item) => {
            const Icon =
              item.icon

            const selected =
              activePage ===
              item.id

            return (
              <motion.button
                type="button"
                key={
                  item.id
                }
                whileTap={{
                  scale:
                    0.98,
                }}
                onClick={() =>
                  setActivePage(
                    item.id,
                  )
                }
                className={`
                  relative
                  flex
                  h-11
                  w-full
                  items-center
                  gap-3
                  overflow-hidden
                  rounded-2xl
                  px-3
                  text-left
                  text-sm

                  ${
                    selected
                      ? "text-white"
                      : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                  }
                `}
              >
                {selected && (
                  <motion.div
                    layoutId="sidebar-selection"
                    className="
                      absolute
                      inset-0
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.08]
                    "
                  />
                )}

                <Icon
                  size={17}
                  className="
                    relative
                    z-10
                  "
                />

                <span
                  className="
                    relative
                    z-10
                  "
                >
                  {
                    item.label
                  }
                </span>
              </motion.button>
            )
          },
        )}
      </nav>

      <div
        className="
          flex-1
        "
      />

      <div
        className="
          mb-3
          rounded-2xl
          border
          border-emerald-400/10
          bg-emerald-400/[0.04]
          p-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <ShieldCheck
            size={15}
            className="
              text-emerald-300
            "
          />

          <span
            className="
              text-xs
              text-emerald-200/70
            "
          >
            TRACE-X Ready
          </span>
        </div>

        <p
          className="
            mt-2
            text-[10px]
            leading-4
            text-white/25
          "
        >
          Storage, blockchain and
          custody tracking enabled
        </p>
      </div>

      <motion.button
        type="button"
        whileTap={{
          scale:
            0.98,
        }}
        onClick={
          onLogout
        }
        className="
          flex
          h-11
          w-full
          items-center
          gap-3
          rounded-2xl
          px-3
          text-sm
          text-white/35
          hover:bg-white/[0.04]
        "
      >
        <LogOut
          size={16}
        />

        Sign out
      </motion.button>
    </>
  )
}

/* =========================================================
   PAGE HEADER
========================================================= */

function PageHeader({
  page,
}: {
  page: Page
}) {
  return (
    <div
      className="
        mb-7
      "
    >
      <h2
        className="
          text-3xl
          font-semibold
          tracking-[-0.04em]
          md:text-4xl
        "
      >
        {
          pageInfo[
            page
          ].title
        }
      </h2>

      <p
        className="
          mt-2
          max-w-2xl
          text-sm
          leading-6
          text-white/35
        "
      >
        {
          pageInfo[
            page
          ].description
        }
      </p>
    </div>
  )
}

/* =========================================================
   API BANNER
========================================================= */

function ApiConnectionBanner({
  loading,
  error,
  onRetry,
}: {
  loading:
    boolean

  error:
    string | null

  onRetry:
    () => void
}) {
  if (loading) {
    return (
      <div
        className="
          mb-5
          flex
          items-center
          gap-3
          rounded-[20px]
          border
          border-blue-400/10
          bg-blue-400/[0.04]
          px-4
          py-3
        "
      >
        <LoaderCircle
          size={16}
          className="
            animate-spin
            text-blue-300
          "
        />

        <p
          className="
            text-xs
            text-blue-200/70
          "
        >
          Loading TRACE-X...
        </p>
      </div>
    )
  }

  if (!error) {
    return null
  }

  return (
    <div
      className="
        mb-5
        flex
        flex-col
        gap-3
        rounded-[20px]
        border
        border-red-400/15
        bg-red-400/[0.05]
        p-4
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      <div
        className="
          flex
          gap-3
        "
      >
        <WifiOff
          size={17}
          className="
            mt-0.5
            text-red-300
          "
        />

        <div>
          <p
            className="
              text-xs
              text-red-200
            "
          >
            Backend connection
            failed
          </p>

          <p
            className="
              mt-1
              text-xs
              text-white/30
            "
          >
            {error}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={
          onRetry
        }
        className="
          flex
          h-9
          items-center
          gap-2
          rounded-xl
          border
          border-white/10
          bg-white/[0.05]
          px-3
          text-xs
          text-white/50
        "
      >
        <RefreshCw
          size={13}
        />

        Retry
      </button>
    </div>
  )
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  cases,
  evidence,
}: {
  cases:
    InvestigationCase[]

  evidence:
    EvidenceRecord[]
}) {
  const verified =
    evidence.filter(
      (item) =>
        item.integrity ===
        "Verified",
    ).length

  const anchored =
    evidence.filter(
      (item) =>
        item.blockchainStatus ===
        "Anchored",
    ).length

  const mismatches =
    evidence.filter(
      (item) =>
        item.integrity ===
        "Mismatch",
    ).length

  const activeCases =
    cases.filter(
      (item) =>
        item.status !==
        "Closed",
    ).length

  return (
    <>
      <div
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <StatCard
          label="Verified Files"
          value={
            verified
          }
          detail="File integrity"
          icon={
            <ShieldCheck
              size={18}
            />
          }
        />

        <StatCard
          label="Blockchain Anchored"
          value={
            anchored
          }
          detail="Smart contract records"
          icon={
            <Blocks
              size={18}
            />
          }
        />

        <StatCard
          label="Mismatches"
          value={
            mismatches
          }
          detail="Requires attention"
          icon={
            <ShieldAlert
              size={18}
            />
          }
        />

        <StatCard
          label="Active Cases"
          value={
            activeCases
          }
          detail={`${cases.length} total cases`}
          icon={
            <FolderKanban
              size={18}
            />
          }
        />
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-1
          gap-4
          xl:grid-cols-[1.6fr_1fr]
        "
      >
        <div
          className="
            glass
            overflow-hidden
            rounded-[28px]
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-white/[0.07]
              p-5
            "
          >
            <div>
              <h3
                className="
                  text-sm
                  font-medium
                "
              >
                Recent Evidence
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                Integrity and
                blockchain status
              </p>
            </div>

            <FileCheck2
              size={18}
              className="
                text-white/30
              "
            />
          </div>

          {evidence
            .slice(
              0,
              5,
            )
            .map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="
                    flex
                    flex-col
                    gap-3
                    border-b
                    border-white/[0.05]
                    px-5
                    py-4
                    last:border-0
                    sm:flex-row
                    sm:items-center
                  "
                >
                  <div
                    className="
                      flex
                      min-w-0
                      flex-1
                      items-center
                      gap-4
                    "
                  >
                    <FileText
                      size={16}
                      className="
                        shrink-0
                        text-white/35
                      "
                    />

                    <div
                      className="
                        min-w-0
                      "
                    >
                      <p
                        className="
                          truncate
                          text-sm
                          text-white/70
                        "
                      >
                        {
                          item.name
                        }
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-white/25
                        "
                      >
                        {
                          item.id
                        }
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    <IntegrityBadge
                      integrity={
                        item.integrity
                      }
                    />

                    <BlockchainBadge
                      status={
                        item.blockchainStatus
                      }
                    />
                  </div>
                </div>
              ),
            )}
        </div>

        <div
          className="
            glass
            rounded-[28px]
            p-6
          "
        >
          <Blocks
            size={20}
            className="
              text-blue-300/70
            "
          />

          <h3
            className="
              mt-5
              text-lg
              font-medium
            "
          >
            TRACE-X Integrity
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-white/30
            "
          >
            Evidence bytes,
            operational metadata
            and cryptographic
            anchors remain
            separated.
          </p>

          <div
            className="
              mt-6
              space-y-3
            "
          >
            <StorageRow
              label="Evidence bytes"
              value="Off-chain"
            />

            <StorageRow
              label="Metadata"
              value="PostgreSQL"
            />

            <StorageRow
              label="Hash"
              value="SHA-256"
            />

            <StorageRow
              label="Custody"
              value="Blockchain"
            />
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
}) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className="
        glass
        rounded-[26px]
        p-5
      "
    >
      <div
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-2xl
          border
          border-white/10
          bg-white/[0.05]
          text-white/50
        "
      >
        {icon}
      </div>

      <p
        className="
          mt-6
          text-3xl
          font-semibold
        "
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-sm
          text-white/65
        "
      >
        {label}
      </p>

      <p
        className="
          mt-2
          text-xs
          text-white/25
        "
      >
        {detail}
      </p>
    </motion.div>
  )
}

function StorageRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        rounded-2xl
        border
        border-white/[0.06]
        bg-white/[0.025]
        p-3
      "
    >
      <span
        className="
          text-xs
          text-white/30
        "
      >
        {label}
      </span>

      <span
        className="
          text-xs
          text-white/60
        "
      >
        {value}
      </span>
    </div>
  )
}

/* =========================================================
   CASES PAGE
========================================================= */

function CasesPage({
  cases,
  onCreateCase,
}: {
  cases:
    InvestigationCase[]

  onCreateCase: (
    payload:
      CreateCasePayload,
  ) => Promise<void>
}) {
  const [
    search,
    setSearch,
  ] =
    useState("")

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false)

  const [
    title,
    setTitle,
  ] =
    useState("")

  const [
    description,
    setDescription,
  ] =
    useState("")

  const [
    investigator,
    setInvestigator,
  ] =
    useState(
      "Investigator A",
    )

  const [
    priority,
    setPriority,
  ] =
    useState<CasePriority>(
      "Medium",
    )

  const [
    creating,
    setCreating,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const filtered =
    cases.filter(
      (item) => {
        const query =
          search
            .trim()
            .toLowerCase()

        return (
          item.title
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.id
            .toLowerCase()
            .includes(
              query,
            )
        )
      },
    )

  function reset() {
    setTitle("")
    setDescription("")
    setInvestigator(
      "Investigator A",
    )
    setPriority(
      "Medium",
    )
    setError(
      null,
    )
  }

  async function submit() {
    if (
      !title.trim() ||
      creating
    ) {
      return
    }

    setCreating(
      true,
    )

    setError(
      null,
    )

    try {
      await onCreateCase({
        title:
          title.trim(),

        description:
          description.trim(),

        investigator,

        priority,
      })

      setCreateOpen(
        false,
      )

      reset()
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
        ),
      )
    } finally {
      setCreating(
        false,
      )
    }
  }

  return (
    <>
      <div
        className="
          mb-5
          flex
          flex-col
          gap-3
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <SearchBox
          value={
            search
          }
          onChange={
            setSearch
          }
          placeholder="Search cases..."
        />

        <PrimaryButton
          onClick={() => {
            reset()

            setCreateOpen(
              true,
            )
          }}
        >
          <Plus
            size={16}
          />

          Create Case
        </PrimaryButton>
      </div>

      <div
        className="
          grid
          gap-4
        "
      >
        {filtered.map(
          (item) => (
            <div
              key={
                item.id
              }
              className="
                glass
                rounded-[26px]
                p-5
                md:p-6
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-5
                  lg:flex-row
                  lg:items-center
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    gap-4
                  "
                >
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.05]
                    "
                  >
                    <FolderKanban
                      size={19}
                      className="
                        text-white/50
                      "
                    />
                  </div>

                  <div
                    className="
                      min-w-0
                    "
                  >
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <h3
                        className="
                          text-base
                          font-medium
                          text-white/80
                        "
                      >
                        {
                          item.title
                        }
                      </h3>

                      <PriorityBadge
                        priority={
                          item.priority
                        }
                      />

                      <CaseStatusBadge
                        status={
                          item.status
                        }
                      />
                    </div>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-white/25
                      "
                    >
                      {
                        item.id
                      }
                    </p>

                    <p
                      className="
                        mt-3
                        max-w-2xl
                        text-sm
                        leading-6
                        text-white/30
                      "
                    >
                      {
                        item.description
                      }
                    </p>
                  </div>
                </div>

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-4
                    sm:grid-cols-3
                    lg:min-w-[360px]
                  "
                >
                  <MetaItem
                    label="INVESTIGATOR"
                    value={
                      item.investigator
                    }
                  />

                  <MetaItem
                    label="EVIDENCE"
                    value={`${item.evidenceCount} items`}
                  />

                  <MetaItem
                    label="CREATED"
                    value={
                      item.createdAt
                    }
                  />
                </div>
              </div>
            </div>
          ),
        )}

        {filtered.length ===
          0 && (
          <EmptyState
            title="No cases found"
            description="Try another search."
            icon={
              <FolderKanban
                size={27}
              />
            }
          />
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <>
            <ModalBackdrop
              onClose={() =>
                setCreateOpen(
                  false,
                )
              }
            />

            <ModalCard>
              <ModalHeader
                title="Create Case"
                description="Create a persistent forensic investigation."
                onClose={() =>
                  setCreateOpen(
                    false,
                  )
                }
              />

              <div
                className="
                  mt-7
                  space-y-5
                "
              >
                <FormField
                  label="Case title"
                >
                  <input
                    value={
                      title
                    }
                    onChange={(
                      event,
                    ) =>
                      setTitle(
                        event
                          .target
                          .value,
                      )
                    }
                    className={
                      inputClass
                    }
                    placeholder="Investigation title"
                  />
                </FormField>

                <FormField
                  label="Description"
                >
                  <textarea
                    rows={4}
                    value={
                      description
                    }
                    onChange={(
                      event,
                    ) =>
                      setDescription(
                        event
                          .target
                          .value,
                      )
                    }
                    className={
                      textareaClass
                    }
                    placeholder="Describe the investigation..."
                  />
                </FormField>

                <div
                  className="
                    grid
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <FormField
                    label="Investigator"
                  >
                    <select
                      value={
                        investigator
                      }
                      onChange={(
                        event,
                      ) =>
                        setInvestigator(
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        selectClass
                      }
                    >
                      <option>
                        Investigator A
                      </option>

                      <option>
                        Investigator B
                      </option>

                      <option>
                        Investigator C
                      </option>
                    </select>
                  </FormField>

                  <FormField
                    label="Priority"
                  >
                    <select
                      value={
                        priority
                      }
                      onChange={(
                        event,
                      ) =>
                        setPriority(
                          event
                            .target
                            .value as CasePriority,
                        )
                      }
                      className={
                        selectClass
                      }
                    >
                      <option>
                        Low
                      </option>

                      <option>
                        Medium
                      </option>

                      <option>
                        High
                      </option>

                      <option>
                        Critical
                      </option>
                    </select>
                  </FormField>
                </div>

                {error && (
                  <FormError
                    message={
                      error
                    }
                  />
                )}
              </div>

              <ModalActions
                onCancel={() =>
                  setCreateOpen(
                    false,
                  )
                }
                onConfirm={() =>
                  void submit()
                }
                disabled={
                  !title.trim()
                }
                busy={
                  creating
                }
                confirmText="Create Case"
                busyText="Creating..."
              />
            </ModalCard>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* =========================================================
   EVIDENCE PAGE
========================================================= */

function EvidencePage({
  evidence,
  cases,
  onUploadEvidence,
  onRetryAnchor,
}: {
  evidence:
    EvidenceRecord[]

  cases:
    InvestigationCase[]

  onUploadEvidence: (
    payload:
      UploadEvidencePayload,
  ) => Promise<EvidenceRecord>

  onRetryAnchor: (
    evidenceId:
      string,
  ) => Promise<EvidenceRecord>
}) {
  const [
    search,
    setSearch,
  ] =
    useState("")

  const [
    registerOpen,
    setRegisterOpen,
  ] =
    useState(false)

  const [
    selected,
    setSelected,
  ] =
    useState<
      EvidenceRecord | null
    >(null)

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    )

  const [
    caseId,
    setCaseId,
  ] =
    useState("")

  const [
    type,
    setType,
  ] =
    useState<EvidenceType>(
      "Other",
    )

  const [
    custodian,
    setCustodian,
  ] =
    useState(
      "Investigator A",
    )

  const [
    description,
    setDescription,
  ] =
    useState("")

  const [
    hashing,
    setHashing,
  ] =
    useState(false)

  const [
    browserHash,
    setBrowserHash,
  ] =
    useState<
      string | null
    >(null)

  const [
    hashSkipped,
    setHashSkipped,
  ] =
    useState(false)

  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const [
    dragActive,
    setDragActive,
  ] =
    useState(false)

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  useEffect(() => {
    if (
      !caseId &&
      cases.length > 0
    ) {
      setCaseId(
        cases[0].id,
      )
    }
  }, [
    cases,
    caseId,
  ])

  useEffect(() => {
    if (
      !selected
    ) {
      return
    }

    const fresh =
      evidence.find(
        (item) =>
          item.id ===
          selected.id,
      )

    if (fresh) {
      setSelected(
        fresh,
      )
    }
  }, [
    evidence,
    selected?.id,
  ])

  const filtered =
    evidence.filter(
      (item) => {
        const query =
          search
            .trim()
            .toLowerCase()

        return (
          item.name
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.id
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.caseTitle
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.hash
            .toLowerCase()
            .includes(
              query,
            )
        )
      },
    )

  async function processFile(
    file: File,
  ) {
    setSelectedFile(
      file,
    )

    setType(
      detectEvidenceType(
        file.name,
      ),
    )

    setBrowserHash(
      null,
    )

    setHashSkipped(
      false,
    )

    setError(
      null,
    )

    if (
      file.size >
      BROWSER_HASH_LIMIT
    ) {
      setHashSkipped(
        true,
      )

      return
    }

    setHashing(
      true,
    )

    try {
      const hash =
        await calculateSHA256(
          file,
        )

      setBrowserHash(
        hash,
      )
    } catch {
      setError(
        "Browser preview hashing failed. The backend can still calculate the authoritative SHA-256.",
      )
    } finally {
      setHashing(
        false,
      )
    }
  }

  function reset() {
    setSelectedFile(
      null,
    )

    setCaseId(
      cases[0]?.id ??
        "",
    )

    setType(
      "Other",
    )

    setCustodian(
      "Investigator A",
    )

    setDescription(
      "",
    )

    setBrowserHash(
      null,
    )

    setHashSkipped(
      false,
    )

    setHashing(
      false,
    )

    setUploading(
      false,
    )

    setError(
      null,
    )
  }

  async function uploadEvidence() {
    if (
      !selectedFile ||
      !caseId ||
      uploading
    ) {
      return
    }

    setUploading(
      true,
    )

    setError(
      null,
    )

    try {
      const storedEvidence =
        await onUploadEvidence(
          {
            file:
              selectedFile,

            caseId,

            description:
              description.trim(),

            type,

            custodian,
          },
        )

      if (
        browserHash &&
        browserHash !==
          storedEvidence.hash
      ) {
        console.warn(
          "TRACE-X browser/backend SHA-256 disagreement detected.",
        )
      }

      setRegisterOpen(
        false,
      )

      reset()
    } catch (uploadError) {
      setError(
        getErrorMessage(
          uploadError,
        ),
      )
    } finally {
      setUploading(
        false,
      )
    }
  }

  function handleDrop(
    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()

    setDragActive(
      false,
    )

    const file =
      event.dataTransfer
        .files[0]

    if (file) {
      void processFile(
        file,
      )
    }
  }

  return (
    <>
      <div
        className="
          mb-5
          flex
          flex-col
          gap-3
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <SearchBox
          value={
            search
          }
          onChange={
            setSearch
          }
          placeholder="Search evidence, case or SHA-256..."
        />

        <PrimaryButton
          onClick={() => {
            reset()

            setRegisterOpen(
              true,
            )
          }}
        >
          <UploadCloud
            size={17}
          />

          Register Evidence
        </PrimaryButton>
      </div>

      <div
        className="
          mb-5
          grid
          grid-cols-2
          gap-3
          lg:grid-cols-4
        "
      >
        <MiniStat
          label="Total"
          value={
            evidence.length
          }
        />

        <MiniStat
          label="File Verified"
          value={
            evidence.filter(
              (item) =>
                item.integrity ===
                "Verified",
            ).length
          }
        />

        <MiniStat
          label="Anchored"
          value={
            evidence.filter(
              (item) =>
                item.blockchainStatus ===
                "Anchored",
            ).length
          }
        />

        <MiniStat
          label="Anchor Failed"
          value={
            evidence.filter(
              (item) =>
                item.blockchainStatus ===
                "Failed",
            ).length
          }
        />
      </div>

      <div
        className="
          grid
          gap-4
        "
      >
        {filtered.map(
          (item) => (
            <motion.button
              type="button"
              key={
                item.id
              }
              whileHover={{
                y: -2,
              }}
              onClick={() =>
                setSelected(
                  item,
                )
              }
              className="
                glass
                rounded-[26px]
                p-5
                text-left
                md:p-6
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-5
                  xl:flex-row
                  xl:items-center
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    gap-4
                  "
                >
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.05]
                    "
                  >
                    <EvidenceTypeIcon
                      type={
                        item.type
                      }
                    />
                  </div>

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <h3
                        className="
                          truncate
                          text-base
                          font-medium
                          text-white/80
                        "
                      >
                        {
                          item.name
                        }
                      </h3>

                      <IntegrityBadge
                        integrity={
                          item.integrity
                        }
                      />

                      <BlockchainBadge
                        status={
                          item.blockchainStatus
                        }
                      />
                    </div>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-white/25
                      "
                    >
                      {
                        item.id
                      }{" "}
                      •{" "}
                      {
                        item.type
                      }
                    </p>

                    <p
                      className="
                        mt-3
                        truncate
                        font-mono
                        text-[11px]
                        text-white/25
                      "
                    >
                      SHA-256:{" "}
                      {
                        item.hash
                      }
                    </p>
                  </div>
                </div>

                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-6
                  "
                >
                  <MetaItem
                    label="CASE"
                    value={
                      item.caseId
                    }
                  />

                  <MetaItem
                    label="CUSTODIAN"
                    value={
                      item.custodian
                    }
                  />

                  <MetaItem
                    label="BLOCK"
                    value={
                      item.blockchainBlockNumber ===
                      null
                        ? "—"
                        : String(
                            item.blockchainBlockNumber,
                          )
                    }
                  />

                  <ChevronRight
                    size={18}
                    className="
                      text-white/20
                    "
                  />
                </div>
              </div>
            </motion.button>
          ),
        )}

        {filtered.length ===
          0 && (
          <EmptyState
            title="No evidence found"
            description="No evidence matches your search."
            icon={
              <FileText
                size={27}
              />
            }
          />
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <EvidenceDetails
            evidence={
              selected
            }
            onClose={() =>
              setSelected(
                null,
              )
            }
            onRetryAnchor={
              onRetryAnchor
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {registerOpen && (
          <>
            <ModalBackdrop
              onClose={() =>
                setRegisterOpen(
                  false,
                )
              }
            />

            <ModalCard
              large
            >
              <ModalHeader
                title="Register Evidence"
                description="Upload the real evidence file. TRACE-X hashes it on the server, stores it off-chain and anchors the fingerprint on the blockchain."
                onClose={() =>
                  setRegisterOpen(
                    false,
                  )
                }
              />

              <div
                className="
                  mt-7
                  space-y-5
                "
              >
                <div
                  onDragEnter={(
                    event,
                  ) => {
                    event.preventDefault()

                    setDragActive(
                      true,
                    )
                  }}
                  onDragOver={(
                    event,
                  ) => {
                    event.preventDefault()

                    setDragActive(
                      true,
                    )
                  }}
                  onDragLeave={() =>
                    setDragActive(
                      false,
                    )
                  }
                  onDrop={
                    handleDrop
                  }
                  onClick={() =>
                    fileInputRef
                      .current
                      ?.click()
                  }
                  className={`
                    cursor-pointer
                    rounded-[26px]
                    border
                    border-dashed
                    p-8
                    text-center
                    transition

                    ${
                      dragActive
                        ? "border-blue-300/40 bg-blue-400/[0.08]"
                        : "border-white/15 bg-white/[0.025] hover:border-white/25"
                    }
                  `}
                >
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    className="
                      hidden
                    "
                    onChange={(
                      event,
                    ) => {
                      const file =
                        event
                          .target
                          .files?.[0]

                      if (file) {
                        void processFile(
                          file,
                        )
                      }
                    }}
                  />

                  <UploadCloud
                    size={28}
                    className="
                      mx-auto
                      text-white/40
                    "
                  />

                  <p
                    className="
                      mt-4
                      text-sm
                      text-white/70
                    "
                  >
                    {selectedFile
                      ? selectedFile.name
                      : "Drop evidence here or click to browse"}
                  </p>

                  <p
                    className="
                      mt-2
                      text-xs
                      text-white/25
                    "
                  >
                    {selectedFile
                      ? formatBytes(
                          selectedFile.size,
                        )
                      : "Evidence bytes remain off-chain"}
                  </p>
                </div>

                {hashing && (
                  <InfoPanel>
                    <LoaderCircle
                      size={17}
                      className="
                        animate-spin
                        text-blue-300
                      "
                    />

                    <div>
                      <p
                        className="
                          text-sm
                          text-white/65
                        "
                      >
                        Calculating
                        browser preview
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-white/25
                        "
                      >
                        The backend will
                        independently
                        calculate the
                        authoritative
                        SHA-256.
                      </p>
                    </div>
                  </InfoPanel>
                )}

                {browserHash &&
                  !hashing && (
                  <div
                    className="
                      rounded-[22px]
                      border
                      border-emerald-400/10
                      bg-emerald-400/[0.035]
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <CheckCircle2
                        size={16}
                        className="
                          text-emerald-300
                        "
                      />

                      <p
                        className="
                          text-xs
                          text-emerald-200/70
                        "
                      >
                        Browser preview
                        SHA-256
                      </p>
                    </div>

                    <p
                      className="
                        mt-3
                        break-all
                        font-mono
                        text-[11px]
                        leading-5
                        text-white/40
                      "
                    >
                      {
                        browserHash
                      }
                    </p>
                  </div>
                )}

                {hashSkipped && (
                  <InfoPanel>
                    <HardDrive
                      size={17}
                      className="
                        text-amber-300
                      "
                    />

                    <div>
                      <p
                        className="
                          text-sm
                          text-white/65
                        "
                      >
                        Browser hash
                        skipped
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-white/25
                        "
                      >
                        This file is
                        larger than
                        256 MB. The
                        backend will
                        stream and hash
                        it instead.
                      </p>
                    </div>
                  </InfoPanel>
                )}

                <div
                  className="
                    grid
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <FormField
                    label="Case"
                  >
                    <select
                      value={
                        caseId
                      }
                      onChange={(
                        event,
                      ) =>
                        setCaseId(
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        selectClass
                      }
                    >
                      {cases.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.id
                            }{" "}
                            —{" "}
                            {
                              item.title
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  <FormField
                    label="Evidence type"
                  >
                    <select
                      value={
                        type
                      }
                      onChange={(
                        event,
                      ) =>
                        setType(
                          event
                            .target
                            .value as EvidenceType,
                        )
                      }
                      className={
                        selectClass
                      }
                    >
                      <option>
                        Document
                      </option>

                      <option>
                        Disk Image
                      </option>

                      <option>
                        Network Capture
                      </option>

                      <option>
                        Log Archive
                      </option>

                      <option>
                        Image
                      </option>

                      <option>
                        Video
                      </option>

                      <option>
                        Other
                      </option>
                    </select>
                  </FormField>

                  <FormField
                    label="Initial custodian"
                  >
                    <select
                      value={
                        custodian
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustodian(
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        selectClass
                      }
                    >
                      <option>
                        Investigator A
                      </option>

                      <option>
                        Investigator B
                      </option>

                      <option>
                        Investigator C
                      </option>

                      <option>
                        Forensic Analyst A
                      </option>
                    </select>
                  </FormField>
                </div>

                <FormField
                  label="Description"
                >
                  <textarea
                    rows={4}
                    value={
                      description
                    }
                    onChange={(
                      event,
                    ) =>
                      setDescription(
                        event
                          .target
                          .value,
                      )
                    }
                    className={
                      textareaClass
                    }
                    placeholder="Describe acquisition source and context..."
                  />
                </FormField>

                {error && (
                  <FormError
                    message={
                      error
                    }
                  />
                )}
              </div>

              <ModalActions
                onCancel={() =>
                  setRegisterOpen(
                    false,
                  )
                }
                onConfirm={() =>
                  void uploadEvidence()
                }
                disabled={
                  !selectedFile ||
                  !caseId ||
                  hashing
                }
                busy={
                  uploading
                }
                confirmText="Store & Anchor"
                busyText="Storing..."
              />
            </ModalCard>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* =========================================================
   TRANSFERS PAGE
========================================================= */

function TransfersPage({
  evidence,
  onTransfer,
  onRetryCustodyAnchor,
}: {
  evidence:
    EvidenceRecord[]

  onTransfer: (
    evidenceId:
      string,

    toCustodian:
      string,

    reason:
      string,
  ) => Promise<TransferCustodyResponse>

  onRetryCustodyAnchor: (
    custodyEventId:
      number,
  ) => Promise<CustodyEvent>
}) {
  const [
    search,
    setSearch,
  ] =
    useState("")

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(null)

  const [
    custodyEvents,
    setCustodyEvents,
  ] =
    useState<
      CustodyEvent[]
    >([])

  const [
    loadingHistory,
    setLoadingHistory,
  ] =
    useState(false)

  const [
    historyError,
    setHistoryError,
  ] =
    useState<
      string | null
    >(null)

  const [
    destination,
    setDestination,
  ] =
    useState(
      "Forensic Analyst A",
    )

  const [
    reason,
    setReason,
  ] =
    useState("")

  const [
    transferring,
    setTransferring,
  ] =
    useState(false)

  const [
    transferError,
    setTransferError,
  ] =
    useState<
      string | null
    >(null)

  const [
    transferMessage,
    setTransferMessage,
  ] =
    useState<
      string | null
    >(null)

  const [
    retryingEventId,
    setRetryingEventId,
  ] =
    useState<
      number | null
    >(null)

  const selectedEvidence =
    evidence.find(
      (item) =>
        item.id ===
        selectedId,
    ) ??
    null

  useEffect(() => {
    if (
      selectedId ||
      evidence.length === 0
    ) {
      return
    }

    const preferred =
      evidence.find(
        (item) =>
          item.blockchainStatus ===
          "Anchored",
      ) ??
      evidence[0]

    setSelectedId(
      preferred.id,
    )
  }, [
    evidence,
    selectedId,
  ])

  async function loadHistory(
    evidenceId:
      string,
  ) {
    setLoadingHistory(
      true,
    )

    setHistoryError(
      null,
    )

    try {
      const response =
        await requestJson<
          CustodyHistoryResponse
        >(
          `/api/evidence/${encodeURIComponent(
            evidenceId,
          )}/custody`,
        )

      setCustodyEvents(
        response.data,
      )
    } catch (error) {
      setHistoryError(
        getErrorMessage(
          error,
        ),
      )

      setCustodyEvents(
        [],
      )
    } finally {
      setLoadingHistory(
        false,
      )
    }
  }

  useEffect(() => {
    if (
      !selectedId
    ) {
      setCustodyEvents(
        [],
      )

      return
    }

    void loadHistory(
      selectedId,
    )
  }, [
    selectedId,
  ])

  const filtered =
    evidence.filter(
      (item) => {
        const query =
          search
            .trim()
            .toLowerCase()

        return (
          item.name
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.id
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.custodian
            .toLowerCase()
            .includes(
              query,
            )
        )
      },
    )

  async function submitTransfer() {
    if (
      !selectedEvidence ||
      !destination.trim() ||
      !reason.trim() ||
      transferring
    ) {
      return
    }

    setTransferring(
      true,
    )

    setTransferError(
      null,
    )

    setTransferMessage(
      null,
    )

    try {
      const response =
        await onTransfer(
          selectedEvidence.id,
          destination.trim(),
          reason.trim(),
        )

      setTransferMessage(
        response.message,
      )

      setReason(
        "",
      )

      await loadHistory(
        selectedEvidence.id,
      )
    } catch (error) {
      setTransferError(
        getErrorMessage(
          error,
        ),
      )
    } finally {
      setTransferring(
        false,
      )
    }
  }

  async function retryCustodyEvent(
    eventId:
      number,
  ) {
    setRetryingEventId(
      eventId,
    )

    setHistoryError(
      null,
    )

    try {
      await onRetryCustodyAnchor(
        eventId,
      )

      if (
        selectedId
      ) {
        await loadHistory(
          selectedId,
        )
      }
    } catch (error) {
      setHistoryError(
        getErrorMessage(
          error,
        ),
      )
    } finally {
      setRetryingEventId(
        null,
      )
    }
  }

  return (
    <div
      className="
        grid
        grid-cols-1
        gap-4
        xl:grid-cols-[0.85fr_1.15fr]
      "
    >
      <div
        className="
          glass
          rounded-[28px]
          p-5
          md:p-6
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <ArrowLeftRight
            size={20}
            className="
              text-blue-300
            "
          />

          <div>
            <h3
              className="
                text-base
                font-medium
              "
            >
              Evidence Custody
            </h3>

            <p
              className="
                mt-1
                text-xs
                text-white/25
              "
            >
              Select evidence to
              manage custody.
            </p>
          </div>
        </div>

        <div
          className="
            mt-5
          "
        >
          <SearchBox
            value={
              search
            }
            onChange={
              setSearch
            }
            placeholder="Search evidence or custodian..."
          />
        </div>

        <div
          className="
            mt-5
            max-h-[650px]
            space-y-3
            overflow-y-auto
            pr-1
          "
        >
          {filtered.map(
            (item) => {
              const selected =
                selectedId ===
                item.id

              return (
                <motion.button
                  type="button"
                  key={
                    item.id
                  }
                  whileTap={{
                    scale:
                      0.99,
                  }}
                  onClick={() => {
                    setSelectedId(
                      item.id,
                    )

                    setTransferError(
                      null,
                    )

                    setTransferMessage(
                      null,
                    )
                  }}
                  className={`
                    w-full
                    rounded-[20px]
                    border
                    p-4
                    text-left
                    transition

                    ${
                      selected
                        ? "border-blue-300/25 bg-blue-400/[0.07]"
                        : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]"
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div
                      className="
                        min-w-0
                      "
                    >
                      <p
                        className="
                          truncate
                          text-sm
                          text-white/70
                        "
                      >
                        {
                          item.name
                        }
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-white/25
                        "
                      >
                        {
                          item.id
                        }
                      </p>

                      <p
                        className="
                          mt-3
                          text-xs
                          text-white/40
                        "
                      >
                        Custodian:{" "}
                        <span
                          className="
                            text-white/65
                          "
                        >
                          {
                            item.custodian
                          }
                        </span>
                      </p>
                    </div>

                    <BlockchainBadge
                      status={
                        item.blockchainStatus
                      }
                    />
                  </div>
                </motion.button>
              )
            },
          )}

          {filtered.length ===
            0 && (
            <div
              className="
                py-12
                text-center
                text-sm
                text-white/25
              "
            >
              No evidence found.
            </div>
          )}
        </div>
      </div>

      <div
        className="
          space-y-4
        "
      >
        {!selectedEvidence ? (
          <EmptyState
            title="Select evidence"
            description="Choose an evidence record to inspect its custody history."
            icon={
              <ArrowLeftRight
                size={28}
              />
            }
          />
        ) : (
          <>
            <div
              className="
                glass
                rounded-[28px]
                p-5
                md:p-6
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  sm:flex-row
                  sm:items-start
                  sm:justify-between
                "
              >
                <div>
                  <p
                    className="
                      text-xs
                      text-white/25
                    "
                  >
                    {
                      selectedEvidence.id
                    }
                  </p>

                  <h3
                    className="
                      mt-2
                      text-xl
                      font-medium
                    "
                  >
                    {
                      selectedEvidence.name
                    }
                  </h3>

                  <p
                    className="
                      mt-2
                      text-sm
                      text-white/30
                    "
                  >
                    Current custodian:{" "}
                    <span
                      className="
                        text-white/65
                      "
                    >
                      {
                        selectedEvidence.custodian
                      }
                    </span>
                  </p>
                </div>

                <BlockchainBadge
                  status={
                    selectedEvidence.blockchainStatus
                  }
                />
              </div>

              <Divider />

              <h4
                className="
                  text-sm
                  font-medium
                "
              >
                Transfer Custody
              </h4>

              <p
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-white/25
                "
              >
                A custody transfer
                changes the current
                custodian in
                PostgreSQL and creates
                a SHA-256 custody
                event digest that is
                anchored on-chain.
              </p>

              <div
                className="
                  mt-5
                  grid
                  gap-4
                  md:grid-cols-2
                "
              >
                <FormField
                  label="Current custodian"
                >
                  <input
                    value={
                      selectedEvidence.custodian
                    }
                    readOnly
                    className={`${inputClass} opacity-60`}
                  />
                </FormField>

                <FormField
                  label="Transfer to"
                >
                  <select
                    value={
                      destination
                    }
                    onChange={(
                      event,
                    ) =>
                      setDestination(
                        event
                          .target
                          .value,
                      )
                    }
                    className={
                      selectClass
                    }
                  >
                    <option>
                      Investigator A
                    </option>

                    <option>
                      Investigator B
                    </option>

                    <option>
                      Investigator C
                    </option>

                    <option>
                      Forensic Analyst A
                    </option>

                    <option>
                      Forensic Analyst B
                    </option>

                    <option>
                      Supervisor A
                    </option>

                    <option>
                      Evidence Reviewer A
                    </option>
                  </select>
                </FormField>
              </div>

              <div
                className="
                  mt-4
                "
              >
                <FormField
                  label="Transfer reason"
                >
                  <textarea
                    rows={4}
                    value={
                      reason
                    }
                    onChange={(
                      event,
                    ) =>
                      setReason(
                        event
                          .target
                          .value,
                      )
                    }
                    className={
                      textareaClass
                    }
                    placeholder="Example: Transferred to forensic laboratory for detailed analysis"
                  />
                </FormField>
              </div>

              {selectedEvidence.blockchainStatus !==
                "Anchored" && (
                <div
                  className="
                    mt-4
                  "
                >
                  <FormError
                    message="This evidence must have a healthy blockchain anchor before custody can be transferred."
                  />
                </div>
              )}

              {transferError && (
                <div
                  className="
                    mt-4
                  "
                >
                  <FormError
                    message={
                      transferError
                    }
                  />
                </div>
              )}

              {transferMessage && (
                <div
                  className="
                    mt-4
                    flex
                    items-start
                    gap-3
                    rounded-[18px]
                    border
                    border-emerald-400/15
                    bg-emerald-400/[0.05]
                    p-3
                  "
                >
                  <CheckCircle2
                    size={16}
                    className="
                      mt-0.5
                      shrink-0
                      text-emerald-300
                    "
                  />

                  <p
                    className="
                      text-xs
                      leading-5
                      text-emerald-200/70
                    "
                  >
                    {
                      transferMessage
                    }
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={
                  transferring ||
                  !reason.trim() ||
                  !destination.trim() ||
                  selectedEvidence.blockchainStatus !==
                    "Anchored" ||
                  destination
                    .trim()
                    .toLowerCase() ===
                    selectedEvidence.custodian
                      .trim()
                      .toLowerCase()
                }
                onClick={() =>
                  void submitTransfer()
                }
                className="
                  mt-5
                  flex
                  h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-white
                  text-sm
                  font-semibold
                  text-black
                  disabled:cursor-not-allowed
                  disabled:opacity-35
                "
              >
                {transferring ? (
                  <LoaderCircle
                    size={17}
                    className="
                      animate-spin
                    "
                  />
                ) : (
                  <ArrowLeftRight
                    size={17}
                  />
                )}

                {transferring
                  ? "Recording Transfer..."
                  : "Transfer Custody"}
              </button>
            </div>

            <div
              className="
                glass
                rounded-[28px]
                p-5
                md:p-6
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div>
                  <h3
                    className="
                      text-base
                      font-medium
                    "
                  >
                    Chain of Custody
                  </h3>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-white/25
                    "
                  >
                    Ordered custody
                    events for this
                    evidence.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    loadingHistory
                  }
                  onClick={() =>
                    selectedId &&
                    void loadHistory(
                      selectedId,
                    )
                  }
                  className="
                    flex
                    h-9
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-white/10
                    bg-white/[0.04]
                    px-3
                    text-xs
                    text-white/40
                    disabled:opacity-40
                  "
                >
                  <RefreshCw
                    size={13}
                    className={
                      loadingHistory
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>
              </div>

              {historyError && (
                <div
                  className="
                    mt-5
                  "
                >
                  <FormError
                    message={
                      historyError
                    }
                  />
                </div>
              )}

              {loadingHistory ? (
                <div
                  className="
                    flex
                    min-h-[220px]
                    items-center
                    justify-center
                  "
                >
                  <LoaderCircle
                    size={24}
                    className="
                      animate-spin
                      text-white/30
                    "
                  />
                </div>
              ) : custodyEvents.length ===
                0 ? (
                <div
                  className="
                    mt-5
                    rounded-[22px]
                    border
                    border-white/[0.06]
                    bg-white/[0.02]
                    p-6
                    text-center
                  "
                >
                  <Clock3
                    size={25}
                    className="
                      mx-auto
                      text-white/20
                    "
                  />

                  <p
                    className="
                      mt-4
                      text-sm
                      text-white/45
                    "
                  >
                    No custody events
                    yet
                  </p>
                </div>
              ) : (
                <div
                  className="
                    mt-6
                    space-y-4
                  "
                >
                  {custodyEvents.map(
                    (
                      event,
                      index,
                    ) => (
                      <CustodyTimelineItem
                        key={
                          event.id
                        }
                        event={
                          event
                        }
                        isLast={
                          index ===
                          custodyEvents.length -
                            1
                        }
                        retrying={
                          retryingEventId ===
                          event.id
                        }
                        onRetry={() =>
                          void retryCustodyEvent(
                            event.id,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CustodyTimelineItem({
  event,
  isLast,
  retrying,
  onRetry,
}: {
  event:
    CustodyEvent

  isLast:
    boolean

  retrying:
    boolean

  onRetry:
    () => void
}) {
  return (
    <div
      className="
        relative
        pl-10
      "
    >
      {!isLast && (
        <div
          className="
            absolute
            left-[14px]
            top-8
            h-[calc(100%_+_16px)]
            w-px
            bg-white/10
          "
        />
      )}

      <div
        className="
          absolute
          left-0
          top-1
          flex
          h-7
          w-7
          items-center
          justify-center
          rounded-full
          border
          border-white/10
          bg-[#151518]
        "
      >
        {event.blockchainStatus ===
        "Anchored" ? (
          <CheckCircle2
            size={13}
            className="
              text-emerald-300
            "
          />
        ) : event.blockchainStatus ===
          "Failed" ? (
          <CircleAlert
            size={13}
            className="
              text-red-300
            "
          />
        ) : (
          <Clock3
            size={13}
            className="
              text-amber-300
            "
          />
        )}
      </div>

      <div
        className="
          rounded-[22px]
          border
          border-white/[0.07]
          bg-white/[0.025]
          p-4
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-start
            sm:justify-between
          "
        >
          <div>
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <span
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.04]
                  px-2.5
                  py-1
                  text-[10px]
                  text-white/50
                "
              >
                #{event.sequence}
              </span>

              <span
                className="
                  text-sm
                  font-medium
                  text-white/70
                "
              >
                {formatAction(
                  event.action,
                )}
              </span>
            </div>

            <p
              className="
                mt-2
                text-xs
                text-white/25
              "
            >
              {formatDateTime(
                event.occurredAt,
              )}
            </p>
          </div>

          <BlockchainBadge
            status={
              event.blockchainStatus
            }
          />
        </div>

        {(event.fromCustodian ||
          event.toCustodian) && (
          <div
            className="
              mt-4
              flex
              flex-wrap
              items-center
              gap-2
              text-xs
            "
          >
            <span
              className="
                text-white/35
              "
            >
              {event.fromCustodian ||
                "TRACE-X"}
            </span>

            <ArrowRight
              size={13}
              className="
                text-white/20
              "
            />

            <span
              className="
                text-white/65
              "
            >
              {event.toCustodian ||
                "—"}
            </span>
          </div>
        )}

        <p
          className="
            mt-4
            text-sm
            leading-6
            text-white/35
          "
        >
          {
            event.reason
          }
        </p>

        <div
          className="
            mt-4
            rounded-[16px]
            border
            border-white/[0.05]
            bg-black/15
            p-3
          "
        >
          <p
            className="
              text-[9px]
              text-white/20
            "
          >
            EVENT DIGEST
          </p>

          <p
            className="
              mt-2
              break-all
              font-mono
              text-[9px]
              leading-4
              text-white/35
            "
          >
            {
              event.eventDigest
            }
          </p>
        </div>

        {event.blockchainBlockNumber !==
          null && (
          <p
            className="
              mt-3
              text-[10px]
              text-white/25
            "
          >
            Blockchain sequence{" "}
            {event.blockchainSequence ??
              "—"}
            {" • "}
            Block{" "}
            {
              event.blockchainBlockNumber
            }
          </p>
        )}

        {event.blockchainError && (
          <div
            className="
              mt-4
            "
          >
            <FormError
              message={
                event.blockchainError
              }
            />
          </div>
        )}

        {event.blockchainStatus ===
          "Failed" && (
          <button
            type="button"
            disabled={
              retrying
            }
            onClick={
              onRetry
            }
            className="
              mt-4
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-white
              px-4
              text-xs
              font-semibold
              text-black
              disabled:opacity-40
            "
          >
            {retrying ? (
              <LoaderCircle
                size={14}
                className="
                  animate-spin
                "
              />
            ) : (
              <RefreshCw
                size={14}
              />
            )}

            Retry Event Anchor
          </button>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   AUDIT LOG PAGE
========================================================= */

function AuditLogPage() {
  const [
    logs,
    setLogs,
  ] =
    useState<
      AuditLog[]
    >([])

  const [
    search,
    setSearch,
  ] =
    useState("")

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  async function loadAudit() {
    setLoading(
      true,
    )

    setError(
      null,
    )

    try {
      const response =
        await requestJson<
          ApiListResponse<AuditLog>
        >(
          "/api/audit?limit=200",
        )

      setLogs(
        response.data,
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
        ),
      )
    } finally {
      setLoading(
        false,
      )
    }
  }

  useEffect(() => {
    void loadAudit()
  }, [])

  const filtered =
    logs.filter(
      (log) => {
        const query =
          search
            .trim()
            .toLowerCase()

        if (!query) {
          return true
        }

        return (
          log.eventType
            .toLowerCase()
            .includes(
              query,
            ) ||
          log.actor
            .toLowerCase()
            .includes(
              query,
            ) ||
          (
            log.evidenceId ??
            ""
          )
            .toLowerCase()
            .includes(
              query,
            ) ||
          (
            log.caseId ??
            ""
          )
            .toLowerCase()
            .includes(
              query,
            )
        )
      },
    )

  return (
    <>
      <div
        className="
          mb-5
          flex
          flex-col
          gap-3
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <SearchBox
          value={
            search
          }
          onChange={
            setSearch
          }
          placeholder="Search event, actor, evidence or case..."
        />

        <button
          type="button"
          disabled={
            loading
          }
          onClick={() =>
            void loadAudit()
          }
          className="
            flex
            h-12
            items-center
            justify-center
            gap-2
            rounded-2xl
            border
            border-white/10
            bg-white/[0.05]
            px-5
            text-sm
            text-white/55
            disabled:opacity-40
          "
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      <div
        className="
          mb-5
          grid
          grid-cols-2
          gap-3
          lg:grid-cols-4
        "
      >
        <MiniStat
          label="Visible Events"
          value={
            filtered.length
          }
        />

        <MiniStat
          label="Transfers"
          value={
            logs.filter(
              (log) =>
                log.eventType ===
                "CUSTODY_TRANSFER_RECORDED",
            ).length
          }
        />

        <MiniStat
          label="Anchored Events"
          value={
            logs.filter(
              (log) =>
                log.eventType ===
                "CUSTODY_EVENT_ANCHORED",
            ).length
          }
        />

        <MiniStat
          label="Anchor Failures"
          value={
            logs.filter(
              (log) =>
                log.eventType ===
                "CUSTODY_EVENT_ANCHOR_FAILED",
            ).length
          }
        />
      </div>

      {error && (
        <div
          className="
            mb-5
          "
        >
          <FormError
            message={
              error
            }
          />
        </div>
      )}

      <div
        className="
          glass
          overflow-hidden
          rounded-[28px]
        "
      >
        <div
          className="
            border-b
            border-white/[0.07]
            p-5
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <Activity
              size={18}
              className="
                text-blue-300
              "
            />

            <div>
              <h3
                className="
                  text-sm
                  font-medium
                "
              >
                Append-only Activity
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                PostgreSQL audit
                records generated by
                TRACE-X custody
                operations.
              </p>
            </div>
          </div>
        </div>

        {loading &&
        logs.length === 0 ? (
          <div
            className="
              flex
              min-h-[300px]
              items-center
              justify-center
            "
          >
            <LoaderCircle
              size={25}
              className="
                animate-spin
                text-white/30
              "
            />
          </div>
        ) : filtered.length ===
          0 ? (
          <div
            className="
              flex
              min-h-[300px]
              items-center
              justify-center
              text-center
            "
          >
            <div>
              <Activity
                size={28}
                className="
                  mx-auto
                  text-white/20
                "
              />

              <p
                className="
                  mt-4
                  text-sm
                  text-white/40
                "
              >
                No audit records
                found.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {filtered.map(
              (log) => (
                <AuditLogRow
                  key={
                    log.id
                  }
                  log={
                    log
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </>
  )
}

function AuditLogRow({
  log,
}: {
  log:
    AuditLog
}) {
  const [
    expanded,
    setExpanded,
  ] =
    useState(false)

  return (
    <div
      className="
        border-b
        border-white/[0.05]
        p-5
        last:border-0
      "
    >
      <button
        type="button"
        onClick={() =>
          setExpanded(
            !expanded,
          )
        }
        className="
          w-full
          text-left
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div
            className="
              flex
              min-w-0
              gap-4
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-white/[0.04]
              "
            >
              <Activity
                size={16}
                className="
                  text-white/40
                "
              />
            </div>

            <div
              className="
                min-w-0
              "
            >
              <p
                className="
                  text-sm
                  font-medium
                  text-white/70
                "
              >
                {formatAuditEvent(
                  log.eventType,
                )}
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                Actor:{" "}
                {
                  log.actor
                }
              </p>
            </div>
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-4
            "
          >
            {log.evidenceId && (
              <MetaItem
                label="EVIDENCE"
                value={
                  log.evidenceId
                }
              />
            )}

            {log.caseId && (
              <MetaItem
                label="CASE"
                value={
                  log.caseId
                }
              />
            )}

            <MetaItem
              label="TIME"
              value={
                formatDateTime(
                  log.createdAt,
                )
              }
            />

            <ChevronRight
              size={16}
              className={`
                text-white/20
                transition

                ${
                  expanded
                    ? "rotate-90"
                    : ""
                }
              `}
            />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{
              opacity:
                0,

              height:
                0,
            }}
            animate={{
              opacity:
                1,

              height:
                "auto",
            }}
            exit={{
              opacity:
                0,

              height:
                0,
            }}
            className="
              overflow-hidden
            "
          >
            <div
              className="
                mt-4
                rounded-[20px]
                border
                border-white/[0.06]
                bg-black/15
                p-4
              "
            >
              <p
                className="
                  text-[10px]
                  text-white/20
                "
              >
                EVENT DETAILS
              </p>

              <pre
                className="
                  mt-3
                  overflow-x-auto
                  whitespace-pre-wrap
                  break-all
                  font-mono
                  text-[10px]
                  leading-5
                  text-white/40
                "
              >
                {JSON.stringify(
                  log.details,
                  null,
                  2,
                )}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =========================================================
   EVIDENCE DETAILS
========================================================= */

function EvidenceDetails({
  evidence,
  onClose,
  onRetryAnchor,
}: {
  evidence:
    EvidenceRecord

  onClose:
    () => void

  onRetryAnchor: (
    evidenceId:
      string,
  ) => Promise<EvidenceRecord>
}) {
  const [
    copied,
    setCopied,
  ] =
    useState(false)

  const [
    retrying,
    setRetrying,
  ] =
    useState(false)

  const [
    retryError,
    setRetryError,
  ] =
    useState<
      string | null
    >(null)

  async function copyHash() {
    try {
      await navigator
        .clipboard
        .writeText(
          evidence.hash,
        )

      setCopied(
        true,
      )

      window.setTimeout(
        () =>
          setCopied(
            false,
          ),
        1500,
      )
    } catch {
      setCopied(
        false,
      )
    }
  }

  async function retryAnchor() {
    setRetrying(
      true,
    )

    setRetryError(
      null,
    )

    try {
      await onRetryAnchor(
        evidence.id,
      )
    } catch (error) {
      setRetryError(
        getErrorMessage(
          error,
        ),
      )
    } finally {
      setRetrying(
        false,
      )
    }
  }

  return (
    <>
      <ModalBackdrop
        onClose={
          onClose
        }
      />

      <motion.aside
        initial={{
          x:
            "100%",
        }}
        animate={{
          x:
            0,
        }}
        exit={{
          x:
            "100%",
        }}
        transition={{
          type:
            "spring",

          stiffness:
            260,

          damping:
            30,
        }}
        className="
          glass
          fixed
          bottom-3
          right-3
          top-3
          z-[80]
          w-[calc(100%_-_24px)]
          max-w-[640px]
          overflow-y-auto
          rounded-[32px]
          p-6
          md:p-8
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              border
              border-white/10
              bg-white/[0.05]
            "
          >
            <EvidenceTypeIcon
              type={
                evidence.type
              }
            />
          </div>

          <CloseButton
            onClick={
              onClose
            }
          />
        </div>

        <div
          className="
            mt-7
          "
        >
          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <IntegrityBadge
              integrity={
                evidence.integrity
              }
            />

            <BlockchainBadge
              status={
                evidence.blockchainStatus
              }
            />
          </div>

          <p
            className="
              mt-5
              text-xs
              text-white/25
            "
          >
            {
              evidence.id
            }
          </p>

          <h2
            className="
              mt-2
              break-all
              text-3xl
              font-semibold
              tracking-[-0.04em]
            "
          >
            {
              evidence.name
            }
          </h2>

          <p
            className="
              mt-4
              text-sm
              leading-7
              text-white/35
            "
          >
            {
              evidence.description
            }
          </p>
        </div>

        <Divider />

        <div
          className="
            grid
            gap-3
            sm:grid-cols-2
          "
        >
          <DetailCard
            label="Case"
            value={
              evidence.caseId
            }
          />

          <DetailCard
            label="Custodian"
            value={
              evidence.custodian
            }
          />

          <DetailCard
            label="Type"
            value={
              evidence.type
            }
          />

          <DetailCard
            label="Size"
            value={
              formatBytes(
                evidence.size,
              )
            }
          />

          <DetailCard
            label="Status"
            value={
              evidence.status
            }
          />

          <DetailCard
            label="Created"
            value={
              evidence.createdAt
            }
          />
        </div>

        <div
          className="
            mt-7
          "
        >
          <p
            className="
              text-xs
              text-white/25
            "
          >
            SHA-256
          </p>

          <div
            className="
              mt-3
              rounded-[22px]
              border
              border-white/[0.07]
              bg-black/20
              p-4
            "
          >
            <div
              className="
                flex
                justify-end
              "
            >
              <button
                type="button"
                onClick={() =>
                  void copyHash()
                }
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  text-white/35
                "
              >
                <Copy
                  size={12}
                />

                {copied
                  ? "Copied"
                  : "Copy"}
              </button>
            </div>

            <p
              className="
                mt-3
                break-all
                font-mono
                text-[11px]
                leading-5
                text-white/45
              "
            >
              {
                evidence.hash
              }
            </p>
          </div>
        </div>

        <div
          className="
            mt-7
            rounded-[26px]
            border
            border-white/[0.07]
            bg-white/[0.025]
            p-5
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <Blocks
                size={18}
                className="
                  text-blue-300
                "
              />

              <div>
                <p
                  className="
                    text-sm
                    text-white/70
                  "
                >
                  Blockchain Anchor
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-white/25
                  "
                >
                  Smart-contract
                  evidence fingerprint
                </p>
              </div>
            </div>

            <BlockchainBadge
              status={
                evidence.blockchainStatus
              }
            />
          </div>

          <div
            className="
              mt-5
              grid
              gap-3
              sm:grid-cols-2
            "
          >
            <BlockchainField
              label="VERSION"
              value={
                evidence.blockchainVersion ===
                null
                  ? "—"
                  : String(
                      evidence.blockchainVersion,
                    )
              }
            />

            <BlockchainField
              label="BLOCK"
              value={
                evidence.blockchainBlockNumber ===
                null
                  ? "—"
                  : String(
                      evidence.blockchainBlockNumber,
                    )
              }
            />
          </div>

          {evidence.blockchainTransactionHash && (
            <LongValue
              label="TRANSACTION HASH"
              value={
                evidence.blockchainTransactionHash
              }
            />
          )}

          {evidence.blockchainEvidenceKey && (
            <LongValue
              label="EVIDENCE KEY"
              value={
                evidence.blockchainEvidenceKey
              }
            />
          )}

          {evidence.blockchainContractAddress && (
            <LongValue
              label="CONTRACT ADDRESS"
              value={
                evidence.blockchainContractAddress
              }
            />
          )}

          {evidence.blockchainError && (
            <div
              className="
                mt-4
              "
            >
              <FormError
                message={
                  evidence.blockchainError
                }
              />
            </div>
          )}

          {evidence.blockchainStatus ===
            "Failed" && (
            <button
              type="button"
              disabled={
                retrying
              }
              onClick={() =>
                void retryAnchor()
              }
              className="
                mt-5
                flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-white
                text-sm
                font-semibold
                text-black
                disabled:opacity-40
              "
            >
              {retrying ? (
                <LoaderCircle
                  size={16}
                  className="
                    animate-spin
                  "
                />
              ) : (
                <RefreshCw
                  size={16}
                />
              )}

              {retrying
                ? "Retrying..."
                : "Retry Blockchain Anchor"}
            </button>
          )}

          {retryError && (
            <div
              className="
                mt-4
              "
            >
              <FormError
                message={
                  retryError
                }
              />
            </div>
          )}
        </div>

        <div
          className="
            mt-7
          "
        >
          <p
            className="
              text-xs
              text-white/25
            "
          >
            VERSION HISTORY
          </p>

          <div
            className="
              mt-3
              space-y-3
            "
          >
            {evidence.versions.map(
              (version) => (
                <div
                  key={
                    version.version
                  }
                  className="
                    rounded-[20px]
                    border
                    border-white/[0.07]
                    bg-white/[0.025]
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      justify-between
                      gap-3
                    "
                  >
                    <p
                      className="
                        text-sm
                        text-white/60
                      "
                    >
                      Version{" "}
                      {
                        version.version
                      }
                    </p>

                    <p
                      className="
                        text-xs
                        text-white/25
                      "
                    >
                      {
                        version.createdAt
                      }
                    </p>
                  </div>

                  <p
                    className="
                      mt-2
                      text-xs
                      text-white/30
                    "
                  >
                    {
                      version.note
                    }
                  </p>

                  <p
                    className="
                      mt-3
                      truncate
                      font-mono
                      text-[10px]
                      text-white/20
                    "
                  >
                    {
                      version.hash
                    }
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </motion.aside>
    </>
  )
}

/* =========================================================
   VERIFY PAGE
========================================================= */

function VerifyPage({
  evidence,
  onVerify,
  onRetryAnchor,
}: {
  evidence:
    EvidenceRecord[]

  onVerify: (
    evidenceId:
      string,
  ) => Promise<VerifyEvidenceResponse>

  onRetryAnchor: (
    evidenceId:
      string,
  ) => Promise<EvidenceRecord>
}) {
  const [
    search,
    setSearch,
  ] =
    useState("")

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(null)

  const [
    verifying,
    setVerifying,
  ] =
    useState(false)

  const [
    retrying,
    setRetrying,
  ] =
    useState(false)

  const [
    result,
    setResult,
  ] =
    useState<
      VerifyEvidenceResponse | null
    >(null)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const filtered =
    evidence.filter(
      (item) => {
        const query =
          search
            .trim()
            .toLowerCase()

        return (
          item.name
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.id
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.caseId
            .toLowerCase()
            .includes(
              query,
            )
        )
      },
    )

  const selectedEvidence =
    evidence.find(
      (item) =>
        item.id ===
        selectedId,
    ) ??
    null

  async function verify() {
    if (
      !selectedId ||
      verifying
    ) {
      return
    }

    setVerifying(
      true,
    )

    setResult(
      null,
    )

    setError(
      null,
    )

    try {
      const verification =
        await onVerify(
          selectedId,
        )

      setResult(
        verification,
      )
    } catch (verifyError) {
      setError(
        getErrorMessage(
          verifyError,
        ),
      )
    } finally {
      setVerifying(
        false,
      )
    }
  }

  async function retryAnchor() {
    if (
      !selectedId ||
      retrying
    ) {
      return
    }

    setRetrying(
      true,
    )

    setError(
      null,
    )

    try {
      await onRetryAnchor(
        selectedId,
      )

      setResult(
        null,
      )
    } catch (retryError) {
      setError(
        getErrorMessage(
          retryError,
        ),
      )
    } finally {
      setRetrying(
        false,
      )
    }
  }

  return (
    <div
      className="
        grid
        grid-cols-1
        gap-4
        xl:grid-cols-[0.9fr_1.1fr]
      "
    >
      <div
        className="
          glass
          rounded-[28px]
          p-5
          md:p-6
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <ScanSearch
            size={20}
            className="
              text-blue-300
            "
          />

          <div>
            <h3
              className="
                text-base
                font-medium
              "
            >
              Select Evidence
            </h3>

            <p
              className="
                mt-1
                text-xs
                text-white/25
              "
            >
              Run file and
              blockchain checks.
            </p>
          </div>
        </div>

        <div
          className="
            mt-5
          "
        >
          <SearchBox
            value={
              search
            }
            onChange={
              setSearch
            }
            placeholder="Search evidence..."
          />
        </div>

        <div
          className="
            mt-5
            max-h-[600px]
            space-y-3
            overflow-y-auto
            pr-1
          "
        >
          {filtered.map(
            (item) => {
              const active =
                selectedId ===
                item.id

              return (
                <motion.button
                  type="button"
                  key={
                    item.id
                  }
                  whileTap={{
                    scale:
                      0.99,
                  }}
                  onClick={() => {
                    setSelectedId(
                      item.id,
                    )

                    setResult(
                      null,
                    )

                    setError(
                      null,
                    )
                  }}
                  className={`
                    w-full
                    rounded-[20px]
                    border
                    p-4
                    text-left
                    transition

                    ${
                      active
                        ? "border-blue-300/25 bg-blue-400/[0.07]"
                        : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]"
                    }
                  `}
                >
                  <p
                    className="
                      truncate
                      text-sm
                      text-white/70
                    "
                  >
                    {
                      item.name
                    }
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-white/25
                    "
                  >
                    {
                      item.id
                    }{" "}
                    •{" "}
                    {
                      item.caseId
                    }
                  </p>

                  <div
                    className="
                      mt-3
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    <IntegrityBadge
                      integrity={
                        item.integrity
                      }
                    />

                    <BlockchainBadge
                      status={
                        item.blockchainStatus
                      }
                    />
                  </div>
                </motion.button>
              )
            },
          )}
        </div>
      </div>

      <div
        className="
          glass
          rounded-[28px]
          p-5
          md:p-6
        "
      >
        {!selectedEvidence ? (
          <div
            className="
              flex
              min-h-[520px]
              items-center
              justify-center
              text-center
            "
          >
            <div>
              <Fingerprint
                size={36}
                className="
                  mx-auto
                  text-white/20
                "
              />

              <h3
                className="
                  mt-5
                  text-lg
                  font-medium
                "
              >
                Select evidence
              </h3>
            </div>
          </div>
        ) : (
          <>
            <div
              className="
                flex
                flex-col
                gap-4
                sm:flex-row
                sm:items-start
                sm:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    text-white/25
                  "
                >
                  {
                    selectedEvidence.id
                  }
                </p>

                <h3
                  className="
                    mt-2
                    break-all
                    text-xl
                    font-medium
                  "
                >
                  {
                    selectedEvidence.name
                  }
                </h3>

                <p
                  className="
                    mt-2
                    text-xs
                    text-white/25
                  "
                >
                  {
                    selectedEvidence.caseTitle
                  }
                </p>
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                "
              >
                <IntegrityBadge
                  integrity={
                    selectedEvidence.integrity
                  }
                />

                <BlockchainBadge
                  status={
                    selectedEvidence.blockchainStatus
                  }
                />
              </div>
            </div>

            <Divider />

            <LongValue
              label="POSTGRESQL SHA-256"
              value={
                selectedEvidence.hash
              }
            />

            {selectedEvidence.blockchainStatus ===
              "Failed" && (
              <button
                type="button"
                disabled={
                  retrying
                }
                onClick={() =>
                  void retryAnchor()
                }
                className="
                  mt-4
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  border
                  border-amber-400/15
                  bg-amber-400/[0.06]
                  text-sm
                  text-amber-100
                  disabled:opacity-40
                "
              >
                {retrying ? (
                  <LoaderCircle
                    size={16}
                    className="
                      animate-spin
                    "
                  />
                ) : (
                  <RefreshCw
                    size={16}
                  />
                )}

                Retry Blockchain Anchor
              </button>
            )}

            <motion.button
              type="button"
              disabled={
                verifying
              }
              whileTap={
                verifying
                  ? {}
                  : {
                      scale:
                        0.98,
                    }
              }
              onClick={() =>
                void verify()
              }
              className="
                mt-5
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-white
                text-sm
                font-semibold
                text-black
                disabled:opacity-40
              "
            >
              {verifying ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="
                      animate-spin
                    "
                  />

                  Running checks...
                </>
              ) : (
                <>
                  <ScanSearch
                    size={17}
                  />

                  Verify Evidence
                </>
              )}
            </motion.button>

            {error && (
              <div
                className="
                  mt-5
                "
              >
                <FormError
                  message={
                    error
                  }
                />
              </div>
            )}

            {result && (
              <DualVerificationResult
                result={
                  result
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   VERIFICATION RESULT
========================================================= */

function DualVerificationResult({
  result,
}: {
  result:
    VerifyEvidenceResponse
}) {
  return (
    <motion.div
      initial={{
        opacity:
          0,

        y:
          12,
      }}
      animate={{
        opacity:
          1,

        y:
          0,
      }}
      className="
        mt-6
        space-y-4
      "
    >
      <div
        className="
          rounded-[24px]
          border
          border-white/[0.07]
          bg-white/[0.025]
          p-5
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            {result.fileVerification
              .verified ? (
              <ShieldCheck
                size={22}
                className="
                  text-emerald-300
                "
              />
            ) : (
              <ShieldAlert
                size={22}
                className="
                  text-red-300
                "
              />
            )}

            <div>
              <p
                className="
                  text-sm
                  font-medium
                "
              >
                File Integrity
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                Stored file vs
                PostgreSQL
              </p>
            </div>
          </div>

          <ResultBadge
            verified={
              result.fileVerification
                .verified
            }
          />
        </div>

        <div
          className="
            mt-5
            space-y-4
          "
        >
          <HashResult
            label="DATABASE SHA-256"
            hash={
              result.fileVerification
                .databaseHash
            }
          />

          <HashResult
            label="CURRENT FILE SHA-256"
            hash={
              result.fileVerification
                .currentFileHash
            }
          />
        </div>
      </div>

      <div
        className="
          rounded-[24px]
          border
          border-white/[0.07]
          bg-white/[0.025]
          p-5
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <Blocks
              size={22}
              className="
                text-blue-300
              "
            />

            <div>
              <p
                className="
                  text-sm
                  font-medium
                "
              >
                Blockchain Integrity
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                Smart-contract
                comparison
              </p>
            </div>
          </div>

          <BlockchainBadge
            status={
              result.blockchain.status
            }
          />
        </div>

        {result.blockchain.checked ? (
          <div
            className="
              mt-5
              grid
              gap-3
              sm:grid-cols-2
            "
          >
            <VerificationCheckCard
              label="DATABASE HASH"
              verified={
                result.blockchain
                  .databaseHashVerified
              }
            />

            <VerificationCheckCard
              label="CURRENT FILE HASH"
              verified={
                result.blockchain
                  .currentFileHashVerified
              }
            />
          </div>
        ) : (
          <div
            className="
              mt-5
              rounded-[18px]
              border
              border-amber-400/10
              bg-amber-400/[0.04]
              p-4
            "
          >
            <p
              className="
                text-xs
                text-amber-100/60
              "
            >
              Blockchain verification
              was not completed.
            </p>
          </div>
        )}

        <div
          className="
            mt-5
            grid
            gap-3
            sm:grid-cols-2
          "
        >
          <BlockchainField
            label="VERSION"
            value={
              result.blockchain.version ===
              null
                ? "—"
                : String(
                    result.blockchain.version,
                  )
            }
          />

          <BlockchainField
            label="BLOCK"
            value={
              result.blockchain.blockNumber ===
              null
                ? "—"
                : String(
                    result.blockchain.blockNumber,
                  )
            }
          />
        </div>
      </div>

      <VerificationExplanation
        fileVerified={
          result.fileVerification
            .verified
        }
        databaseHashVerified={
          result.blockchain
            .databaseHashVerified
        }
        currentHashVerified={
          result.blockchain
            .currentFileHashVerified
        }
        blockchainChecked={
          result.blockchain.checked
        }
      />
    </motion.div>
  )
}

function VerificationExplanation({
  fileVerified,
  databaseHashVerified,
  currentHashVerified,
  blockchainChecked,
}: {
  fileVerified: boolean

  databaseHashVerified:
    boolean | null

  currentHashVerified:
    boolean | null

  blockchainChecked:
    boolean
}) {
  let message =
    "Blockchain verification is unavailable or this evidence is not anchored."

  if (
    blockchainChecked &&
    fileVerified &&
    databaseHashVerified &&
    currentHashVerified
  ) {
    message =
      "The stored file, PostgreSQL SHA-256 and blockchain anchor all agree."
  } else if (
    blockchainChecked &&
    !fileVerified &&
    databaseHashVerified &&
    !currentHashVerified
  ) {
    message =
      "The PostgreSQL hash still matches the blockchain anchor, but the stored evidence file has changed."
  } else if (
    blockchainChecked &&
    !fileVerified &&
    !databaseHashVerified &&
    currentHashVerified
  ) {
    message =
      "The current file matches the blockchain anchor, but the PostgreSQL hash has changed."
  } else if (
    blockchainChecked &&
    fileVerified &&
    !databaseHashVerified &&
    !currentHashVerified
  ) {
    message =
      "The file and PostgreSQL agree with each other, but they no longer match the original blockchain anchor."
  } else if (
    blockchainChecked
  ) {
    message =
      "One or more integrity checks failed. Review each comparison before relying on this evidence state."
  }

  return (
    <div
      className="
        rounded-[22px]
        border
        border-blue-400/10
        bg-blue-400/[0.035]
        p-4
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <Fingerprint
          size={17}
          className="
            mt-0.5
            shrink-0
            text-blue-300
          "
        />

        <p
          className="
            text-xs
            leading-5
            text-white/35
          "
        >
          {message}
        </p>
      </div>
    </div>
  )
}

function VerificationCheckCard({
  label,
  verified,
}: {
  label: string

  verified:
    boolean | null
}) {
  return (
    <div
      className="
        rounded-[18px]
        border
        border-white/[0.06]
        bg-black/15
        p-4
      "
    >
      <p
        className="
          text-[10px]
          text-white/20
        "
      >
        {label}
      </p>

      <div
        className="
          mt-3
          flex
          items-center
          gap-2
        "
      >
        {verified ===
        true ? (
          <>
            <CheckCircle2
              size={15}
              className="
                text-emerald-300
              "
            />

            <span
              className="
                text-xs
                text-emerald-200
              "
            >
              Matches blockchain
            </span>
          </>
        ) : verified ===
          false ? (
          <>
            <CircleAlert
              size={15}
              className="
                text-red-300
              "
            />

            <span
              className="
                text-xs
                text-red-200
              "
            >
              Mismatch
            </span>
          </>
        ) : (
          <>
            <Clock3
              size={15}
              className="
                text-white/30
              "
            />

            <span
              className="
                text-xs
                text-white/30
              "
            >
              Not checked
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function ResultBadge({
  verified,
}: {
  verified:
    boolean
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]

        ${
          verified
            ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200/70"
            : "border-red-400/15 bg-red-400/[0.06] text-red-200/75"
        }
      `}
    >
      {verified ? (
        <ShieldCheck
          size={11}
        />
      ) : (
        <ShieldAlert
          size={11}
        />
      )}

      {verified
        ? "Verified"
        : "Mismatch"}
    </span>
  )
}

function HashResult({
  label,
  hash,
}: {
  label: string
  hash: string
}) {
  return (
    <div>
      <p
        className="
          text-[10px]
          text-white/25
        "
      >
        {label}
      </p>

      <p
        className="
          mt-2
          break-all
          font-mono
          text-[10px]
          leading-5
          text-white/45
        "
      >
        {hash}
      </p>
    </div>
  )
}

/* =========================================================
   LOGIN
========================================================= */

function LoginScreen({
  showPassword,
  setShowPassword,
  onLogin,
}: {
  showPassword:
    boolean

  setShowPassword:
    (
      value:
        boolean,
    ) => void

  onLogin:
    () => void
}) {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#050506]
        text-white
      "
    >
      <AmbientBackground />

      <div
        className="
          relative
          z-10
          flex
          min-h-screen
          items-center
          justify-center
          px-5
        "
      >
        <motion.div
          initial={{
            opacity:
              0,

            y:
              25,
          }}
          animate={{
            opacity:
              1,

            y:
              0,
          }}
          className="
            glass
            w-full
            max-w-[440px]
            rounded-[34px]
            p-8
          "
        >
          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-[20px]
              border
              border-white/15
              bg-white/10
            "
          >
            <LockKeyhole
              size={23}
            />
          </div>

          <h1
            className="
              mt-7
              text-3xl
              font-semibold
              tracking-[-0.04em]
            "
          >
            Welcome to TRACE-X
          </h1>

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-white/35
            "
          >
            Blockchain-backed
            digital evidence
            integrity and
            chain-of-custody.
          </p>

          <form
            className="
              mt-8
              space-y-4
            "
            onSubmit={(
              event,
            ) => {
              event.preventDefault()

              onLogin()
            }}
          >
            <FormField
              label="Email"
            >
              <input
                type="email"
                className={
                  inputClass
                }
                placeholder="investigator@tracex.local"
              />
            </FormField>

            <FormField
              label="Password"
            >
              <div
                className="
                  relative
                "
              >
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className={`${inputClass} pr-16`}
                  placeholder="Password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword,
                    )
                  }
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-xs
                    text-white/35
                  "
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </FormField>

            <button
              type="submit"
              className="
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-white
                text-sm
                font-semibold
                text-black
              "
            >
              Continue

              <ArrowRight
                size={17}
              />
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  )
}

/* =========================================================
   SHARED UI
========================================================= */

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string

  onChange:
    (
      value:
        string,
    ) => void

  placeholder:
    string
}) {
  return (
    <div
      className="
        glass
        flex
        h-12
        w-full
        items-center
        gap-3
        rounded-2xl
        px-4
        md:max-w-[420px]
      "
    >
      <Search
        size={16}
        className="
          shrink-0
          text-white/30
        "
      />

      <input
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event
              .target
              .value,
          )
        }
        placeholder={
          placeholder
        }
        className="
          h-full
          w-full
          bg-transparent
          text-sm
          text-white
          outline-none
          placeholder:text-white/20
        "
      />
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
}: {
  children:
    ReactNode

  onClick:
    () => void
}) {
  return (
    <motion.button
      type="button"
      whileHover={{
        scale:
          1.02,
      }}
      whileTap={{
        scale:
          0.97,
      }}
      onClick={
        onClick
      }
      className="
        flex
        h-12
        items-center
        justify-center
        gap-2
        rounded-2xl
        bg-white
        px-5
        text-sm
        font-semibold
        text-black
      "
    >
      {children}
    </motion.button>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div
      className="
        glass
        rounded-[22px]
        p-4
      "
    >
      <p
        className="
          text-xl
          font-semibold
        "
      >
        {value}
      </p>

      <p
        className="
          mt-2
          text-xs
          text-white/30
        "
      >
        {label}
      </p>
    </div>
  )
}

function MetaItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p
        className="
          text-[10px]
          text-white/20
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          max-w-[180px]
          truncate
          text-xs
          text-white/50
        "
      >
        {value}
      </p>
    </div>
  )
}

function DetailCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      className="
        rounded-[20px]
        border
        border-white/[0.07]
        bg-white/[0.025]
        p-4
      "
    >
      <p
        className="
          text-[10px]
          text-white/25
        "
      >
        {label.toUpperCase()}
      </p>

      <p
        className="
          mt-3
          break-all
          text-sm
          text-white/60
        "
      >
        {value}
      </p>
    </div>
  )
}

function BlockchainField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      className="
        rounded-[18px]
        border
        border-white/[0.06]
        bg-black/15
        p-3
      "
    >
      <p
        className="
          text-[10px]
          text-white/20
        "
      >
        {label}
      </p>

      <p
        className="
          mt-2
          text-sm
          text-white/55
        "
      >
        {value}
      </p>
    </div>
  )
}

function LongValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      className="
        mt-4
      "
    >
      <p
        className="
          text-[10px]
          text-white/20
        "
      >
        {label}
      </p>

      <div
        className="
          mt-2
          rounded-[18px]
          border
          border-white/[0.06]
          bg-black/20
          p-3
        "
      >
        <p
          className="
            break-all
            font-mono
            text-[10px]
            leading-5
            text-white/40
          "
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function EvidenceTypeIcon({
  type,
}: {
  type:
    EvidenceType
}) {
  if (
    type ===
    "Disk Image"
  ) {
    return (
      <HardDrive
        size={19}
        className="
          text-white/50
        "
      />
    )
  }

  if (
    type ===
    "Network Capture"
  ) {
    return (
      <Activity
        size={19}
        className="
          text-white/50
        "
      />
    )
  }

  return (
    <FileText
      size={19}
      className="
        text-white/50
      "
    />
  )
}

function IntegrityBadge({
  integrity,
}: {
  integrity:
    EvidenceIntegrity
}) {
  const style =
    integrity ===
    "Verified"
      ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200/70"
      : integrity ===
        "Mismatch"
      ? "border-red-400/15 bg-red-400/[0.06] text-red-200/75"
      : "border-amber-400/15 bg-amber-400/[0.06] text-amber-200/70"

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        ${style}
      `}
    >
      {integrity ===
      "Verified" ? (
        <ShieldCheck
          size={11}
        />
      ) : integrity ===
        "Mismatch" ? (
        <CircleAlert
          size={11}
        />
      ) : (
        <Clock3
          size={11}
        />
      )}

      File {integrity}
    </span>
  )
}

function BlockchainBadge({
  status,
}: {
  status:
    BlockchainAnchorStatus
}) {
  const style =
    status ===
    "Anchored"
      ? "border-blue-400/15 bg-blue-400/[0.07] text-blue-200/75"
      : status ===
        "Failed"
      ? "border-red-400/15 bg-red-400/[0.06] text-red-200/75"
      : status ===
        "Pending"
      ? "border-amber-400/15 bg-amber-400/[0.06] text-amber-200/70"
      : "border-white/10 bg-white/[0.04] text-white/35"

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        ${style}
      `}
    >
      {status ===
      "Anchored" ? (
        <Link2
          size={11}
        />
      ) : status ===
        "Failed" ? (
        <CircleAlert
          size={11}
        />
      ) : status ===
        "Pending" ? (
        <Clock3
          size={11}
        />
      ) : (
        <Blocks
          size={11}
        />
      )}

      {status}
    </span>
  )
}

function PriorityBadge({
  priority,
}: {
  priority:
    CasePriority
}) {
  return (
    <span
      className="
        rounded-full
        border
        border-white/10
        bg-white/[0.04]
        px-2.5
        py-1
        text-[10px]
        text-white/45
      "
    >
      {priority}
    </span>
  )
}

function CaseStatusBadge({
  status,
}: {
  status:
    CaseStatus
}) {
  return (
    <span
      className="
        rounded-full
        border
        border-white/10
        bg-white/[0.04]
        px-2.5
        py-1
        text-[10px]
        text-white/40
      "
    >
      {status}
    </span>
  )
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div
      className="
        glass
        flex
        min-h-[280px]
        items-center
        justify-center
        rounded-[28px]
        text-center
      "
    >
      <div>
        <div
          className="
            mx-auto
            text-white/25
          "
        >
          {icon}
        </div>

        <h3
          className="
            mt-5
            text-lg
            font-medium
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-2
            text-sm
            text-white/30
          "
        >
          {description}
        </p>
      </div>
    </div>
  )
}

function InfoPanel({
  children,
}: {
  children:
    ReactNode
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-[22px]
        border
        border-white/[0.07]
        bg-white/[0.025]
        p-4
      "
    >
      {children}
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children:
    ReactNode
}) {
  return (
    <div>
      <label
        className="
          mb-2
          block
          px-1
          text-xs
          text-white/40
        "
      >
        {label}
      </label>

      {children}
    </div>
  )
}

function FormError({
  message,
}: {
  message: string
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-[18px]
        border
        border-red-400/15
        bg-red-400/[0.05]
        p-3
      "
    >
      <CircleAlert
        size={16}
        className="
          mt-0.5
          shrink-0
          text-red-300
        "
      />

      <p
        className="
          text-xs
          leading-5
          text-red-200/70
        "
      >
        {message}
      </p>
    </div>
  )
}

function ModalBackdrop({
  onClose,
}: {
  onClose:
    () => void
}) {
  return (
    <motion.div
      initial={{
        opacity:
          0,
      }}
      animate={{
        opacity:
          1,
      }}
      exit={{
        opacity:
          0,
      }}
      onClick={
        onClose
      }
      className="
        fixed
        inset-0
        z-[70]
        bg-black/65
        backdrop-blur-md
      "
    />
  )
}

function ModalCard({
  children,
  large = false,
}: {
  children:
    ReactNode

  large?:
    boolean
}) {
  return (
    <motion.div
      initial={{
        opacity:
          0,

        scale:
          0.95,

        y:
          20,
      }}
      animate={{
        opacity:
          1,

        scale:
          1,

        y:
          0,
      }}
      exit={{
        opacity:
          0,

        scale:
          0.96,
      }}
      className={`
        glass
        fixed
        left-1/2
        top-1/2
        z-[80]
        max-h-[calc(100vh_-_2rem)]
        w-[calc(100%_-_2rem)]
        -translate-x-1/2
        -translate-y-1/2
        overflow-y-auto
        rounded-[32px]
        p-6
        md:p-8

        ${
          large
            ? "max-w-[700px]"
            : "max-w-[520px]"
        }
      `}
    >
      {children}
    </motion.div>
  )
}

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string
  description: string
  onClose:
    () => void
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4
      "
    >
      <div>
        <p
          className="
            text-xs
            tracking-[0.15em]
            text-white/25
          "
        >
          TRACE-X
        </p>

        <h3
          className="
            mt-2
            text-2xl
            font-semibold
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-2
            max-w-xl
            text-sm
            leading-6
            text-white/30
          "
        >
          {description}
        </p>
      </div>

      <CloseButton
        onClick={
          onClose
        }
      />
    </div>
  )
}

function CloseButton({
  onClick,
}: {
  onClick:
    () => void
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        flex
        h-10
        w-10
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        border-white/10
        bg-white/[0.05]
        text-white/40
      "
    >
      <X
        size={17}
      />
    </button>
  )
}

function ModalActions({
  onCancel,
  onConfirm,
  disabled,
  busy,
  confirmText,
  busyText,
}: {
  onCancel:
    () => void

  onConfirm:
    () => void

  disabled:
    boolean

  busy:
    boolean

  confirmText:
    string

  busyText:
    string
}) {
  const unavailable =
    disabled ||
    busy

  return (
    <div
      className="
        mt-7
        flex
        justify-end
        gap-3
      "
    >
      <button
        type="button"
        disabled={
          busy
        }
        onClick={
          onCancel
        }
        className="
          h-11
          rounded-2xl
          px-5
          text-sm
          text-white/40
        "
      >
        Cancel
      </button>

      <button
        type="button"
        disabled={
          unavailable
        }
        onClick={
          onConfirm
        }
        className={`
          flex
          h-11
          items-center
          gap-2
          rounded-2xl
          px-5
          text-sm
          font-semibold

          ${
            unavailable
              ? "cursor-not-allowed bg-white/20 text-white/30"
              : "bg-white text-black"
          }
        `}
      >
        {busy && (
          <LoaderCircle
            size={16}
            className="
              animate-spin
            "
          />
        )}

        {busy
          ? busyText
          : confirmText}
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div
      className="
        my-6
        h-px
        bg-gradient-to-r
        from-transparent
        via-white/10
        to-transparent
      "
    />
  )
}

/* =========================================================
   BACKGROUND
========================================================= */

function AmbientBackground() {
  return (
    <div
      className="
        pointer-events-none
        fixed
        inset-0
        overflow-hidden
      "
    >
      <motion.div
        className="
          absolute
          left-[-15%]
          top-[-20%]
          h-[650px]
          w-[650px]
          rounded-full
          bg-blue-500/20
          blur-[150px]
        "
        animate={{
          x: [
            0,
            70,
            0,
          ],

          y: [
            0,
            40,
            0,
          ],
        }}
        transition={{
          duration:
            20,

          repeat:
            Infinity,
        }}
      />

      <motion.div
        className="
          absolute
          bottom-[-30%]
          right-[-15%]
          h-[720px]
          w-[720px]
          rounded-full
          bg-violet-500/20
          blur-[160px]
        "
        animate={{
          x: [
            0,
            -60,
            0,
          ],

          y: [
            0,
            -50,
            0,
          ],
        }}
        transition={{
          duration:
            24,

          repeat:
            Infinity,
        }}
      />
    </div>
  )
}

/* =========================================================
   API HELPER
========================================================= */

async function requestJson<T>(
  path: string,
  options:
    RequestInit = {},
): Promise<T> {
  const headers =
    new Headers(
      options.headers,
    )

  const isFormData =
    options.body instanceof
    FormData

  if (
    options.body &&
    !isFormData &&
    !headers.has(
      "Content-Type",
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    )
  }

  let response:
    Response

  try {
    response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,
          headers,
        },
      )
  } catch {
    throw new Error(
      "Could not reach the TRACE-X backend. Make sure npm run dev is running inside the server folder.",
    )
  }

  let data:
    unknown = null

  try {
    data =
      await response.json()
  } catch {
    data =
      null
  }

  if (
    !response.ok
  ) {
    const apiError =
      data as
        | ApiErrorResponse
        | null

    throw new Error(
      apiError?.message ||
        apiError?.blockchainError ||
        `TRACE-X API returned HTTP ${response.status}.`,
    )
  }

  return data as T
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

  return "An unexpected TRACE-X error occurred."
}

/* =========================================================
   HELPERS
========================================================= */

async function calculateSHA256(
  file: File,
) {
  const fileBuffer =
    await file.arrayBuffer()

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      fileBuffer,
    )

  return Array.from(
    new Uint8Array(
      digest,
    ),
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(
            2,
            "0",
          ),
    )
    .join("")
}

function detectEvidenceType(
  filename: string,
): EvidenceType {
  const extension =
    filename
      .split(".")
      .pop()
      ?.toLowerCase()

  if (
    extension ===
      "pcap" ||
    extension ===
      "pcapng"
  ) {
    return "Network Capture"
  }

  if (
    extension ===
      "dd" ||
    extension ===
      "img" ||
    extension ===
      "e01" ||
    extension ===
      "raw"
  ) {
    return "Disk Image"
  }

  if (
    extension ===
      "zip" ||
    extension ===
      "7z" ||
    extension ===
      "tar" ||
    extension ===
      "gz"
  ) {
    return "Log Archive"
  }

  if (
    extension ===
      "png" ||
    extension ===
      "jpg" ||
    extension ===
      "jpeg" ||
    extension ===
      "webp"
  ) {
    return "Image"
  }

  if (
    extension ===
      "mp4" ||
    extension ===
      "mov" ||
    extension ===
      "avi" ||
    extension ===
      "mkv"
  ) {
    return "Video"
  }

  if (
    extension ===
      "pdf" ||
    extension ===
      "txt" ||
    extension ===
      "doc" ||
    extension ===
      "docx" ||
    extension ===
      "eml" ||
    extension ===
      "csv" ||
    extension ===
      "json"
  ) {
    return "Document"
  }

  return "Other"
}

function formatBytes(
  bytes: number,
) {
  if (
    bytes === 0
  ) {
    return "0 B"
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ]

  const index =
    Math.min(
      Math.floor(
        Math.log(
          bytes,
        ) /
          Math.log(
            1024,
          ),
      ),

      units.length -
        1,
    )

  const value =
    bytes /
    1024 ** index

  return `${value.toFixed(
    index === 0
      ? 0
      : 1,
  )} ${units[index]}`
}

function formatDateTime(
  value: string,
) {
  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  )
}

function formatAction(
  action:
    CustodyAction,
) {
  return action
    .toLowerCase()
    .replace(
      /(^|\s)\S/g,
      (character) =>
        character.toUpperCase(),
    )
}

function formatAuditEvent(
  eventType: string,
) {
  return eventType
    .split("_")
    .map(
      (word) =>
        word.charAt(0) +
        word
          .slice(1)
          .toLowerCase(),
    )
    .join(" ")
}

/* =========================================================
   FORM STYLES
========================================================= */

const inputClass = `
  h-12
  w-full
  rounded-2xl
  border
  border-white/10
  bg-black/20
  px-4
  text-sm
  text-white
  outline-none
  placeholder:text-white/20
  transition
  focus:border-white/25
  focus:bg-white/[0.05]
`

const textareaClass = `
  w-full
  resize-none
  rounded-2xl
  border
  border-white/10
  bg-black/20
  px-4
  py-3
  text-sm
  leading-6
  text-white
  outline-none
  placeholder:text-white/20
  transition
  focus:border-white/25
  focus:bg-white/[0.05]
`

const selectClass = `
  h-12
  w-full
  rounded-2xl
  border
  border-white/10
  bg-[#151518]
  px-4
  text-sm
  text-white
  outline-none
`

export default App