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
  Moon,
  Plus,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UploadCloud,
  UserRound,
  WifiOff,
  X,
} from "lucide-react"

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000"

const AUTH_TOKEN_KEY =
  "tracex_auth_token"

const THEME_STORAGE_KEY =
  "tracex_theme"

const BROWSER_HASH_LIMIT =
  256 * 1024 * 1024

/* =========================================================
   THEME
========================================================= */

type Theme =
  | "dark"
  | "light"

function getInitialTheme():
  Theme {
  const storedTheme =
    localStorage.getItem(
      THEME_STORAGE_KEY,
    )

  if (
    storedTheme ===
      "dark" ||
    storedTheme ===
      "light"
  ) {
    return storedTheme
  }

  if (
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches
  ) {
    return "light"
  }

  return "dark"
}

/* =========================================================
   AUTHENTICATION TYPES
========================================================= */

type UserRole =
  | "Investigator"
  | "Forensic Analyst"
  | "Supervisor"
  | "Reviewer"
  | "Admin"

type AuthUser = {
  id: number
  email: string
  name: string
  role: UserRole
  active?: boolean
  createdAt?: string
  lastLoginAt?: string | null
}

type LoginResponse = {
  success: boolean
  message: string
  token: string
  tokenType: string
  expiresIn: string
  user: AuthUser
}

type MeResponse = {
  success: boolean
  user: AuthUser
}

/* =========================================================
   PERMISSIONS
========================================================= */

type Permission =
  | "createCase"
  | "uploadEvidence"
  | "transferCustody"
  | "verifyEvidence"
  | "retryBlockchain"
  | "viewAudit"

const ROLE_PERMISSIONS:
  Record<
    UserRole,
    Permission[]
  > = {
    Investigator: [
      "createCase",
      "uploadEvidence",
      "transferCustody",
      "verifyEvidence",
    ],

    "Forensic Analyst": [
      "uploadEvidence",
      "transferCustody",
      "verifyEvidence",
    ],

    Supervisor: [
      "createCase",
      "uploadEvidence",
      "transferCustody",
      "verifyEvidence",
      "retryBlockchain",
      "viewAudit",
    ],

    Reviewer: [
      "verifyEvidence",
      "viewAudit",
    ],

    Admin: [
      "createCase",
      "uploadEvidence",
      "transferCustody",
      "verifyEvidence",
      "retryBlockchain",
      "viewAudit",
    ],
  }

function hasPermission(
  role: UserRole,
  permission: Permission,
) {
  return ROLE_PERMISSIONS[
    role
  ].includes(
    permission,
  )
}

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

const pageInfo:
  Record<
    Page,
    {
      title: string
      description: string
    }
  > = {
    dashboard: {
      title:
        "Dashboard",

      description:
        "Overview of evidence integrity, blockchain anchoring and investigations.",
    },

    cases: {
      title:
        "Cases",

      description:
        "Manage investigations and associated digital evidence.",
    },

    evidence: {
      title:
        "Evidence",

      description:
        "Register, store and blockchain-anchor digital forensic evidence.",
    },

    transfers: {
      title:
        "Custody Transfers",

      description:
        "Transfer evidence custody and inspect its blockchain-backed chain of custody.",
    },

    verify: {
      title:
        "Integrity Verification",

      description:
        "Compare stored evidence against PostgreSQL and the blockchain anchor.",
    },

    audit: {
      title:
        "Audit Log",

      description:
        "Review append-only TRACE-X evidence and custody activity.",
    },
  }

/* =========================================================
   APPLICATION
========================================================= */

function App() {
  const [
    theme,
    setTheme,
  ] =
    useState<Theme>(
      getInitialTheme,
    )

  const [
    user,
    setUser,
  ] =
    useState<
      AuthUser | null
    >(null)

  const [
    authInitializing,
    setAuthInitializing,
  ] =
    useState(true)

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
     THEME
  ------------------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      theme,
    )

    document.documentElement.style
      .colorScheme =
      theme

    document.documentElement
      .dataset.theme =
      theme

    document.body.style
      .backgroundColor =
      theme ===
      "light"
        ? "#f4f4f5"
        : "#050506"
  }, [
    theme,
  ])

  function toggleTheme() {
    setTheme(
      (currentTheme) =>
        currentTheme ===
        "dark"
          ? "light"
          : "dark",
    )
  }

  /* -------------------------------------------------------
     RESTORE SESSION
  ------------------------------------------------------- */

  useEffect(() => {
    const token =
      sessionStorage.getItem(
        AUTH_TOKEN_KEY,
      )

    if (!token) {
      setAuthInitializing(
        false,
      )

      return
    }

    void requestJson<
      MeResponse
    >(
      "/api/auth/me",
    )
      .then(
        (response) => {
          setUser(
            response.user,
          )
        },
      )
      .catch(
        () => {
          sessionStorage
            .removeItem(
              AUTH_TOKEN_KEY,
            )

          setUser(
            null,
          )
        },
      )
      .finally(
        () => {
          setAuthInitializing(
            false,
          )
        },
      )
  }, [])

  /* -------------------------------------------------------
     AUTOMATIC LOGOUT WHEN JWT EXPIRES
  ------------------------------------------------------- */

  useEffect(() => {
    function handleExpiredSession() {
      sessionStorage
        .removeItem(
          AUTH_TOKEN_KEY,
        )

      setUser(
        null,
      )

      setCases(
        [],
      )

      setEvidence(
        [],
      )

      setActivePage(
        "dashboard",
      )

      setApiError(
        null,
      )
    }

    window.addEventListener(
      "tracex-auth-expired",
      handleExpiredSession,
    )

    return () => {
      window.removeEventListener(
        "tracex-auth-expired",
        handleExpiredSession,
      )
    }
  }, [])

  /* -------------------------------------------------------
     LOAD BACKEND DATA
  ------------------------------------------------------- */

  async function loadBackendData() {
    if (!user) {
      return
    }

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
    if (!user) {
      return
    }

    void loadBackendData()
  }, [
    user,
  ])

  /* -------------------------------------------------------
     LOGIN
  ------------------------------------------------------- */

  async function login(
    email: string,
    password: string,
  ) {
    const response =
      await requestJson<
        LoginResponse
      >(
        "/api/auth/login",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              email,
              password,
            }),
        },
      )

    sessionStorage.setItem(
      AUTH_TOKEN_KEY,
      response.token,
    )

    setUser(
      response.user,
    )

    setActivePage(
      "dashboard",
    )
  }

  /* -------------------------------------------------------
     LOGOUT
  ------------------------------------------------------- */

  async function logout() {
    try {
      if (
        sessionStorage.getItem(
          AUTH_TOKEN_KEY,
        )
      ) {
        await requestJson(
          "/api/auth/logout",
          {
            method:
              "POST",
          },
        )
      }
    } catch {
      // Logout remains valid client-side
      // even if the backend cannot be reached.
    } finally {
      sessionStorage
        .removeItem(
          AUTH_TOKEN_KEY,
        )

      setUser(
        null,
      )

      setCases(
        [],
      )

      setEvidence(
        [],
      )

      setApiError(
        null,
      )

      setActivePage(
        "dashboard",
      )
    }
  }

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
     RETRY EVIDENCE BLOCKCHAIN ANCHOR
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
     RETRY CUSTODY ANCHOR
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

  /* -------------------------------------------------------
     AUTH INITIALIZATION SCREEN
  ------------------------------------------------------- */

  if (
    authInitializing
  ) {
    return (
      <AuthLoadingScreen
        theme={
          theme
        }
        onToggleTheme={
          toggleTheme
        }
      />
    )
  }

  /* -------------------------------------------------------
     LOGIN SCREEN
  ------------------------------------------------------- */

  if (!user) {
    return (
      <LoginScreen
        theme={
          theme
        }
        onToggleTheme={
          toggleTheme
        }
        onLogin={
          login
        }
      />
    )
  }

  const canCreateCase =
    hasPermission(
      user.role,
      "createCase",
    )

  const canUploadEvidence =
    hasPermission(
      user.role,
      "uploadEvidence",
    )

  const canTransferCustody =
    hasPermission(
      user.role,
      "transferCustody",
    )

  const canVerifyEvidence =
    hasPermission(
      user.role,
      "verifyEvidence",
    )

  const canRetryBlockchain =
    hasPermission(
      user.role,
      "retryBlockchain",
    )

  const canViewAudit =
    hasPermission(
      user.role,
      "viewAudit",
    )

  return (
    <main
      className={`
        theme-${theme}
        apple-shell
        relative
        min-h-screen
        overflow-hidden
        bg-[#050506]
        text-white
        transition-colors
        duration-300
      `}
    >
      <ThemeOverrides />

      <AmbientBackground />

      {/* ===================================================
          DESKTOP SIDEBAR
      =================================================== */}

      <aside
        className="
          glass
          apple-sidebar
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
          user={
            user
          }
          activePage={
            activePage
          }
          setActivePage={
            setActivePage
          }
          onLogout={() =>
            void logout()
          }
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
                x:
                  -300,

                opacity:
                  0,
              }}
              animate={{
                x:
                  0,

                opacity:
                  1,
              }}
              exit={{
                x:
                  -300,

                opacity:
                  0,
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
                apple-sidebar
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
                user={
                  user
                }
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
                onLogout={() =>
                  void logout()
                }
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
            apple-toolbar
            flex
            min-h-[86px]
            items-center
            justify-between
            gap-4
            px-5
            py-3
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

            <ThemeToggle
              theme={
                theme
              }
              onToggle={
                toggleTheme
              }
              compact
            />

            <div
              className="
                glass
                flex
                items-center
                gap-3
                rounded-2xl
                px-3
                py-2
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/10
                  bg-white/[0.05]
                "
              >
                <UserRound
                  size={15}
                  className="
                    text-white/50
                  "
                />
              </div>

              <div
                className="
                  hidden
                  min-w-0
                  sm:block
                "
              >
                <p
                  className="
                    max-w-[170px]
                    truncate
                    text-xs
                    text-white/65
                  "
                >
                  {
                    user.name
                  }
                </p>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-white/25
                  "
                >
                  {
                    user.role
                  }
                </p>
              </div>
            </div>
          </div>
        </header>

        <div
          className="
            apple-content
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
                  user={
                    user
                  }
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
                  canCreate={
                    canCreateCase
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
                  user={
                    user
                  }
                  canUpload={
                    canUploadEvidence
                  }
                  canRetryBlockchain={
                    canRetryBlockchain
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
                  canTransfer={
                    canTransferCustody
                  }
                  canRetryBlockchain={
                    canRetryBlockchain
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
                  canVerify={
                    canVerifyEvidence
                  }
                  canRetryBlockchain={
                    canRetryBlockchain
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
                canViewAudit ? (
                  <AuditLogPage />
                ) : (
                  <AccessRestricted
                    role={
                      user.role
                    }
                    description="Your role does not have permission to view the append-only audit log."
                  />
                )
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}

/* =========================================================
   THEME OVERRIDES

   The original TRACE-X UI was designed dark-first.
   These scoped rules invert the neutral glass/text system
   while preserving blue, green, amber and red status colors.
========================================================= */

function ThemeOverrides() {
  return (
    <style>
      {`
        /* ---------------------------------------------------------
           TRACE-X Apple-inspired visual system
           Uses system typography, layered translucent materials,
           restrained depth, hairline borders and a single blue accent.
        --------------------------------------------------------- */

        :where(.theme-dark, .theme-light) {
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "SF Pro Text",
            "Helvetica Neue",
            Arial,
            sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        :where(.theme-dark, .theme-light) button,
        :where(.theme-dark, .theme-light) input,
        :where(.theme-dark, .theme-light) textarea,
        :where(.theme-dark, .theme-light) select {
          font: inherit;
          -webkit-tap-highlight-color: transparent;
        }

        :where(.theme-dark, .theme-light) button {
          transition:
            transform 160ms cubic-bezier(.2,.8,.2,1),
            background-color 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            color 180ms ease,
            opacity 180ms ease;
        }

        :where(.theme-dark, .theme-light) button:focus-visible,
        :where(.theme-dark, .theme-light) input:focus-visible,
        :where(.theme-dark, .theme-light) textarea:focus-visible,
        :where(.theme-dark, .theme-light) select:focus-visible {
          outline: 3px solid rgba(10, 132, 255, 0.28);
          outline-offset: 2px;
        }

        .theme-dark {
          background:
            radial-gradient(circle at 15% -10%, rgba(10, 132, 255, 0.12), transparent 30%),
            radial-gradient(circle at 90% 12%, rgba(94, 92, 230, 0.11), transparent 32%),
            linear-gradient(180deg, #09090b 0%, #050506 72%);
          color: #f5f5f7;
        }

        .theme-dark .glass {
          background:
            linear-gradient(
              145deg,
              rgba(39, 39, 44, 0.72),
              rgba(21, 21, 25, 0.56)
            ) !important;
          border: 1px solid rgba(255, 255, 255, 0.10) !important;
          box-shadow:
            0 26px 70px rgba(0, 0, 0, 0.28),
            0 8px 24px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            inset 0 -1px 0 rgba(255, 255, 255, 0.025) !important;
          backdrop-filter: blur(30px) saturate(165%) !important;
          -webkit-backdrop-filter: blur(30px) saturate(165%) !important;
        }

        .theme-light {
          background:
            radial-gradient(circle at 10% -10%, rgba(10, 132, 255, 0.10), transparent 30%),
            radial-gradient(circle at 90% 5%, rgba(175, 82, 222, 0.07), transparent 30%),
            linear-gradient(180deg, #f7f7f9 0%, #eef0f4 100%) !important;
          color: #1d1d1f !important;
        }

        .theme-light .glass {
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.82),
              rgba(248, 249, 252, 0.68)
            ) !important;
          border: 1px solid rgba(60, 60, 67, 0.12) !important;
          box-shadow:
            0 24px 60px rgba(50, 50, 93, 0.08),
            0 8px 22px rgba(50, 50, 93, 0.045),
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(60, 60, 67, 0.035) !important;
          backdrop-filter: blur(30px) saturate(170%) !important;
          -webkit-backdrop-filter: blur(30px) saturate(170%) !important;
        }

        .apple-sidebar {
          overflow: hidden;
        }

        .theme-dark .apple-sidebar {
          background:
            linear-gradient(
              155deg,
              rgba(36, 36, 42, 0.78),
              rgba(15, 15, 18, 0.68)
            ) !important;
          box-shadow:
            0 36px 90px rgba(0, 0, 0, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.11) !important;
        }

        .theme-light .apple-sidebar {
          background:
            linear-gradient(
              155deg,
              rgba(255, 255, 255, 0.90),
              rgba(246, 248, 252, 0.76)
            ) !important;
          box-shadow:
            0 28px 70px rgba(50, 50, 93, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
        }

        .theme-dark [class~="bg-[#050506]"] {
          background-color: transparent !important;
        }

        .theme-light [class~="bg-[#050506]"] {
          background-color: transparent !important;
        }

        .theme-light [class~="bg-[#151518]"] {
          background-color: rgba(255, 255, 255, 0.92) !important;
        }

        .theme-light [class~="text-white"] {
          color: #1d1d1f !important;
        }

        .theme-light [class~="text-white/20"] {
          color: rgba(60, 60, 67, 0.28) !important;
        }

        .theme-light [class~="text-white/25"] {
          color: rgba(60, 60, 67, 0.38) !important;
        }

        .theme-light [class~="text-white/30"] {
          color: rgba(60, 60, 67, 0.46) !important;
        }

        .theme-light [class~="text-white/35"] {
          color: rgba(60, 60, 67, 0.54) !important;
        }

        .theme-light [class~="text-white/40"] {
          color: rgba(60, 60, 67, 0.60) !important;
        }

        .theme-light [class~="text-white/45"] {
          color: rgba(60, 60, 67, 0.66) !important;
        }

        .theme-light [class~="text-white/50"] {
          color: rgba(60, 60, 67, 0.70) !important;
        }

        .theme-light [class~="text-white/55"] {
          color: rgba(60, 60, 67, 0.74) !important;
        }

        .theme-light [class~="text-white/60"] {
          color: rgba(60, 60, 67, 0.78) !important;
        }

        .theme-light [class~="text-white/65"] {
          color: rgba(29, 29, 31, 0.80) !important;
        }

        .theme-light [class~="text-white/70"] {
          color: rgba(29, 29, 31, 0.85) !important;
        }

        .theme-light [class~="text-white/80"] {
          color: rgba(29, 29, 31, 0.92) !important;
        }

        .theme-light [class~="bg-white/5"],
        .theme-light [class~="bg-white/[0.025]"],
        .theme-light [class~="bg-white/[0.04]"],
        .theme-light [class~="bg-white/[0.05]"],
        .theme-light [class~="bg-white/[0.08]"],
        .theme-light [class~="bg-white/10"],
        .theme-light [class~="bg-white/20"] {
          background-color: rgba(118, 118, 128, 0.075) !important;
        }

        .theme-light [class~="bg-black/15"],
        .theme-light [class~="bg-black/20"] {
          background-color: rgba(118, 118, 128, 0.075) !important;
        }

        .theme-light [class~="border-white/10"],
        .theme-light [class~="border-white/15"],
        .theme-light [class~="border-white/25"],
        .theme-light [class~="border-white/[0.05]"],
        .theme-light [class~="border-white/[0.06]"],
        .theme-light [class~="border-white/[0.07]"] {
          border-color: rgba(60, 60, 67, 0.13) !important;
        }

        .theme-light [class~="bg-white"] {
          background-color: #1d1d1f !important;
        }

        .theme-light [class~="text-black"] {
          color: #ffffff !important;
        }

        .theme-light [class~="text-blue-300"] {
          color: #0071e3 !important;
        }

        .theme-light [class~="text-blue-200/50"],
        .theme-light [class~="text-blue-200/55"],
        .theme-light [class~="text-blue-200/70"],
        .theme-light [class~="text-blue-200/75"] {
          color: rgba(0, 102, 204, 0.84) !important;
        }

        .theme-light [class~="text-emerald-300"] {
          color: #248a3d !important;
        }

        .theme-light [class~="text-emerald-200"],
        .theme-light [class~="text-emerald-200/55"],
        .theme-light [class~="text-emerald-200/70"] {
          color: rgba(36, 138, 61, 0.88) !important;
        }

        .theme-light [class~="text-amber-300"] {
          color: #c93400 !important;
        }

        .theme-light [class~="text-amber-100"],
        .theme-light [class~="text-amber-100/60"],
        .theme-light [class~="text-amber-200/70"] {
          color: rgba(179, 75, 0, 0.88) !important;
        }

        .theme-light [class~="text-red-300"] {
          color: #d70015 !important;
        }

        .theme-light [class~="text-red-200"],
        .theme-light [class~="text-red-200/70"],
        .theme-light [class~="text-red-200/75"] {
          color: rgba(190, 20, 35, 0.88) !important;
        }

        :where(.theme-dark, .theme-light) input,
        :where(.theme-dark, .theme-light) textarea,
        :where(.theme-dark, .theme-light) select {
          border-radius: 14px !important;
          transition:
            background-color 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .theme-dark input,
        .theme-dark textarea,
        .theme-dark select {
          background: rgba(118, 118, 128, 0.12) !important;
          border-color: rgba(255, 255, 255, 0.10) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.035),
            0 1px 0 rgba(0, 0, 0, 0.18) !important;
        }

        .theme-light input,
        .theme-light textarea,
        .theme-light select {
          color: #1d1d1f !important;
          background: rgba(255, 255, 255, 0.74) !important;
          border-color: rgba(60, 60, 67, 0.14) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            0 1px 2px rgba(50, 50, 93, 0.035) !important;
        }

        .theme-light input::placeholder,
        .theme-light textarea::placeholder {
          color: rgba(60, 60, 67, 0.38) !important;
        }

        .theme-dark input:focus,
        .theme-dark textarea:focus,
        .theme-dark select:focus {
          border-color: rgba(10, 132, 255, 0.48) !important;
          box-shadow:
            0 0 0 3px rgba(10, 132, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
        }

        .theme-light input:focus,
        .theme-light textarea:focus,
        .theme-light select:focus {
          border-color: rgba(0, 113, 227, 0.38) !important;
          background: rgba(255, 255, 255, 0.92) !important;
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.10) !important;
        }

        .theme-light option {
          color: #1d1d1f;
          background: #ffffff;
        }

        /* Apple-style blue primary actions */
        :where(.theme-dark, .theme-light) button[class~="bg-white"][class~="text-black"] {
          background:
            linear-gradient(180deg, #0a84ff 0%, #0071e3 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 14px !important;
          box-shadow:
            0 8px 20px rgba(0, 113, 227, 0.20),
            inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
        }

        :where(.theme-dark, .theme-light) button[class~="bg-white"][class~="text-black"]:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 11px 24px rgba(0, 113, 227, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
        }

        :where(.theme-dark, .theme-light) button[class~="bg-white"][class~="text-black"]:active:not(:disabled) {
          transform: translateY(0) scale(0.985);
        }

        :where(.theme-dark, .theme-light) button:disabled {
          filter: saturate(0.75);
        }

        /* Apple-like secondary material controls */
        :where(.theme-dark, .theme-light) button[class~="bg-white/[0.04]"],
        :where(.theme-dark, .theme-light) button[class~="bg-white/[0.05]"] {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
        }

        .theme-light [class~="bg-gradient-to-r"] {
          background-image:
            linear-gradient(
              to right,
              transparent,
              rgba(60, 60, 67, 0.12),
              transparent
            ) !important;
        }

        .theme-light [class~="bg-blue-500/20"] {
          background-color: rgba(10, 132, 255, 0.10) !important;
        }

        .theme-light [class~="bg-violet-500/20"] {
          background-color: rgba(175, 82, 222, 0.075) !important;
        }

        :where(.theme-dark, .theme-light) ::selection {
          background: rgba(10, 132, 255, 0.24);
        }

        .theme-light ::selection {
          color: #1d1d1f;
        }

        .theme-dark * {
          scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
          scrollbar-width: thin;
        }

        .theme-light * {
          scrollbar-color: rgba(60, 60, 67, 0.22) transparent;
          scrollbar-width: thin;
        }


        /* ---------------------------------------------------------
           Apple-inspired refinement pass
           Visual only: no application logic, API, RBAC or blockchain
           behavior is changed by these rules.
        --------------------------------------------------------- */

        .apple-shell {
          min-height: 100vh;
          letter-spacing: -0.01em;
        }

        .apple-content {
          width: 100%;
          max-width: 1640px;
          margin-inline: auto;
          padding-top: 18px;
        }

        .apple-toolbar {
          position: sticky;
          top: 12px;
          z-index: 35;
          min-height: 66px !important;
          margin: 12px 16px 0;
          padding: 10px 16px !important;
          border-radius: 22px;
          border: 1px solid transparent;
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          transition:
            background-color 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .theme-dark .apple-toolbar {
          background: rgba(28, 28, 30, 0.68);
          border-color: rgba(255, 255, 255, 0.09);
          box-shadow:
            0 16px 42px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .theme-light .apple-toolbar {
          background: rgba(250, 250, 252, 0.78);
          border-color: rgba(60, 60, 67, 0.10);
          box-shadow:
            0 14px 36px rgba(50, 50, 93, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.92);
        }

        .apple-toolbar h1 {
          font-size: 15px !important;
          font-weight: 600 !important;
          letter-spacing: -0.015em !important;
        }

        .apple-toolbar h1 + * {
          letter-spacing: normal;
        }

        .apple-content > div > div:first-child h2,
        .apple-content h2.text-3xl,
        .apple-content h2.text-4xl {
          font-weight: 650 !important;
          letter-spacing: -0.04em !important;
        }

        .apple-sidebar {
          width: 258px !important;
          border-radius: 28px !important;
          padding: 14px !important;
        }

        .apple-brand-row {
          border-radius: 18px;
        }

        .apple-brand-row > div:first-child {
          border-radius: 13px !important;
          background:
            linear-gradient(145deg, rgba(10, 132, 255, 0.22), rgba(94, 92, 230, 0.11)) !important;
          border-color: rgba(10, 132, 255, 0.24) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 7px 18px rgba(0, 113, 227, 0.11);
        }

        .theme-light .apple-brand-row > div:first-child {
          background:
            linear-gradient(145deg, rgba(0, 122, 255, 0.13), rgba(88, 86, 214, 0.075)) !important;
        }

        .apple-nav-item {
          height: 40px !important;
          border-radius: 12px !important;
          padding-inline: 12px !important;
          font-size: 13px !important;
          font-weight: 500;
          letter-spacing: -0.005em;
        }

        .apple-nav-item:hover {
          transform: translateX(1px);
        }

        .apple-nav-item > div.absolute.inset-0 {
          border-radius: 12px !important;
        }

        .theme-dark .apple-nav-item > div.absolute.inset-0 {
          background: rgba(10, 132, 255, 0.16) !important;
          border-color: rgba(10, 132, 255, 0.25) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            0 5px 16px rgba(0, 113, 227, 0.09) !important;
        }

        .theme-light .apple-nav-item > div.absolute.inset-0 {
          background: rgba(0, 122, 255, 0.105) !important;
          border-color: rgba(0, 122, 255, 0.15) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
        }

        .apple-user-card {
          border-radius: 16px !important;
          padding: 11px 12px !important;
        }

        .theme-dark .apple-user-card {
          background: rgba(118, 118, 128, 0.09) !important;
        }

        .theme-light .apple-user-card {
          background: rgba(118, 118, 128, 0.065) !important;
        }

        .apple-theme-toggle {
          position: relative;
          overflow: hidden;
          border-radius: 999px !important;
          min-width: 44px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 6px 16px rgba(0,0,0,0.06) !important;
        }

        .apple-theme-toggle:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .apple-login-card {
          max-width: 420px !important;
          border-radius: 30px !important;
          padding: 34px !important;
          text-align: left;
        }

        .theme-dark .apple-login-card {
          background:
            linear-gradient(155deg, rgba(35, 35, 39, 0.82), rgba(18, 18, 21, 0.72)) !important;
          box-shadow:
            0 42px 110px rgba(0, 0, 0, 0.40),
            0 14px 38px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.11) !important;
        }

        .theme-light .apple-login-card {
          background:
            linear-gradient(155deg, rgba(255, 255, 255, 0.91), rgba(248, 249, 252, 0.80)) !important;
          box-shadow:
            0 38px 100px rgba(50, 50, 93, 0.12),
            0 12px 30px rgba(50, 50, 93, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
        }

        .apple-login-mark {
          border-radius: 16px !important;
          background:
            linear-gradient(145deg, #0a84ff, #5e5ce6) !important;
          color: white !important;
          border-color: rgba(255,255,255,0.20) !important;
          box-shadow:
            0 12px 26px rgba(0, 113, 227, 0.23),
            inset 0 1px 0 rgba(255,255,255,0.28) !important;
        }

        .apple-login-card h1 {
          font-size: 30px !important;
          font-weight: 650 !important;
          letter-spacing: -0.045em !important;
        }

        /* More Apple-like card hierarchy across every page */
        :where(.theme-dark, .theme-light) .glass:not(.apple-sidebar):not(.apple-toolbar):not(.apple-theme-toggle):not(.apple-login-card) {
          border-radius: 22px;
        }

        .theme-dark .glass:not(.apple-sidebar):not(.apple-toolbar):not(.apple-login-card) {
          background:
            linear-gradient(145deg, rgba(31, 31, 35, 0.68), rgba(20, 20, 23, 0.56)) !important;
          border-color: rgba(255, 255, 255, 0.085) !important;
          box-shadow:
            0 18px 46px rgba(0,0,0,0.19),
            inset 0 1px 0 rgba(255,255,255,0.065) !important;
        }

        .theme-light .glass:not(.apple-sidebar):not(.apple-toolbar):not(.apple-login-card) {
          background:
            linear-gradient(145deg, rgba(255,255,255,0.84), rgba(250,250,252,0.70)) !important;
          border-color: rgba(60, 60, 67, 0.105) !important;
          box-shadow:
            0 16px 42px rgba(50,50,93,0.065),
            inset 0 1px 0 rgba(255,255,255,0.92) !important;
        }

        /* iOS/macOS-style grouped content blocks */
        :where(.theme-dark, .theme-light) [class~="rounded-[18px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[20px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[22px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[24px]"] {
          transition:
            background-color 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms cubic-bezier(.2,.8,.2,1);
        }

        :where(.theme-dark, .theme-light) button[class~="rounded-[20px]"]:hover:not(:disabled),
        :where(.theme-dark, .theme-light) button[class~="rounded-[22px]"]:hover:not(:disabled),
        :where(.theme-dark, .theme-light) button[class~="rounded-[26px]"]:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        /* Apple system-control proportions */
        :where(.theme-dark, .theme-light) input:not([type="checkbox"]):not([type="radio"]),
        :where(.theme-dark, .theme-light) select {
          min-height: 44px;
        }

        :where(.theme-dark, .theme-light) textarea {
          line-height: 1.45;
        }

        :where(.theme-dark, .theme-light) input,
        :where(.theme-dark, .theme-light) textarea,
        :where(.theme-dark, .theme-light) select {
          border-radius: 12px !important;
        }

        /* Primary buttons use Apple's familiar system blue */
        :where(.theme-dark, .theme-light) button[class~="bg-white"][class~="text-black"] {
          background: #007aff !important;
          border-color: rgba(255,255,255,0.14) !important;
          border-radius: 12px !important;
          box-shadow:
            0 8px 20px rgba(0,122,255,0.22),
            inset 0 1px 0 rgba(255,255,255,0.24) !important;
        }

        .theme-dark button[class~="bg-white"][class~="text-black"] {
          background: #0a84ff !important;
        }

        :where(.theme-dark, .theme-light) button[class~="bg-white"][class~="text-black"]:hover:not(:disabled) {
          filter: brightness(1.035);
          box-shadow:
            0 10px 24px rgba(0,122,255,0.25),
            inset 0 1px 0 rgba(255,255,255,0.26) !important;
        }

        /* ---------------------------------------------------------
           TRACE-X Liquid Glass 2.0
           More translucent materials, softer geometry, deeper blur,
           fog-reactive highlights and gentler hover motion.
        --------------------------------------------------------- */

        :where(.theme-dark, .theme-light) .glass {
          border-radius: 30px !important;
          transition:
            transform 360ms cubic-bezier(.16, 1, .3, 1),
            box-shadow 360ms cubic-bezier(.16, 1, .3, 1),
            border-color 300ms ease,
            background 420ms ease,
            backdrop-filter 420ms ease;
          will-change: transform, box-shadow;
        }

        .theme-dark .glass {
          background:
            radial-gradient(circle at 18% 0%, rgba(255,255,255,0.12), transparent 34%),
            radial-gradient(circle at 86% 110%, rgba(10,132,255,0.08), transparent 42%),
            linear-gradient(145deg, rgba(38,38,44,0.50), rgba(13,13,17,0.31)) !important;
          border-color: rgba(255,255,255,0.135) !important;
          box-shadow:
            0 30px 90px rgba(0,0,0,0.27),
            0 10px 34px rgba(0,0,0,0.14),
            inset 0 1px 0 rgba(255,255,255,0.17),
            inset 1px 0 0 rgba(255,255,255,0.045),
            inset 0 -1px 0 rgba(255,255,255,0.025) !important;
          backdrop-filter: blur(46px) saturate(185%) brightness(1.04) !important;
          -webkit-backdrop-filter: blur(46px) saturate(185%) brightness(1.04) !important;
        }

        .theme-light .glass {
          background:
            radial-gradient(circle at 14% 0%, rgba(255,255,255,0.92), transparent 36%),
            radial-gradient(circle at 88% 110%, rgba(0,122,255,0.075), transparent 45%),
            linear-gradient(145deg, rgba(255,255,255,0.62), rgba(244,247,252,0.42)) !important;
          border-color: rgba(255,255,255,0.72) !important;
          box-shadow:
            0 28px 82px rgba(50,50,93,0.10),
            0 9px 30px rgba(50,50,93,0.055),
            inset 0 1px 0 rgba(255,255,255,0.96),
            inset 1px 0 0 rgba(255,255,255,0.50),
            inset 0 -1px 0 rgba(60,60,67,0.045) !important;
          backdrop-filter: blur(48px) saturate(190%) brightness(1.035) !important;
          -webkit-backdrop-filter: blur(48px) saturate(190%) brightness(1.035) !important;
        }

        /* Major floating surfaces retain their position but gain depth. */
        :where(.theme-dark, .theme-light)
        .glass:not(.apple-sidebar):not(.apple-toolbar):not(.apple-login-card):not(.apple-theme-toggle):hover {
          transform: translateY(-3px) scale(1.002);
        }

        .theme-dark
        .glass:not(.apple-sidebar):not(.apple-toolbar):not(.apple-login-card):not(.apple-theme-toggle):hover {
          border-color: rgba(255,255,255,0.19) !important;
          box-shadow:
            0 38px 100px rgba(0,0,0,0.31),
            0 14px 38px rgba(0,0,0,0.17),
            inset 0 1px 0 rgba(255,255,255,0.20),
            inset 1px 0 0 rgba(255,255,255,0.06) !important;
        }

        .theme-light
        .glass:not(.apple-sidebar):not(.apple-toolbar):not(.apple-login-card):not(.apple-theme-toggle):hover {
          border-color: rgba(255,255,255,0.95) !important;
          box-shadow:
            0 36px 94px rgba(50,50,93,0.13),
            0 12px 34px rgba(50,50,93,0.07),
            inset 0 1px 0 rgba(255,255,255,1),
            inset 1px 0 0 rgba(255,255,255,0.72) !important;
        }

        /* Keep structural glass steady while still reacting to light. */
        .apple-sidebar,
        .apple-toolbar,
        .apple-login-card {
          border-radius: 34px !important;
          transform: none !important;
        }

        .theme-dark .apple-sidebar,
        .theme-dark .apple-toolbar,
        .theme-dark .apple-login-card {
          background:
            radial-gradient(circle at 12% 0%, rgba(255,255,255,0.12), transparent 34%),
            linear-gradient(150deg, rgba(38,38,45,0.54), rgba(12,12,16,0.35)) !important;
          border-color: rgba(255,255,255,0.14) !important;
          backdrop-filter: blur(52px) saturate(190%) !important;
          -webkit-backdrop-filter: blur(52px) saturate(190%) !important;
        }

        .theme-light .apple-sidebar,
        .theme-light .apple-toolbar,
        .theme-light .apple-login-card {
          background:
            radial-gradient(circle at 12% 0%, rgba(255,255,255,0.98), transparent 36%),
            linear-gradient(150deg, rgba(255,255,255,0.67), rgba(244,247,252,0.48)) !important;
          border-color: rgba(255,255,255,0.84) !important;
          backdrop-filter: blur(54px) saturate(195%) !important;
          -webkit-backdrop-filter: blur(54px) saturate(195%) !important;
        }

        /* Softer geometry everywhere: no hard rectangular controls. */
        :where(.theme-dark, .theme-light) button:not([class~="rounded-full"]),
        :where(.theme-dark, .theme-light) input:not([type="checkbox"]):not([type="radio"]),
        :where(.theme-dark, .theme-light) textarea,
        :where(.theme-dark, .theme-light) select {
          border-radius: 18px !important;
        }

        :where(.theme-dark, .theme-light) [class~="rounded-xl"],
        :where(.theme-dark, .theme-light) [class~="rounded-2xl"],
        :where(.theme-dark, .theme-light) [class~="rounded-[12px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[14px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[16px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[18px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[20px]"] {
          border-radius: 18px !important;
        }

        :where(.theme-dark, .theme-light) [class~="rounded-[22px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[24px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[26px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[28px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[30px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[32px]"],
        :where(.theme-dark, .theme-light) [class~="rounded-[34px]"] {
          border-radius: 26px !important;
        }

        :where(.theme-dark, .theme-light) [class~="rounded-full"] {
          border-radius: 9999px !important;
        }

        :where(.theme-dark, .theme-light) button[class~="bg-white"][class~="text-black"] {
          border-radius: 18px !important;
        }

        :where(.theme-dark, .theme-light) .apple-theme-toggle {
          border-radius: 9999px !important;
        }

        .apple-brand-row > div:first-child,
        .apple-login-mark,
        .apple-user-card,
        .apple-nav-item,
        .apple-nav-item > div.absolute.inset-0 {
          border-radius: 18px !important;
        }

        /* Hover motion is slower, softer and slightly luminous. */
        :where(.theme-dark, .theme-light) button:not(:disabled) {
          transition:
            transform 300ms cubic-bezier(.16, 1, .3, 1),
            filter 300ms ease,
            background-color 300ms ease,
            border-color 300ms ease,
            box-shadow 300ms cubic-bezier(.16, 1, .3, 1),
            color 250ms ease,
            opacity 250ms ease;
        }

        :where(.theme-dark, .theme-light) button:not(:disabled):hover {
          transform: translateY(-2px) scale(1.012);
        }

        :where(.theme-dark, .theme-light) button:not(:disabled):active {
          transform: translateY(0) scale(0.985);
          transition-duration: 110ms;
        }

        :where(.theme-dark, .theme-light) input,
        :where(.theme-dark, .theme-light) textarea,
        :where(.theme-dark, .theme-light) select {
          transition:
            transform 260ms cubic-bezier(.16, 1, .3, 1),
            background 300ms ease,
            border-color 300ms ease,
            box-shadow 300ms ease;
        }

        :where(.theme-dark, .theme-light) input:hover,
        :where(.theme-dark, .theme-light) textarea:hover,
        :where(.theme-dark, .theme-light) select:hover {
          transform: translateY(-1px);
        }

        /* Animated fog lives behind the glass so it visibly refracts through panels. */
        .fog-bank {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
          will-change: transform, opacity;
          filter: blur(82px);
          opacity: 0.42;
        }

        .theme-dark .fog-bank-one {
          background: radial-gradient(ellipse at center, rgba(10,132,255,0.34), rgba(10,132,255,0.05) 58%, transparent 74%);
        }

        .theme-dark .fog-bank-two {
          background: radial-gradient(ellipse at center, rgba(191,90,242,0.26), rgba(94,92,230,0.045) 58%, transparent 76%);
        }

        .theme-dark .fog-bank-three {
          background: radial-gradient(ellipse at center, rgba(100,210,255,0.20), rgba(48,176,199,0.035) 58%, transparent 76%);
        }

        .theme-light .fog-bank-one {
          background: radial-gradient(ellipse at center, rgba(0,122,255,0.18), rgba(0,122,255,0.025) 60%, transparent 76%);
        }

        .theme-light .fog-bank-two {
          background: radial-gradient(ellipse at center, rgba(175,82,222,0.13), rgba(88,86,214,0.022) 60%, transparent 76%);
        }

        .theme-light .fog-bank-three {
          background: radial-gradient(ellipse at center, rgba(90,200,250,0.14), rgba(50,173,230,0.02) 60%, transparent 76%);
        }

        .fog-vignette {
          position: absolute;
          inset: -12%;
          pointer-events: none;
          border-radius: 9999px;
          background:
            radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.08) 100%);
          opacity: 0.42;
        }

        .theme-light .fog-vignette {
          opacity: 0.12;
        }

        /* System-like separators and labels */
        :where(.theme-dark, .theme-light) label {
          font-weight: 500;
          letter-spacing: -0.005em;
        }

        :where(.theme-dark, .theme-light) [class~="font-mono"] {
          font-family:
            "SFMono-Regular",
            ui-monospace,
            Menlo,
            Monaco,
            Consolas,
            monospace !important;
          letter-spacing: -0.01em;
        }

        @media (min-width: 1024px) {
          .apple-content {
            padding-left: 22px !important;
            padding-right: 28px !important;
          }

          .apple-toolbar {
            margin-left: 22px;
            margin-right: 28px;
          }
        }

        @media (max-width: 1023px) {
          .apple-toolbar {
            top: 8px;
            margin: 8px 10px 0;
            border-radius: 18px;
          }

          .apple-content {
            padding-top: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          :where(.theme-dark, .theme-light) *,
          :where(.theme-dark, .theme-light) *::before,
          :where(.theme-dark, .theme-light) *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}
    </style>
  )
}

/* =========================================================
   THEME TOGGLE
========================================================= */

function ThemeToggle({
  theme,
  onToggle,
  compact = false,
}: {
  theme:
    Theme

  onToggle:
    () => void

  compact?:
    boolean
}) {
  const switchingTo =
    theme ===
    "dark"
      ? "light"
      : "dark"

  return (
    <motion.button
      type="button"
      whileTap={{
        scale:
          0.92,
      }}
      onClick={
        onToggle
      }
      aria-label={`Switch to ${switchingTo} theme`}
      title={`Switch to ${switchingTo} theme`}
      className={`
        glass
        apple-theme-toggle
        flex
        h-11
        items-center
        justify-center
        gap-2
        rounded-2xl
        transition

        ${
          compact
            ? "w-11"
            : "px-4"
        }
      `}
    >
      <AnimatePresence
        mode="wait"
        initial={false}
      >
        <motion.span
          key={
            theme
          }
          initial={{
            opacity:
              0,

            rotate:
              -45,

            scale:
              0.8,
          }}
          animate={{
            opacity:
              1,

            rotate:
              0,

            scale:
              1,
          }}
          exit={{
            opacity:
              0,

            rotate:
              45,

            scale:
              0.8,
          }}
          transition={{
            duration:
              0.18,
          }}
          className="
            flex
            items-center
            justify-center
          "
        >
          {theme ===
          "dark" ? (
            <Sun
              size={17}
              className="
                text-amber-300
              "
            />
          ) : (
            <Moon
              size={17}
              className="
                text-blue-300
              "
            />
          )}
        </motion.span>
      </AnimatePresence>

      {!compact && (
        <span
          className="
            text-xs
            text-white/50
          "
        >
          {theme ===
          "dark"
            ? "Light"
            : "Dark"}
        </span>
      )}
    </motion.button>
  )
}

/* =========================================================
   AUTH LOADING SCREEN
========================================================= */

function AuthLoadingScreen({
  theme,
  onToggleTheme,
}: {
  theme:
    Theme

  onToggleTheme:
    () => void
}) {
  return (
    <main
      className={`
        theme-${theme}
        apple-shell
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-[#050506]
        text-white
        transition-colors
        duration-300
      `}
    >
      <ThemeOverrides />

      <AmbientBackground />

      <div
        className="
          fixed
          right-5
          top-5
          z-20
        "
      >
        <ThemeToggle
          theme={
            theme
          }
          onToggle={
            onToggleTheme
          }
        />
      </div>

      <div
        className="
          relative
          z-10
          text-center
        "
      >
        <LoaderCircle
          size={30}
          className="
            mx-auto
            animate-spin
            text-white/40
          "
        />

        <p
          className="
            mt-4
            text-sm
            text-white/35
          "
        >
          Restoring secure
          TRACE-X session...
        </p>
      </div>
    </main>
  )
}

/* =========================================================
   SIDEBAR
========================================================= */

function SidebarContent({
  user,
  activePage,
  setActivePage,
  onLogout,
}: {
  user:
    AuthUser

  activePage:
    Page

  setActivePage:
    (page: Page) => void

  onLogout:
    () => void
}) {
  const visibleNavigation =
    navigation.filter(
      (item) =>
        item.id !==
          "audit" ||
        hasPermission(
          user.role,
          "viewAudit",
        ),
    )

  return (
    <>
      <div
        className="
          apple-brand-row
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
        {visibleNavigation.map(
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
                  apple-nav-item
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
                      ? "text-blue-300"
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
                      border-blue-300/20
                      bg-blue-400/[0.10]
                      shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
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
          apple-user-card
          mb-3
          rounded-2xl
          border
          border-white/[0.07]
          bg-white/[0.025]
          p-3
        "
      >
        <p
          className="
            truncate
            text-xs
            text-white/60
          "
        >
          {
            user.name
          }
        </p>

        <p
          className="
            mt-1
            text-[10px]
            text-blue-200/50
          "
        >
          {
            user.role
          }
        </p>

        <p
          className="
            mt-2
            truncate
            text-[10px]
            text-white/20
          "
        >
          {
            user.email
          }
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
  user,
  cases,
  evidence,
}: {
  user:
    AuthUser

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
          mb-4
          rounded-[24px]
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
          <ShieldCheck
            size={18}
            className="
              mt-0.5
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
              Signed in as{" "}
              <span
                className="
                  text-white
                "
              >
                {
                  user.name
                }
              </span>
            </p>

            <p
              className="
                mt-1
                text-xs
                text-white/30
              "
            >
              Role:{" "}
              {
                user.role
              }
            </p>
          </div>
        </div>
      </div>

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
            TRACE-X Security
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-white/30
            "
          >
            Authenticated access,
            role-based authorization
            and blockchain-backed
            evidence integrity.
          </p>

          <div
            className="
              mt-6
              space-y-3
            "
          >
            <StorageRow
              label="Authentication"
              value="JWT"
            />

            <StorageRow
              label="Authorization"
              value="RBAC"
            />

            <StorageRow
              label="Evidence"
              value="Off-chain"
            />

            <StorageRow
              label="Integrity"
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
        y:
          -3,
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
  canCreate,
  onCreateCase,
}: {
  cases:
    InvestigationCase[]

  canCreate:
    boolean

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
      creating ||
      !canCreate
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

        {canCreate ? (
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
        ) : (
          <ReadOnlyBadge />
        )}
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
        {createOpen &&
          canCreate && (
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
  user,
  canUpload,
  canRetryBlockchain,
  onUploadEvidence,
  onRetryAnchor,
}: {
  evidence:
    EvidenceRecord[]

  cases:
    InvestigationCase[]

  user:
    AuthUser

  canUpload:
    boolean

  canRetryBlockchain:
    boolean

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
      user.name,
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
    if (!selected) {
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
      user.name,
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
      uploading ||
      !canUpload
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

        {canUpload ? (
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
        ) : (
          <ReadOnlyBadge />
        )}
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
                y:
                  -2,
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
            canRetryBlockchain={
              canRetryBlockchain
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
        {registerOpen &&
          canUpload && (
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
                    <input
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
                        inputClass
                      }
                    />
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

const CUSTODIAN_OPTIONS = [
  "Investigator A",
  "Investigator B",
  "Investigator C",
  "Forensic Analyst A",
  "Forensic Analyst B",
  "Supervisor A",
  "Evidence Reviewer A",
] as const

function TransfersPage({
  evidence,
  canTransfer,
  canRetryBlockchain,
  onTransfer,
  onRetryCustodyAnchor,
}: {
  evidence:
    EvidenceRecord[]

  canTransfer:
    boolean

  canRetryBlockchain:
    boolean

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
    pickerOpen,
    setPickerOpen,
  ] =
    useState(false)

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
      evidence.length ===
        0
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

  useEffect(() => {
    if (
      !selectedEvidence
    ) {
      return
    }

    const current =
      selectedEvidence.custodian
        .trim()
        .toLowerCase()

    if (
      destination
        .trim()
        .toLowerCase() !==
      current
    ) {
      return
    }

    const alternative =
      CUSTODIAN_OPTIONS.find(
        (option) =>
          option
            .toLowerCase() !==
          current,
      )

    if (
      alternative
    ) {
      setDestination(
        alternative,
      )
    }
  }, [
    selectedEvidence?.custodian,
    destination,
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

        if (
          !query
        ) {
          return true
        }

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
            ) ||
          item.caseTitle
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

  function selectEvidence(
    evidenceId:
      string,
  ) {
    setSelectedId(
      evidenceId,
    )

    setPickerOpen(
      false,
    )

    setSearch(
      "",
    )

    setReason(
      "",
    )

    setTransferError(
      null,
    )

    setTransferMessage(
      null,
    )
  }

  async function submitTransfer() {
    if (
      !selectedEvidence ||
      !destination.trim() ||
      !reason.trim() ||
      transferring ||
      !canTransfer
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
    if (
      !canRetryBlockchain
    ) {
      return
    }

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

  if (
    evidence.length ===
    0
  ) {
    return (
      <EmptyState
        title="No evidence available"
        description="Register evidence before creating or reviewing custody transfers."
        icon={
          <ArrowLeftRight
            size={28}
          />
        }
      />
    )
  }

  const unresolvedEvents =
    custodyEvents.filter(
      (event) =>
        event.blockchainStatus !==
        "Anchored",
    )

  const failedEvents =
    unresolvedEvents.filter(
      (event) =>
        event.blockchainStatus ===
        "Failed",
    )

  const anchoredEvents =
    custodyEvents.filter(
      (event) =>
        event.blockchainStatus ===
        "Anchored",
    ).length

  const latestCustodyBlock =
    custodyEvents.reduce<
      number | null
    >(
      (
        latest,
        event,
      ) => {
        if (
          event.blockchainBlockNumber ===
          null
        ) {
          return latest
        }

        if (
          latest ===
            null ||
          event.blockchainBlockNumber >
            latest
        ) {
          return event.blockchainBlockNumber
        }

        return latest
      },
      null,
    )

  const latestBlock =
    latestCustodyBlock ??
    selectedEvidence
      ?.blockchainBlockNumber ??
    null

  const chainState =
    !selectedEvidence
      ? "No selection"
      : selectedEvidence.blockchainStatus !==
        "Anchored"
      ? selectedEvidence.blockchainStatus
      : failedEvents.length >
        0
      ? "Attention"
      : unresolvedEvents.length >
        0
      ? "Pending"
      : custodyEvents.length >
        0
      ? "Healthy"
      : "Ready"

  const chainStateDetail =
    !selectedEvidence
      ? "Choose evidence"
      : selectedEvidence.blockchainStatus !==
        "Anchored"
      ? "Evidence anchor needs attention"
      : failedEvents.length >
        0
      ? `${failedEvents.length} failed custody anchor${
          failedEvents.length ===
          1
            ? ""
            : "s"
        }`
      : unresolvedEvents.length >
        0
      ? `${unresolvedEvents.length} custody event${
          unresolvedEvents.length ===
          1
            ? ""
            : "s"
        } awaiting anchor`
      : custodyEvents.length >
        0
      ? `${anchoredEvents} of ${custodyEvents.length} events anchored`
      : "Evidence anchor is healthy"

  const transferReady =
    Boolean(
      selectedEvidence,
    ) &&
    selectedEvidence
      ?.blockchainStatus ===
      "Anchored" &&
    unresolvedEvents.length ===
      0 &&
    !loadingHistory &&
    !historyError

  const sameDestination =
    Boolean(
      selectedEvidence,
    ) &&
    destination
      .trim()
      .toLowerCase() ===
      selectedEvidence
        ?.custodian
        .trim()
        .toLowerCase()

  return (
    <div
      className="
        space-y-4
      "
    >
      {/* ===================================================
          EVIDENCE WORKSPACE HEADER
      =================================================== */}

      <div
        className="
          glass
          overflow-hidden
          rounded-[30px]
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            border-b
            border-white/[0.07]
            p-5
            md:flex-row
            md:items-center
            md:justify-between
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
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-blue-400/15
                bg-blue-400/[0.07]
              "
            >
              <ArrowLeftRight
                size={19}
                className="
                  text-blue-300
                "
              />
            </div>

            <div>
              <h3
                className="
                  text-sm
                  font-medium
                "
              >
                Custody Workspace
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/30
                "
              >
                Review the evidence handoff
                trail and record the next
                authorized transfer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setPickerOpen(
                !pickerOpen,
              )
            }
            className="
              flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-white/10
              bg-white/[0.04]
              px-4
              text-xs
              font-medium
              text-white/55
              transition
              hover:bg-white/[0.07]
            "
          >
            <Search
              size={14}
            />

            {pickerOpen
              ? "Close evidence picker"
              : "Change evidence"}
          </button>
        </div>

        {selectedEvidence && (
          <div
            className="
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
                lg:justify-between
              "
            >
              <div
                className="
                  flex
                  min-w-0
                  items-start
                  gap-4
                "
              >
                <div
                  className="
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-[20px]
                    border
                    border-white/10
                    bg-white/[0.05]
                  "
                >
                  <EvidenceTypeIcon
                    type={
                      selectedEvidence.type
                    }
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
                        max-w-[720px]
                        truncate
                        text-xl
                        font-semibold
                        tracking-[-0.02em]
                        text-white/85
                      "
                    >
                      {
                        selectedEvidence.name
                      }
                    </h3>

                    <BlockchainBadge
                      status={
                        selectedEvidence.blockchainStatus
                      }
                    />
                  </div>

                  <div
                    className="
                      mt-2
                      flex
                      flex-wrap
                      items-center
                      gap-x-3
                      gap-y-1
                      text-xs
                      text-white/30
                    "
                  >
                    <span>
                      {
                        selectedEvidence.id
                      }
                    </span>

                    <span
                      className="
                        text-white/15
                      "
                    >
                      •
                    </span>

                    <span>
                      {
                        selectedEvidence.caseId
                      }
                    </span>

                    <span
                      className="
                        text-white/15
                      "
                    >
                      •
                    </span>

                    <span
                      className="
                        truncate
                      "
                    >
                      {
                        selectedEvidence.caseTitle
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                  lg:justify-end
                "
              >
                <span
                  className="
                    rounded-full
                    border
                    border-white/10
                    bg-white/[0.04]
                    px-3
                    py-1.5
                    text-[10px]
                    text-white/45
                  "
                >
                  {
                    selectedEvidence.type
                  }
                </span>

                <IntegrityBadge
                  integrity={
                    selectedEvidence.integrity
                  }
                />
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {pickerOpen && (
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
                border-t
                border-white/[0.07]
              "
            >
              <div
                className="
                  p-5
                  md:p-6
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-full
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-white/10
                    bg-black/15
                    px-4
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
                      search
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event
                          .target
                          .value,
                      )
                    }
                    autoFocus
                    placeholder="Search by evidence name, ID, case or custodian..."
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

                <div
                  className="
                    mt-4
                    max-h-[320px]
                    overflow-y-auto
                    pr-1
                  "
                >
                  {filtered.length ===
                  0 ? (
                    <div
                      className="
                        rounded-[20px]
                        border
                        border-white/[0.06]
                        bg-white/[0.02]
                        p-6
                        text-center
                      "
                    >
                      <Search
                        size={22}
                        className="
                          mx-auto
                          text-white/20
                        "
                      />

                      <p
                        className="
                          mt-3
                          text-sm
                          text-white/40
                        "
                      >
                        No matching evidence
                      </p>
                    </div>
                  ) : (
                    <div
                      className="
                        grid
                        gap-3
                        lg:grid-cols-2
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
                              onClick={() =>
                                selectEvidence(
                                  item.id,
                                )
                              }
                              className={`
                                rounded-[20px]
                                border
                                p-4
                                text-left
                                transition

                                ${
                                  active
                                    ? "border-blue-300/30 bg-blue-400/[0.08]"
                                    : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]"
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
                                      font-medium
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
                                      text-[10px]
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
                                </div>

                                <BlockchainBadge
                                  status={
                                    item.blockchainStatus
                                  }
                                />
                              </div>

                              <div
                                className="
                                  mt-4
                                  flex
                                  items-center
                                  justify-between
                                  gap-3
                                "
                              >
                                <p
                                  className="
                                    truncate
                                    text-xs
                                    text-white/35
                                  "
                                >
                                  Custodian:{" "}
                                  <span
                                    className="
                                      text-white/60
                                    "
                                  >
                                    {
                                      item.custodian
                                    }
                                  </span>
                                </p>

                                {active && (
                                  <CheckCircle2
                                    size={15}
                                    className="
                                      shrink-0
                                      text-blue-300
                                    "
                                  />
                                )}
                              </div>
                            </motion.button>
                          )
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedEvidence && (
        <>
          {/* =================================================
              SUMMARY STRIP
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            <CustodySummaryCard
              label="Current Custodian"
              value={
                selectedEvidence.custodian
              }
              detail="Responsible party"
              icon={
                <UserRound
                  size={17}
                />
              }
            />

            <CustodySummaryCard
              label="Custody Events"
              value={
                String(
                  custodyEvents.length,
                )
              }
              detail={
                custodyEvents.length ===
                1
                  ? "Recorded event"
                  : "Recorded events"
              }
              icon={
                <Activity
                  size={17}
                />
              }
            />

            <CustodySummaryCard
              label="Chain Status"
              value={
                chainState
              }
              detail={
                chainStateDetail
              }
              icon={
                chainState ===
                  "Healthy" ||
                chainState ===
                  "Ready"
                  ? (
                    <ShieldCheck
                      size={17}
                    />
                  )
                  : (
                    <ShieldAlert
                      size={17}
                    />
                  )
              }
            />

            <CustodySummaryCard
              label="Latest Block"
              value={
                latestBlock ===
                null
                  ? "—"
                  : String(
                      latestBlock,
                    )
              }
              detail="Most recent anchor"
              icon={
                <Blocks
                  size={17}
                />
              }
            />
          </div>

          {/* =================================================
              CUSTODY WORKSPACE
          ================================================= */}

          <div
            className="
              grid
              grid-cols-1
              items-start
              gap-4
              xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.8fr)]
            "
          >
            {/* ===============================================
                CHAIN OF CUSTODY
            =============================================== */}

            <section
              className="
                glass
                min-w-0
                rounded-[30px]
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
                  sm:items-center
                  sm:justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
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
                      bg-white/[0.04]
                    "
                  >
                    <Activity
                      size={17}
                      className="
                        text-white/50
                      "
                    />
                  </div>

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
                        text-white/30
                      "
                    >
                      Chronological, append-only
                      handoff history for this
                      evidence.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    loadingHistory
                  }
                  onClick={() =>
                    void loadHistory(
                      selectedEvidence.id,
                    )
                  }
                  className="
                    flex
                    h-10
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.04]
                    px-4
                    text-xs
                    text-white/45
                    transition
                    hover:bg-white/[0.07]
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

                  Refresh history
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
                    min-h-[360px]
                    items-center
                    justify-center
                  "
                >
                  <div
                    className="
                      text-center
                    "
                  >
                    <LoaderCircle
                      size={25}
                      className="
                        mx-auto
                        animate-spin
                        text-white/30
                      "
                    />

                    <p
                      className="
                        mt-3
                        text-xs
                        text-white/25
                      "
                    >
                      Loading custody history...
                    </p>
                  </div>
                </div>
              ) : custodyEvents.length ===
                0 ? (
                <div
                  className="
                    mt-6
                    flex
                    min-h-[300px]
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-dashed
                    border-white/10
                    bg-white/[0.015]
                    text-center
                  "
                >
                  <div
                    className="
                      max-w-sm
                      px-6
                    "
                  >
                    <Clock3
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
                        font-medium
                        text-white/50
                      "
                    >
                      No custody events recorded
                    </p>

                    <p
                      className="
                        mt-2
                        text-xs
                        leading-5
                        text-white/25
                      "
                    >
                      TRACE-X will display each
                      registered handoff here as
                      the custody chain grows.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="
                    mt-7
                    space-y-5
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
                        canRetryBlockchain={
                          canRetryBlockchain
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
            </section>

            {/* ===============================================
                TRANSFER PANEL
            =============================================== */}

            <aside
              className="
                glass
                rounded-[30px]
                p-5
                md:p-6
                xl:sticky
                xl:top-6
              "
            >
              <div
                className="
                  flex
                  items-start
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
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-blue-400/15
                      bg-blue-400/[0.07]
                    "
                  >
                    <ArrowLeftRight
                      size={17}
                      className="
                        text-blue-300
                      "
                    />
                  </div>

                  <div>
                    <h3
                      className="
                        text-base
                        font-medium
                      "
                    >
                      Transfer Custody
                    </h3>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-white/30
                      "
                    >
                      Record a secure handoff.
                    </p>
                  </div>
                </div>
              </div>

              <Divider />

              {canTransfer ? (
                <>
                  <div
                    className="
                      rounded-[22px]
                      border
                      border-white/[0.07]
                      bg-white/[0.025]
                      p-4
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        uppercase
                        tracking-[0.14em]
                        text-white/25
                      "
                    >
                      Handoff Route
                    </p>

                    <div
                      className="
                        mt-4
                        space-y-3
                      "
                    >
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
                            text-[9px]
                            uppercase
                            tracking-[0.12em]
                            text-white/20
                          "
                        >
                          From
                        </p>

                        <div
                          className="
                            mt-2
                            flex
                            items-center
                            gap-2
                          "
                        >
                          <UserRound
                            size={14}
                            className="
                              shrink-0
                              text-white/35
                            "
                          />

                          <p
                            className="
                              truncate
                              text-sm
                              font-medium
                              text-white/65
                            "
                          >
                            {
                              selectedEvidence.custodian
                            }
                          </p>
                        </div>
                      </div>

                      <div
                        className="
                          flex
                          items-center
                          gap-3
                          px-2
                        "
                      >
                        <div
                          className="
                            h-px
                            flex-1
                            bg-white/[0.07]
                          "
                        />

                        <ArrowRight
                          size={14}
                          className="
                            text-white/20
                          "
                        />

                        <div
                          className="
                            h-px
                            flex-1
                            bg-white/[0.07]
                          "
                        />
                      </div>

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
                          {CUSTODIAN_OPTIONS.map(
                            (option) => (
                              <option
                                key={
                                  option
                                }
                                value={
                                  option
                                }
                              >
                                {
                                  option
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </FormField>
                    </div>
                  </div>

                  <div
                    className="
                      mt-5
                    "
                  >
                    <FormField
                      label="Transfer reason"
                    >
                      <textarea
                        rows={5}
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
                        placeholder="Describe why custody is being transferred and the intended examination or review."
                      />
                    </FormField>

                    <div
                      className="
                        mt-2
                        flex
                        justify-end
                      "
                    >
                      <span
                        className="
                          text-[10px]
                          text-white/20
                        "
                      >
                        {
                          reason.trim().length
                        }{" "}
                        characters
                      </span>
                    </div>
                  </div>

                  <TransferReadinessPanel
                    evidenceStatus={
                      selectedEvidence.blockchainStatus
                    }
                    unresolvedEvents={
                      unresolvedEvents.length
                    }
                    failedEvents={
                      failedEvents.length
                    }
                    loading={
                      loadingHistory
                    }
                    historyError={
                      historyError
                    }
                  />

                  {sameDestination && (
                    <div
                      className="
                        mt-4
                        rounded-[18px]
                        border
                        border-amber-400/15
                        bg-amber-400/[0.05]
                        p-3
                      "
                    >
                      <p
                        className="
                          text-xs
                          leading-5
                          text-amber-100/60
                        "
                      >
                        Choose a different
                        custodian to record a
                        handoff.
                      </p>
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
                    <SuccessPanel
                      message={
                        transferMessage
                      }
                    />
                  )}

                  <button
                    type="button"
                    disabled={
                      transferring ||
                      !reason.trim() ||
                      !destination.trim() ||
                      !transferReady ||
                      sameDestination
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
                      shadow-lg
                      shadow-black/10
                      transition
                      hover:translate-y-[-1px]
                      disabled:cursor-not-allowed
                      disabled:translate-y-0
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
                      ? "Recording handoff..."
                      : "Transfer Custody"}
                  </button>

                  <p
                    className="
                      mt-3
                      text-center
                      text-[10px]
                      leading-4
                      text-white/20
                    "
                  >
                    TRACE-X records the transfer
                    in PostgreSQL and anchors the
                    custody-event digest on-chain.
                  </p>
                </>
              ) : (
                <PermissionNotice
                  message="Your role can inspect custody history, but it cannot transfer evidence custody."
                />
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

function CustodySummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label:
    string

  value:
    string

  detail:
    string

  icon:
    ReactNode
}) {
  return (
    <div
      className="
        glass
        rounded-[24px]
        p-4
      "
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
              text-[10px]
              uppercase
              tracking-[0.12em]
              text-white/25
            "
          >
            {label}
          </p>

          <p
            className="
              mt-2
              truncate
              text-base
              font-semibold
              text-white/75
            "
          >
            {value}
          </p>

          <p
            className="
              mt-1
              truncate
              text-[10px]
              text-white/25
            "
          >
            {detail}
          </p>
        </div>

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-2xl
            border
            border-white/[0.07]
            bg-white/[0.04]
            text-white/40
          "
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function TransferReadinessPanel({
  evidenceStatus,
  unresolvedEvents,
  failedEvents,
  loading,
  historyError,
}: {
  evidenceStatus:
    BlockchainAnchorStatus

  unresolvedEvents:
    number

  failedEvents:
    number

  loading:
    boolean

  historyError:
    string | null
}) {
  let title =
    "Ready to transfer"

  let description =
    "The evidence anchor and custody sequence are ready for the next handoff."

  let state:
    "ready" |
    "waiting" |
    "blocked" =
    "ready"

  if (
    loading
  ) {
    title =
      "Checking custody sequence"

    description =
      "TRACE-X is loading the latest custody state before enabling a transfer."

    state =
      "waiting"
  } else if (
    historyError
  ) {
    title =
      "Custody state unavailable"

    description =
      "Refresh the custody history before recording a new handoff."

    state =
      "blocked"
  } else if (
    evidenceStatus !==
    "Anchored"
  ) {
    title =
      "Evidence anchor required"

    description =
      "This evidence needs a healthy blockchain anchor before custody can be transferred."

    state =
      "blocked"
  } else if (
    failedEvents >
    0
  ) {
    title =
      "Resolve failed custody anchor"

    description =
      `${failedEvents} custody event${
        failedEvents ===
        1
          ? ""
          : "s"
      } must be reconciled before the next handoff.`

    state =
      "blocked"
  } else if (
    unresolvedEvents >
    0
  ) {
    title =
      "Custody anchor pending"

    description =
      `${unresolvedEvents} custody event${
        unresolvedEvents ===
        1
          ? ""
          : "s"
      } must finish anchoring before the next handoff.`

    state =
      "waiting"
  }

  const style =
    state ===
    "ready"
      ? "border-emerald-400/15 bg-emerald-400/[0.05]"
      : state ===
        "waiting"
      ? "border-amber-400/15 bg-amber-400/[0.05]"
      : "border-red-400/15 bg-red-400/[0.05]"

  const iconStyle =
    state ===
    "ready"
      ? "text-emerald-300"
      : state ===
        "waiting"
      ? "text-amber-300"
      : "text-red-300"

  return (
    <div
      className={`
        mt-5
        rounded-[20px]
        border
        p-4
        ${style}
      `}
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        {state ===
        "ready" ? (
          <CheckCircle2
            size={17}
            className={`
              mt-0.5
              shrink-0
              ${iconStyle}
            `}
          />
        ) : state ===
          "waiting" ? (
          <Clock3
            size={17}
            className={`
              mt-0.5
              shrink-0
              ${iconStyle}
            `}
          />
        ) : (
          <CircleAlert
            size={17}
            className={`
              mt-0.5
              shrink-0
              ${iconStyle}
            `}
          />
        )}

        <div>
          <p
            className="
              text-xs
              font-medium
              text-white/65
            "
          >
            {title}
          </p>

          <p
            className="
              mt-1
              text-[11px]
              leading-5
              text-white/30
            "
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function CustodyTimelineItem({
  event,
  isLast,
  canRetryBlockchain,
  retrying,
  onRetry,
}: {
  event:
    CustodyEvent

  isLast:
    boolean

  canRetryBlockchain:
    boolean

  retrying:
    boolean

  onRetry:
    () => void
}) {
  const fromCustodian =
    event.fromCustodian ||
    "TRACE-X"

  const toCustodian =
    event.toCustodian ||
    "—"

  return (
    <div
      className="
        relative
        pl-12
      "
    >
      {!isLast && (
        <div
          className="
            absolute
            left-[17px]
            top-9
            h-[calc(100%_+_20px)]
            w-px
            bg-gradient-to-b
            from-white/15
            to-white/[0.04]
          "
        />
      )}

      <div
        className={`
          absolute
          left-0
          top-0
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-full
          border
          shadow-lg

          ${
            event.blockchainStatus ===
            "Anchored"
              ? "border-emerald-400/20 bg-emerald-400/[0.08] shadow-emerald-950/10"
              : event.blockchainStatus ===
                "Failed"
              ? "border-red-400/20 bg-red-400/[0.08] shadow-red-950/10"
              : "border-amber-400/20 bg-amber-400/[0.08] shadow-amber-950/10"
          }
        `}
      >
        {event.blockchainStatus ===
        "Anchored" ? (
          <CheckCircle2
            size={15}
            className="
              text-emerald-300
            "
          />
        ) : event.blockchainStatus ===
          "Failed" ? (
          <CircleAlert
            size={15}
            className="
              text-red-300
            "
          />
        ) : (
          <Clock3
            size={15}
            className="
              text-amber-300
            "
          />
        )}
      </div>

      <motion.article
        initial={{
          opacity:
            0,

          y:
            8,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        className="
          overflow-hidden
          rounded-[24px]
          border
          border-white/[0.07]
          bg-white/[0.025]
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            border-b
            border-white/[0.06]
            p-4
            sm:flex-row
            sm:items-start
            sm:justify-between
            md:p-5
          "
        >
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
              <span
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.04]
                  px-2.5
                  py-1
                  text-[10px]
                  font-medium
                  text-white/45
                "
              >
                Event #{event.sequence}
              </span>

              <h4
                className="
                  text-sm
                  font-semibold
                  text-white/75
                "
              >
                {formatAction(
                  event.action,
                )}
              </h4>
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

        <div
          className="
            p-4
            md:p-5
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-[1fr_auto_1fr]
              sm:items-center
            "
          >
            <CustodyPartyCard
              label="From"
              value={
                fromCustodian
              }
            />

            <div
              className="
                flex
                items-center
                justify-center
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/[0.07]
                  bg-white/[0.03]
                "
              >
                <ArrowRight
                  size={13}
                  className="
                    rotate-90
                    text-white/25
                    sm:rotate-0
                  "
                />
              </div>
            </div>

            <CustodyPartyCard
              label="To"
              value={
                toCustodian
              }
              emphasized
            />
          </div>

          <div
            className="
              mt-4
              rounded-[18px]
              border
              border-white/[0.06]
              bg-black/15
              p-4
            "
          >
            <p
              className="
                text-[9px]
                uppercase
                tracking-[0.12em]
                text-white/20
              "
            >
              Reason
            </p>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-white/40
              "
            >
              {
                event.reason
              }
            </p>
          </div>

          <div
            className="
              mt-4
              flex
              flex-wrap
              gap-2
            "
          >
            <span
              className="
                rounded-full
                border
                border-white/[0.07]
                bg-white/[0.03]
                px-3
                py-1.5
                text-[10px]
                text-white/30
              "
            >
              Chain sequence{" "}
              {
                event.blockchainSequence ??
                "—"
              }
            </span>

            <span
              className="
                rounded-full
                border
                border-white/[0.07]
                bg-white/[0.03]
                px-3
                py-1.5
                text-[10px]
                text-white/30
              "
            >
              Block{" "}
              {
                event.blockchainBlockNumber ??
                "—"
              }
            </span>

            <span
              className="
                rounded-full
                border
                border-white/[0.07]
                bg-white/[0.03]
                px-3
                py-1.5
                text-[10px]
                text-white/30
              "
            >
              Action code{" "}
              {
                event.actionCode
              }
            </span>
          </div>

          <details
            className="
              mt-4
              rounded-[18px]
              border
              border-white/[0.06]
              bg-white/[0.02]
            "
          >
            <summary
              className="
                cursor-pointer
                select-none
                px-4
                py-3
                text-xs
                font-medium
                text-white/40
              "
            >
              Cryptographic proof
            </summary>

            <div
              className="
                border-t
                border-white/[0.06]
                p-4
              "
            >
              <p
                className="
                  text-[9px]
                  uppercase
                  tracking-[0.12em]
                  text-white/20
                "
              >
                Event digest
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

              {event.blockchainTransactionHash && (
                <>
                  <p
                    className="
                      mt-4
                      text-[9px]
                      uppercase
                      tracking-[0.12em]
                      text-white/20
                    "
                  >
                    Transaction hash
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
                      event.blockchainTransactionHash
                    }
                  </p>
                </>
              )}
            </div>
          </details>

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
            "Failed" &&
            canRetryBlockchain && (
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
      </motion.article>
    </div>
  )
}

function CustodyPartyCard({
  label,
  value,
  emphasized = false,
}: {
  label:
    string

  value:
    string

  emphasized?:
    boolean
}) {
  return (
    <div
      className={`
        min-w-0
        rounded-[18px]
        border
        p-3

        ${
          emphasized
            ? "border-blue-400/15 bg-blue-400/[0.045]"
            : "border-white/[0.06] bg-white/[0.02]"
        }
      `}
    >
      <p
        className="
          text-[9px]
          uppercase
          tracking-[0.12em]
          text-white/20
        "
      >
        {label}
      </p>

      <div
        className="
          mt-2
          flex
          items-center
          gap-2
        "
      >
        <UserRound
          size={13}
          className="
            shrink-0
            text-white/30
          "
        />

        <p
          className="
            truncate
            text-xs
            font-medium
            text-white/60
          "
        >
          {value}
        </p>
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
                Authenticated TRACE-X
                evidence and custody
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
  canRetryBlockchain,
  onClose,
  onRetryAnchor,
}: {
  evidence:
    EvidenceRecord

  canRetryBlockchain:
    boolean

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
    if (
      !canRetryBlockchain
    ) {
      return
    }

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
            "Failed" &&
            canRetryBlockchain && (
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

          {evidence.blockchainStatus ===
            "Failed" &&
            !canRetryBlockchain && (
            <div
              className="
                mt-4
              "
            >
              <PermissionNotice
                message="Only a Supervisor or Admin can retry blockchain anchoring."
              />
            </div>
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
  canVerify,
  canRetryBlockchain,
  onVerify,
  onRetryAnchor,
}: {
  evidence:
    EvidenceRecord[]

  canVerify:
    boolean

  canRetryBlockchain:
    boolean

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
      verifying ||
      !canVerify
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
      retrying ||
      !canRetryBlockchain
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
              "Failed" &&
              canRetryBlockchain && (
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

            {canVerify ? (
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
            ) : (
              <PermissionNotice
                message="Your role does not have permission to run evidence verification."
              />
            )}

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
   LOGIN SCREEN
========================================================= */

function LoginScreen({
  theme,
  onToggleTheme,
  onLogin,
}: {
  theme:
    Theme

  onToggleTheme:
    () => void

  onLogin: (
    email: string,
    password: string,
  ) => Promise<void>
}) {
  const [
    email,
    setEmail,
  ] =
    useState(
      "investigator@tracex.local",
    )

  const [
    password,
    setPassword,
  ] =
    useState("")

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false)

  const [
    loggingIn,
    setLoggingIn,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  async function submit() {
    if (
      loggingIn ||
      !email.trim() ||
      !password
    ) {
      return
    }

    setLoggingIn(
      true,
    )

    setError(
      null,
    )

    try {
      await onLogin(
        email.trim(),
        password,
      )
    } catch (loginError) {
      setError(
        getErrorMessage(
          loginError,
        ),
      )
    } finally {
      setLoggingIn(
        false,
      )
    }
  }

  return (
    <main
      className={`
        theme-${theme}
        apple-shell
        relative
        min-h-screen
        overflow-hidden
        bg-[#050506]
        text-white
        transition-colors
        duration-300
      `}
    >
      <ThemeOverrides />

      <AmbientBackground />

      <div
        className="
          fixed
          right-5
          top-5
          z-20
        "
      >
        <ThemeToggle
          theme={
            theme
          }
          onToggle={
            onToggleTheme
          }
        />
      </div>

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
            apple-login-card
            w-full
            max-w-[440px]
            rounded-[34px]
            p-8
          "
        >
          <div
            className="
              apple-login-mark
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
            Authenticate to access
            blockchain-backed
            digital evidence and
            chain-of-custody records.
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

              void submit()
            }}
          >
            <FormField
              label="Email"
            >
              <input
                type="email"
                value={
                  email
                }
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event
                      .target
                      .value,
                  )
                }
                className={
                  inputClass
                }
                placeholder="investigator@tracex.local"
                autoComplete="username"
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
                  value={
                    password
                  }
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event
                        .target
                        .value,
                    )
                  }
                  className={`${inputClass} pr-16`}
                  placeholder="Password"
                  autoComplete="current-password"
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

            {error && (
              <FormError
                message={
                  error
                }
              />
            )}

            <button
              type="submit"
              disabled={
                loggingIn ||
                !email.trim() ||
                !password
              }
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
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {loggingIn ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="
                      animate-spin
                    "
                  />

                  Authenticating...
                </>
              ) : (
                <>
                  Sign in

                  <ArrowRight
                    size={17}
                  />
                </>
              )}
            </button>
          </form>

        </motion.div>
      </div>
    </main>
  )
}

/* =========================================================
   ACCESS / PERMISSION UI
========================================================= */

function ReadOnlyBadge() {
  return (
    <div
      className="
        flex
        h-12
        items-center
        gap-2
        rounded-2xl
        border
        border-white/10
        bg-white/[0.04]
        px-4
        text-xs
        text-white/35
      "
    >
      <ShieldCheck
        size={14}
      />

      Read-only access
    </div>
  )
}

function PermissionNotice({
  message,
}: {
  message: string
}) {
  return (
    <div
      className="
        mt-5
        rounded-[20px]
        border
        border-amber-400/10
        bg-amber-400/[0.04]
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
        <ShieldAlert
          size={16}
          className="
            mt-0.5
            shrink-0
            text-amber-300
          "
        />

        <p
          className="
            text-xs
            leading-5
            text-amber-100/60
          "
        >
          {message}
        </p>
      </div>
    </div>
  )
}

function AccessRestricted({
  role,
  description,
}: {
  role: UserRole
  description: string
}) {
  return (
    <div
      className="
        glass
        flex
        min-h-[420px]
        items-center
        justify-center
        rounded-[30px]
        p-8
        text-center
      "
    >
      <div
        className="
          max-w-md
        "
      >
        <ShieldAlert
          size={34}
          className="
            mx-auto
            text-amber-300/60
          "
        />

        <h3
          className="
            mt-5
            text-xl
            font-medium
          "
        >
          Permission Required
        </h3>

        <p
          className="
            mt-3
            text-sm
            leading-6
            text-white/30
          "
        >
          {description}
        </p>

        <p
          className="
            mt-4
            text-xs
            text-white/20
          "
        >
          Current role:{" "}
          {role}
        </p>
      </div>
    </div>
  )
}

function SuccessPanel({
  message,
}: {
  message: string
}) {
  return (
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
        {message}
      </p>
    </div>
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
        y:
          -1,
      }}
      whileTap={{
        scale:
          0.985,
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
      {/* Slow atmospheric fog banks. They remain behind every UI
          surface so the stronger backdrop blur creates liquid depth. */}
      <motion.div
        className="
          fog-bank
          fog-bank-one
          left-[-24%]
          top-[3%]
          h-[520px]
          w-[980px]
        "
        animate={{
          x: [
            0,
            220,
            80,
            0,
          ],

          y: [
            0,
            70,
            150,
            0,
          ],

          scale: [
            1,
            1.12,
            0.96,
            1,
          ],

          rotate: [
            -8,
            4,
            10,
            -8,
          ],

          opacity: [
            0.28,
            0.46,
            0.34,
            0.28,
          ],
        }}
        transition={{
          duration:
            38,

          repeat:
            Infinity,

          ease:
            "easeInOut",
        }}
      />

      <motion.div
        className="
          fog-bank
          fog-bank-two
          right-[-28%]
          top-[28%]
          h-[620px]
          w-[1050px]
        "
        animate={{
          x: [
            0,
            -230,
            -90,
            0,
          ],

          y: [
            0,
            -110,
            90,
            0,
          ],

          scale: [
            1,
            0.94,
            1.14,
            1,
          ],

          rotate: [
            8,
            -6,
            -12,
            8,
          ],

          opacity: [
            0.24,
            0.40,
            0.32,
            0.24,
          ],
        }}
        transition={{
          duration:
            44,

          repeat:
            Infinity,

          ease:
            "easeInOut",
        }}
      />

      <motion.div
        className="
          fog-bank
          fog-bank-three
          bottom-[-16%]
          left-[18%]
          h-[460px]
          w-[900px]
        "
        animate={{
          x: [
            0,
            180,
            -110,
            0,
          ],

          y: [
            0,
            -120,
            -40,
            0,
          ],

          scale: [
            0.96,
            1.10,
            1,
            0.96,
          ],

          opacity: [
            0.20,
            0.34,
            0.26,
            0.20,
          ],
        }}
        transition={{
          duration:
            41,

          repeat:
            Infinity,

          ease:
            "easeInOut",
        }}
      />

      {/* Existing color fields retained, softened and slowed so they
          feel like light moving behind frosted glass rather than blobs. */}
      <motion.div
        className="
          absolute
          left-[-18%]
          top-[-28%]
          h-[720px]
          w-[720px]
          rounded-full
          bg-blue-500/20
          opacity-55
          blur-[190px]
        "
        animate={{
          x: [
            0,
            70,
            0,
          ],

          y: [
            0,
            45,
            0,
          ],

          scale: [
            1,
            1.08,
            1,
          ],
        }}
        transition={{
          duration:
            32,

          repeat:
            Infinity,

          ease:
            "easeInOut",
        }}
      />

      <motion.div
        className="
          absolute
          bottom-[-34%]
          right-[-18%]
          h-[760px]
          w-[760px]
          rounded-full
          bg-violet-500/20
          opacity-50
          blur-[200px]
        "
        animate={{
          x: [
            0,
            -58,
            0,
          ],

          y: [
            0,
            -52,
            0,
          ],

          scale: [
            1,
            1.06,
            1,
          ],
        }}
        transition={{
          duration:
            36,

          repeat:
            Infinity,

          ease:
            "easeInOut",
        }}
      />

      <motion.div
        className="
          absolute
          left-[42%]
          top-[22%]
          h-[420px]
          w-[420px]
          rounded-full
          bg-blue-500/20
          opacity-20
          blur-[165px]
        "
        animate={{
          scale: [
            1,
            1.12,
            1,
          ],

          opacity: [
            0.12,
            0.24,
            0.12,
          ],
        }}
        transition={{
          duration:
            26,

          repeat:
            Infinity,

          ease:
            "easeInOut",
        }}
      />

      <div
        className="fog-vignette"
      />
    </div>
  )
}

/* =========================================================
   AUTH TOKEN
========================================================= */

function getAuthToken() {
  return sessionStorage.getItem(
    AUTH_TOKEN_KEY,
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

  const token =
    getAuthToken()

  if (
    token &&
    !headers.has(
      "Authorization",
    )
  ) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    )
  }

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
    response.status ===
      401 &&
    path !==
      "/api/auth/login"
  ) {
    sessionStorage
      .removeItem(
        AUTH_TOKEN_KEY,
      )

    window.dispatchEvent(
      new Event(
        "tracex-auth-expired",
      ),
    )
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

/* =========================================================
   GENERAL HELPERS
========================================================= */

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
      (
        character,
      ) =>
        character.toUpperCase(),
    )
}

function formatAuditEvent(
  eventType:
    string,
) {
  return eventType
    .split(
      "_",
    )
    .map(
      (word) =>
        word.charAt(
          0,
        ) +
        word
          .slice(
            1,
          )
          .toLowerCase(),
    )
    .join(
      " ",
    )
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