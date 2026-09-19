import {
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type ReactNode,
  type SetStateAction,
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
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  FolderKanban,
  HardDrive,
  Hash,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react"

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
      "Overview of evidence integrity and custody activity.",
  },

  cases: {
    title: "Cases",
    description:
      "Manage investigations and associated digital evidence.",
  },

  evidence: {
    title: "Evidence",
    description:
      "Register, inspect, hash, and manage digital evidence.",
  },

  transfers: {
    title: "Custody Transfers",
    description:
      "Track and manage evidence custody transitions.",
  },

  verify: {
    title: "Integrity Verification",
    description:
      "Verify evidence against blockchain-recorded hashes.",
  },

  audit: {
    title: "Audit Log",
    description:
      "Review immutable evidence and system activity.",
  },
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
}

/* =========================================================
   INITIAL CASE DATA
========================================================= */

const initialCases: InvestigationCase[] = [
  {
    id: "CASE-2026-0018",
    title:
      "Unauthorized Access Investigation",
    description:
      "Investigation into suspicious remote access activity detected on an internal workstation.",
    investigator:
      "Investigator A",
    status:
      "Open",
    priority:
      "Critical",
    evidenceCount:
      14,
    createdAt:
      "18 Sep 2026",
    updatedAt:
      "12 minutes ago",
  },

  {
    id: "CASE-2026-0017",
    title:
      "Server Compromise",
    description:
      "Forensic analysis of a production server following indicators of unauthorized modification.",
    investigator:
      "Investigator B",
    status:
      "Under Review",
    priority:
      "High",
    evidenceCount:
      9,
    createdAt:
      "17 Sep 2026",
    updatedAt:
      "48 minutes ago",
  },

  {
    id: "CASE-2026-0016",
    title:
      "Endpoint Forensic Analysis",
    description:
      "Investigation of a potentially compromised employee endpoint and associated user activity.",
    investigator:
      "Investigator C",
    status:
      "Open",
    priority:
      "Medium",
    evidenceCount:
      6,
    createdAt:
      "15 Sep 2026",
    updatedAt:
      "2 hours ago",
  },

  {
    id: "CASE-2026-0015",
    title:
      "Suspicious Network Traffic",
    description:
      "Review of unusual outbound network communications identified during security monitoring.",
    investigator:
      "Investigator A",
    status:
      "Closed",
    priority:
      "Low",
    evidenceCount:
      21,
    createdAt:
      "10 Sep 2026",
    updatedAt:
      "3 days ago",
  },
]

/* =========================================================
   INITIAL EVIDENCE DATA
========================================================= */

const initialEvidence: EvidenceRecord[] = [
  {
    id: "EV-2026-0124",
    name: "network_capture.pcap",
    description:
      "Network packet capture acquired during investigation of suspicious remote access traffic.",
    caseId:
      "CASE-2026-0018",
    caseTitle:
      "Unauthorized Access Investigation",
    type:
      "Network Capture",
    size:
      52428800,
    hash:
      "91b8f6a4d38e9f72c4a10e8f09dd6b8342ae6ef10b47a9ef67b6fd308a3f2521",
    custodian:
      "Investigator A",
    integrity:
      "Verified",
    status:
      "Sealed",
    createdAt:
      "18 Sep 2026",
    updatedAt:
      "20 minutes ago",
    versions: [
      {
        version: 1,
        hash:
          "91b8f6a4d38e9f72c4a10e8f09dd6b8342ae6ef10b47a9ef67b6fd308a3f2521",
        createdAt:
          "18 Sep 2026",
        note:
          "Original evidence acquisition",
      },
    ],
  },

  {
    id: "EV-2026-0123",
    name: "system_logs.zip",
    description:
      "Compressed operating-system and application logs collected from the affected server.",
    caseId:
      "CASE-2026-0017",
    caseTitle:
      "Server Compromise",
    type:
      "Log Archive",
    size:
      17825792,
    hash:
      "51be229f0da3d17d7cc581d89cc4fcf953e3e35fb331b1a725967a987e2c89aa",
    custodian:
      "Investigator B",
    integrity:
      "Verified",
    status:
      "Registered",
    createdAt:
      "17 Sep 2026",
    updatedAt:
      "1 hour ago",
    versions: [
      {
        version: 1,
        hash:
          "51be229f0da3d17d7cc581d89cc4fcf953e3e35fb331b1a725967a987e2c89aa",
        createdAt:
          "17 Sep 2026",
        note:
          "Original evidence acquisition",
      },
    ],
  },

  {
    id: "EV-2026-0122",
    name: "disk_image.dd",
    description:
      "Forensic disk image acquired from the endpoint currently under examination.",
    caseId:
      "CASE-2026-0016",
    caseTitle:
      "Endpoint Forensic Analysis",
    type:
      "Disk Image",
    size:
      536870912,
    hash:
      "cb99530a5b86832f2f55e9887309f0dbff23043c54bd888f4134c72e77766880",
    custodian:
      "Investigator C",
    integrity:
      "Pending",
    status:
      "Registered",
    createdAt:
      "15 Sep 2026",
    updatedAt:
      "2 hours ago",
    versions: [
      {
        version: 1,
        hash:
          "cb99530a5b86832f2f55e9887309f0dbff23043c54bd888f4134c72e77766880",
        createdAt:
          "15 Sep 2026",
        note:
          "Original evidence acquisition",
      },
    ],
  },

  {
    id: "EV-2026-0121",
    name: "suspicious_email.eml",
    description:
      "Email message exported from the affected mailbox for phishing analysis.",
    caseId:
      "CASE-2026-0018",
    caseTitle:
      "Unauthorized Access Investigation",
    type:
      "Document",
    size:
      483221,
    hash:
      "20acd5cb3f1cc89397471690023ee37053ccae21c377d061b43713abc51435fd",
    custodian:
      "Investigator A",
    integrity:
      "Mismatch",
    status:
      "Registered",
    createdAt:
      "18 Sep 2026",
    updatedAt:
      "35 minutes ago",
    versions: [
      {
        version: 1,
        hash:
          "20acd5cb3f1cc89397471690023ee37053ccae21c377d061b43713abc51435fd",
        createdAt:
          "18 Sep 2026",
        note:
          "Original evidence acquisition",
      },
    ],
  },
]

/* =========================================================
   MAIN APPLICATION
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
    >(initialCases)

  const [
    evidence,
    setEvidence,
  ] =
    useState<
      EvidenceRecord[]
    >(initialEvidence)

  if (!authenticated) {
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

      {/* DESKTOP SIDEBAR */}

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

      {/* MOBILE SIDEBAR */}

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
                type: "spring",
                stiffness: 260,
                damping: 28,
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
                  transition
                  hover:bg-white/10
                  hover:text-white
                "
              >
                <X size={17} />
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

      {/* MAIN APPLICATION */}

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
            w-full
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
                scale: 0.92,
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
              <Menu size={19} />
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
                  tracking-tight
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
            <motion.button
              type="button"
              whileHover={{
                scale: 1.03,
              }}
              whileTap={{
                scale: 0.96,
              }}
              className="
                glass
                hidden
                h-11
                items-center
                gap-2
                rounded-2xl
                px-4
                text-sm
                text-white/50
                md:flex
              "
            >
              <Search size={16} />

              <span>
                Search
              </span>

              <span
                className="
                  ml-5
                  rounded-lg
                  border
                  border-white/10
                  bg-white/5
                  px-2
                  py-1
                  text-[10px]
                  text-white/30
                "
              >
                Ctrl K
              </span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{
                scale: 1.04,
              }}
              whileTap={{
                scale: 0.95,
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
                opacity: 0,
                y: 12,
                scale: 0.995,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -8,
                scale: 0.995,
              }}
              transition={{
                duration: 0.28,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
            >
              <PageHeader
                page={
                  activePage
                }
              />

              {activePage ===
              "dashboard" ? (
                <Dashboard
                  cases={cases}
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
                  setCases={
                    setCases
                  }
                />
              ) : activePage ===
                "evidence" ? (
                <EvidencePage
                  evidence={
                    evidence
                  }
                  setEvidence={
                    setEvidence
                  }
                  cases={
                    cases
                  }
                  setCases={
                    setCases
                  }
                />
              ) : (
                <PlaceholderPage
                  page={
                    activePage
                  }
                />
              )}
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
  activePage: Page
  setActivePage: (
    page: Page,
  ) => void
  onLogout: () => void
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
            strokeWidth={1.7}
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

      <div
        className="
          my-4
          h-px
          bg-gradient-to-r
          from-transparent
          via-white/10
          to-transparent
        "
      />

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
                  scale: 0.98,
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
                  transition-colors

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
                    transition={{
                      type:
                        "spring",
                      stiffness:
                        350,
                      damping:
                        30,
                    }}
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
            System Secure
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
          Local development
          environment
        </p>
      </div>

      <motion.button
        type="button"
        whileTap={{
          scale: 0.98,
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
          transition
          hover:bg-white/[0.04]
          hover:text-white/70
        "
      >
        <LogOut size={16} />

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
      <motion.h2
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
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
      </motion.h2>

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
   DASHBOARD
========================================================= */

function Dashboard({
  cases,
  evidence,
}: {
  cases: InvestigationCase[]
  evidence: EvidenceRecord[]
}) {
  const verifiedCount =
    evidence.filter(
      (item) =>
        item.integrity ===
        "Verified",
    ).length

  const activeCaseCount =
    cases.filter(
      (item) =>
        item.status !==
        "Closed",
    ).length

  const stats = [
    {
      label:
        "Total Evidence",
      value:
        String(
          evidence.length,
        ),
      detail:
        `Across ${cases.length} cases`,
      icon:
        FileText,
    },

    {
      label:
        "Verified",
      value:
        String(
          verifiedCount,
        ),
      detail:
        evidence.length >
        0
          ? `${(
              (verifiedCount /
                evidence.length) *
              100
            ).toFixed(1)}% integrity rate`
          : "No evidence yet",
      icon:
        CheckCircle2,
    },

    {
      label:
        "Pending Transfers",
      value:
        "8",
      detail:
        "Awaiting acceptance",
      icon:
        ArrowLeftRight,
    },

    {
      label:
        "Active Cases",
      value:
        String(
          activeCaseCount,
        ),
      detail:
        `${cases.length} total cases`,
      icon:
        FolderKanban,
    },
  ]

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
        {stats.map(
          (
            stat,
            index,
          ) => {
            const Icon =
              stat.icon

            return (
              <motion.div
                key={
                  stat.label
                }
                initial={{
                  opacity:
                    0,
                  y: 15,
                }}
                animate={{
                  opacity:
                    1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index *
                    0.06,
                }}
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
                    items-center
                    justify-between
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
                      bg-white/[0.06]
                    "
                  >
                    <Icon
                      size={17}
                      className="
                        text-white/60
                      "
                    />
                  </div>

                  <span
                    className="
                      rounded-full
                      border
                      border-white/10
                      bg-white/[0.04]
                      px-2.5
                      py-1
                      text-[10px]
                      text-white/30
                    "
                  >
                    LIVE
                  </span>
                </div>

                <p
                  className="
                    mt-6
                    text-3xl
                    font-semibold
                    tracking-[-0.04em]
                  "
                >
                  {
                    stat.value
                  }
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    text-white/65
                  "
                >
                  {
                    stat.label
                  }
                </p>

                <p
                  className="
                    mt-2
                    text-xs
                    text-white/25
                  "
                >
                  {
                    stat.detail
                  }
                </p>
              </motion.div>
            )
          },
        )}
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
              px-5
              py-5
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
                Latest registered
                evidence
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
            .slice(0, 3)
            .map(
              (item) => (
                <DashboardEvidenceRow
                  key={
                    item.id
                  }
                  evidence={
                    item
                  }
                />
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
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <div>
              <h3
                className="
                  text-sm
                  font-medium
                "
              >
                Integrity Status
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                Cryptographic
                verification
              </p>
            </div>

            <Blocks
              size={18}
              className="
                text-white/30
              "
            />
          </div>

          <div
            className="
              mt-8
              flex
              justify-center
            "
          >
            <div
              className="
                relative
                flex
                h-40
                w-40
                items-center
                justify-center
                rounded-full
                border
                border-emerald-400/15
                bg-emerald-400/[0.04]
              "
            >
              <div
                className="
                  absolute
                  inset-3
                  rounded-full
                  border
                  border-emerald-400/10
                "
              />

              <div
                className="
                  text-center
                "
              >
                <ShieldCheck
                  size={28}
                  className="
                    mx-auto
                    text-emerald-300
                  "
                />

                <p
                  className="
                    mt-2
                    text-2xl
                    font-semibold
                    tracking-tight
                  "
                >
                  {evidence.length >
                  0
                    ? `${(
                        (verifiedCount /
                          evidence.length) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}
                </p>

                <p
                  className="
                    text-[10px]
                    text-white/30
                  "
                >
                  VERIFIED
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              mt-8
              flex
              items-center
              justify-between
              rounded-2xl
              border
              border-white/[0.07]
              bg-white/[0.03]
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
              <Clock3
                size={14}
                className="
                  text-white/30
                "
              />

              <span
                className="
                  text-xs
                  text-white/35
                "
              >
                Last verification
              </span>
            </div>

            <span
              className="
                text-xs
                text-white/55
              "
            >
              Just now
            </span>
          </div>
        </div>
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-1
          gap-4
          lg:grid-cols-2
        "
      >
        <div
          className="
            glass
            rounded-[28px]
            p-6
          "
        >
          <ShieldAlert
            size={20}
            className="
              text-amber-300/70
            "
          />

          <h3
            className="
              mt-5
              text-lg
              font-medium
            "
          >
            Pending custody
            actions
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-white/30
            "
          >
            Custody workflows
            will be connected
            in the Transfers
            module.
          </p>
        </div>

        <div
          className="
            glass
            rounded-[28px]
            p-6
          "
        >
          <Activity
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
            Blockchain activity
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-white/30
            "
          >
            Blockchain event
            recording will be
            enabled after the
            backend layer is
            ready.
          </p>
        </div>
      </div>
    </>
  )
}

/* =========================================================
   DASHBOARD EVIDENCE ROW
========================================================= */

function DashboardEvidenceRow({
  evidence,
}: {
  evidence: EvidenceRecord
}) {
  return (
    <motion.div
      whileHover={{
        backgroundColor:
          "rgba(255,255,255,0.025)",
      }}
      className="
        flex
        items-center
        gap-4
        border-b
        border-white/[0.05]
        px-5
        py-4
        last:border-b-0
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
          border-white/[0.08]
          bg-white/[0.04]
        "
      >
        <FileText
          size={16}
          className="
            text-white/40
          "
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
            items-center
            gap-2
          "
        >
          <p
            className="
              truncate
              text-sm
              font-medium
              text-white/75
            "
          >
            {
              evidence.name
            }
          </p>

          <span
            className="
              text-[10px]
              text-white/20
            "
          >
            {
              evidence.id
            }
          </span>
        </div>

        <p
          className="
            mt-1
            truncate
            text-xs
            text-white/25
          "
        >
          {
            evidence.caseTitle
          }
        </p>
      </div>

      <IntegrityBadge
        integrity={
          evidence.integrity
        }
      />
    </motion.div>
  )
}

/* =========================================================
   CASES PAGE
========================================================= */

function CasesPage({
  cases,
  setCases,
}: {
  cases:
    InvestigationCase[]

  setCases:
    Dispatch<
      SetStateAction<
        InvestigationCase[]
      >
    >
}) {
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("")

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      | "All"
      | CaseStatus
    >("All")

  const [
    selectedCase,
    setSelectedCase,
  ] =
    useState<
      InvestigationCase | null
    >(null)

  const [
    createCaseOpen,
    setCreateCaseOpen,
  ] =
    useState(false)

  const [
    newTitle,
    setNewTitle,
  ] =
    useState("")

  const [
    newDescription,
    setNewDescription,
  ] =
    useState("")

  const [
    newInvestigator,
    setNewInvestigator,
  ] =
    useState(
      "Investigator A",
    )

  const [
    newPriority,
    setNewPriority,
  ] =
    useState<CasePriority>(
      "Medium",
    )

  const filteredCases =
    cases.filter(
      (item) => {
        const query =
          searchQuery
            .trim()
            .toLowerCase()

        const matchesSearch =
          item.title
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.id
            .toLowerCase()
            .includes(
              query,
            ) ||
          item.investigator
            .toLowerCase()
            .includes(
              query,
            )

        const matchesStatus =
          statusFilter ===
            "All" ||
          item.status ===
            statusFilter

        return (
          matchesSearch &&
          matchesStatus
        )
      },
    )

  function createCase() {
    if (
      !newTitle.trim()
    ) {
      return
    }

    const existingNumbers =
      cases.map(
        (item) =>
          Number(
            item.id
              .split("-")
              .pop(),
          ),
      )

    const highest =
      existingNumbers.length >
      0
        ? Math.max(
            ...existingNumbers,
          )
        : 0

    const next =
      String(
        highest + 1,
      ).padStart(
        4,
        "0",
      )

    const today =
      new Date().toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      )

    const newCase: InvestigationCase =
      {
        id:
          `CASE-2026-${next}`,
        title:
          newTitle.trim(),
        description:
          newDescription.trim() ||
          "No investigation description has been provided.",
        investigator:
          newInvestigator,
        status:
          "Open",
        priority:
          newPriority,
        evidenceCount:
          0,
        createdAt:
          today,
        updatedAt:
          "Just now",
      }

    setCases(
      (
        current,
      ) => [
        newCase,
        ...current,
      ],
    )

    setNewTitle("")
    setNewDescription("")
    setNewInvestigator(
      "Investigator A",
    )
    setNewPriority(
      "Medium",
    )
    setCreateCaseOpen(
      false,
    )
  }

  return (
    <>
      <div
        className="
          mb-5
          flex
          flex-col
          gap-3
          xl:flex-row
          xl:items-center
          xl:justify-between
        "
      >
        <div
          className="
            flex
            flex-1
            flex-col
            gap-3
            sm:flex-row
          "
        >
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
              sm:max-w-[380px]
            "
          >
            <Search
              size={17}
              className="
                shrink-0
                text-white/30
              "
            />

            <input
              value={
                searchQuery
              }
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search cases..."
              className="
                h-full
                w-full
                bg-transparent
                text-sm
                text-white
                placeholder:text-white/25
              "
            />
          </div>

          <div
            className="
              glass
              flex
              items-center
              gap-1
              overflow-x-auto
              rounded-2xl
              p-1
            "
          >
            {(
              [
                "All",
                "Open",
                "Under Review",
                "Closed",
              ] as const
            ).map(
              (
                filter,
              ) => {
                const active =
                  statusFilter ===
                  filter

                return (
                  <motion.button
                    type="button"
                    key={
                      filter
                    }
                    whileTap={{
                      scale:
                        0.96,
                    }}
                    onClick={() =>
                      setStatusFilter(
                        filter,
                      )
                    }
                    className={`
                      relative
                      h-10
                      whitespace-nowrap
                      rounded-xl
                      px-4
                      text-xs
                      transition-colors

                      ${
                        active
                          ? "text-white"
                          : "text-white/35 hover:text-white/65"
                      }
                    `}
                  >
                    {active && (
                      <motion.div
                        layoutId="case-filter"
                        className="
                          absolute
                          inset-0
                          rounded-xl
                          border
                          border-white/10
                          bg-white/[0.08]
                        "
                      />
                    )}

                    <span
                      className="
                        relative
                        z-10
                      "
                    >
                      {
                        filter
                      }
                    </span>
                  </motion.button>
                )
              },
            )}
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{
            scale: 1.02,
          }}
          whileTap={{
            scale: 0.97,
          }}
          onClick={() =>
            setCreateCaseOpen(
              true,
            )
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
          <Plus size={17} />

          Create Case
        </motion.button>
      </div>

      <div
        className="
          mb-4
          flex
          items-center
          justify-between
          px-1
        "
      >
        <p
          className="
            text-xs
            text-white/30
          "
        >
          {
            filteredCases.length
          }{" "}
          {filteredCases.length ===
          1
            ? "case"
            : "cases"}
        </p>

        <p
          className="
            text-xs
            text-white/20
          "
        >
          Updated locally
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-1
          gap-4
        "
      >
        {filteredCases.map(
          (
            investigationCase,
            index,
          ) => (
            <CaseCard
              key={
                investigationCase.id
              }
              investigationCase={
                investigationCase
              }
              index={
                index
              }
              onOpen={() =>
                setSelectedCase(
                  investigationCase,
                )
              }
            />
          ),
        )}

        {filteredCases.length ===
          0 && (
          <EmptyState
            title="No cases found"
            description="Try changing your search or status filter."
            icon={
              <Search
                size={26}
              />
            }
          />
        )}
      </div>

      <AnimatePresence>
        {selectedCase && (
          <CaseDetails
            investigationCase={
              selectedCase
            }
            onClose={() =>
              setSelectedCase(
                null,
              )
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {createCaseOpen && (
          <>
            <ModalBackdrop
              onClose={() =>
                setCreateCaseOpen(
                  false,
                )
              }
            />

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.94,
                y: 24,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: 15,
              }}
              transition={{
                type:
                  "spring",
                stiffness:
                  300,
                damping:
                  28,
              }}
              className="
                glass
                fixed
                left-1/2
                top-1/2
                z-[80]
                w-[calc(100%_-_2rem)]
                max-w-[520px]
                -translate-x-1/2
                -translate-y-1/2
                rounded-[30px]
                p-6
                md:p-7
              "
            >
              <ModalHeader
                title="Create Case"
                description="Create a new digital forensic investigation."
                onClose={() =>
                  setCreateCaseOpen(
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
                    autoFocus
                    value={
                      newTitle
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewTitle(
                        event.target
                          .value,
                      )
                    }
                    placeholder="e.g. Unauthorized access investigation"
                    className={inputClass}
                  />
                </FormField>

                <FormField
                  label="Description"
                >
                  <textarea
                    value={
                      newDescription
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewDescription(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Describe the investigation..."
                    rows={4}
                    className={textareaClass}
                  />
                </FormField>

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <FormField
                    label="Investigator"
                  >
                    <select
                      value={
                        newInvestigator
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewInvestigator(
                          event.target
                            .value,
                        )
                      }
                      className={selectClass}
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
                        newPriority
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewPriority(
                          event.target
                            .value as CasePriority,
                        )
                      }
                      className={selectClass}
                    >
                      <option value="Low">
                        Low
                      </option>
                      <option value="Medium">
                        Medium
                      </option>
                      <option value="High">
                        High
                      </option>
                      <option value="Critical">
                        Critical
                      </option>
                    </select>
                  </FormField>
                </div>
              </div>

              <ModalActions
                onCancel={() =>
                  setCreateCaseOpen(
                    false,
                  )
                }
                onConfirm={
                  createCase
                }
                confirmText="Create Case"
                disabled={
                  !newTitle.trim()
                }
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* =========================================================
   CASE CARD
========================================================= */

function CaseCard({
  investigationCase,
  index,
  onOpen,
}: {
  investigationCase:
    InvestigationCase
  index: number
  onOpen: () => void
}) {
  return (
    <motion.button
      type="button"
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay:
          index *
          0.05,
      }}
      whileHover={{
        y: -2,
      }}
      whileTap={{
        scale: 0.995,
      }}
      onClick={
        onOpen
      }
      className="
        glass
        w-full
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
          lg:flex-row
          lg:items-center
        "
      >
        <div
          className="
            flex
            min-w-0
            flex-1
            items-start
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
                  truncate
                  text-base
                  font-medium
                  text-white/85
                "
              >
                {
                  investigationCase.title
                }
              </h3>

              <PriorityBadge
                priority={
                  investigationCase.priority
                }
              />
            </div>

            <p
              className="
                mt-1
                text-[11px]
                font-medium
                tracking-wide
                text-white/25
              "
            >
              {
                investigationCase.id
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
                investigationCase.description
              }
            </p>
          </div>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-x-6
            gap-y-3
            lg:justify-end
          "
        >
          <div>
            <p
              className="
                text-[10px]
                text-white/20
              "
            >
              INVESTIGATOR
            </p>

            <div
              className="
                mt-1
                flex
                items-center
                gap-2
              "
            >
              <UserRound
                size={13}
                className="
                  text-white/30
                "
              />

              <span
                className="
                  text-xs
                  text-white/50
                "
              >
                {
                  investigationCase.investigator
                }
              </span>
            </div>
          </div>

          <div>
            <p
              className="
                text-[10px]
                text-white/20
              "
            >
              EVIDENCE
            </p>

            <p
              className="
                mt-1
                text-xs
                text-white/50
              "
            >
              {
                investigationCase.evidenceCount
              }{" "}
              items
            </p>
          </div>

          <div>
            <p
              className="
                text-[10px]
                text-white/20
              "
            >
              STATUS
            </p>

            <div
              className="
                mt-1
              "
            >
              <StatusBadge
                status={
                  investigationCase.status
                }
              />
            </div>
          </div>

          <ChevronRight
            size={18}
            className="
              ml-auto
              text-white/20
              lg:ml-2
            "
          />
        </div>
      </div>
    </motion.button>
  )
}

/* =========================================================
   CASE DETAILS
========================================================= */

function CaseDetails({
  investigationCase,
  onClose,
}: {
  investigationCase:
    InvestigationCase
  onClose:
    () => void
}) {
  return (
    <>
      <ModalBackdrop
        onClose={
          onClose
        }
      />

      <motion.aside
        initial={{
          x: "100%",
        }}
        animate={{
          x: 0,
        }}
        exit={{
          x: "100%",
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
          max-w-[540px]
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
            gap-5
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-[19px]
              border
              border-white/10
              bg-white/[0.05]
            "
          >
            <FolderKanban
              size={20}
              className="
                text-white/55
              "
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
            mt-8
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
            <StatusBadge
              status={
                investigationCase.status
              }
            />

            <PriorityBadge
              priority={
                investigationCase.priority
              }
            />
          </div>

          <p
            className="
              mt-5
              text-xs
              font-medium
              tracking-[0.13em]
              text-white/25
            "
          >
            {
              investigationCase.id
            }
          </p>

          <h2
            className="
              mt-2
              text-3xl
              font-semibold
              tracking-[-0.04em]
            "
          >
            {
              investigationCase.title
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
              investigationCase.description
            }
          </p>
        </div>

        <Divider />

        <div
          className="
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-2
          "
        >
          <DetailCard
            label="Investigator"
            value={
              investigationCase.investigator
            }
            icon={
              <UserRound
                size={15}
              />
            }
          />

          <DetailCard
            label="Evidence"
            value={`${investigationCase.evidenceCount} items`}
            icon={
              <FileText
                size={15}
              />
            }
          />

          <DetailCard
            label="Created"
            value={
              investigationCase.createdAt
            }
            icon={
              <CalendarDays
                size={15}
              />
            }
          />

          <DetailCard
            label="Last updated"
            value={
              investigationCase.updatedAt
            }
            icon={
              <Clock3
                size={15}
              />
            }
          />
        </div>

        <div
          className="
            mt-8
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
              gap-3
            "
          >
            <ShieldCheck
              size={18}
              className="
                text-emerald-300/75
              "
            />

            <div>
              <p
                className="
                  text-sm
                  text-white/70
                "
              >
                Case integrity
                protected
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-white/25
                "
              >
                Blockchain anchoring
                will be connected
                later.
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            mt-8
          "
        >
          <SectionLabel>
            Recent activity
          </SectionLabel>

          <div
            className="
              mt-5
              space-y-5
            "
          >
            <ActivityItem
              title="Case updated"
              description={
                investigationCase.updatedAt
              }
            />

            <ActivityItem
              title="Evidence registered"
              description={`${investigationCase.evidenceCount} evidence records associated`}
            />

            <ActivityItem
              title="Case created"
              description={
                investigationCase.createdAt
              }
            />
          </div>
        </div>
      </motion.aside>
    </>
  )
}

/* =========================================================
   EVIDENCE PAGE
========================================================= */

function EvidencePage({
  evidence,
  setEvidence,
  cases,
  setCases,
}: {
  evidence:
    EvidenceRecord[]

  setEvidence:
    Dispatch<
      SetStateAction<
        EvidenceRecord[]
      >
    >

  cases:
    InvestigationCase[]

  setCases:
    Dispatch<
      SetStateAction<
        InvestigationCase[]
      >
    >
}) {
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("")

  const [
    integrityFilter,
    setIntegrityFilter,
  ] =
    useState<
      | "All"
      | EvidenceIntegrity
    >("All")

  const [
    selectedEvidence,
    setSelectedEvidence,
  ] =
    useState<
      EvidenceRecord | null
    >(null)

  const [
    registerOpen,
    setRegisterOpen,
  ] =
    useState(false)

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    )

  const [
    hashValue,
    setHashValue,
  ] =
    useState<string | null>(
      null,
    )

  const [
    hashing,
    setHashing,
  ] =
    useState(false)

  const [
    hashError,
    setHashError,
  ] =
    useState<string | null>(
      null,
    )

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] =
    useState(
      cases[0]?.id ??
        "",
    )

  const [
    description,
    setDescription,
  ] =
    useState("")

  const [
    custodian,
    setCustodian,
  ] =
    useState(
      "Investigator A",
    )

  const [
    evidenceType,
    setEvidenceType,
  ] =
    useState<EvidenceType>(
      "Other",
    )

  const [
    dragActive,
    setDragActive,
  ] =
    useState(false)

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const filteredEvidence =
    evidence.filter(
      (item) => {
        const query =
          searchQuery
            .trim()
            .toLowerCase()

        const matchesSearch =
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

        const matchesIntegrity =
          integrityFilter ===
            "All" ||
          item.integrity ===
            integrityFilter

        return (
          matchesSearch &&
          matchesIntegrity
        )
      },
    )

  async function processFile(
    file: File,
  ) {
    setSelectedFile(
      file,
    )

    setHashValue(
      null,
    )

    setHashError(
      null,
    )

    setEvidenceType(
      detectEvidenceType(
        file.name,
      ),
    )

    setHashing(
      true,
    )

    try {
      const calculatedHash =
        await calculateSHA256(
          file,
        )

      setHashValue(
        calculatedHash,
      )
    } catch {
      setHashError(
        "TRACE-X could not calculate the SHA-256 hash for this file.",
      )
    } finally {
      setHashing(
        false,
      )
    }
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
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

  function resetRegistration() {
    setSelectedFile(
      null,
    )

    setHashValue(
      null,
    )

    setHashError(
      null,
    )

    setDescription(
      "",
    )

    setCustodian(
      "Investigator A",
    )

    setEvidenceType(
      "Other",
    )

    setSelectedCaseId(
      cases[0]?.id ??
        "",
    )

    setHashing(
      false,
    )

    setDragActive(
      false,
    )
  }

  function closeRegistration() {
    setRegisterOpen(
      false,
    )

    resetRegistration()
  }

  function registerEvidence() {
    if (
      !selectedFile ||
      !hashValue ||
      !selectedCaseId
    ) {
      return
    }

    const selectedCase =
      cases.find(
        (item) =>
          item.id ===
          selectedCaseId,
      )

    if (
      !selectedCase
    ) {
      return
    }

    const numericIds =
      evidence.map(
        (item) =>
          Number(
            item.id
              .split("-")
              .pop(),
          ),
      )

    const highest =
      numericIds.length >
      0
        ? Math.max(
            ...numericIds,
          )
        : 0

    const next =
      String(
        highest + 1,
      ).padStart(
        4,
        "0",
      )

    const today =
      new Date().toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      )

    const newEvidence: EvidenceRecord =
      {
        id:
          `EV-2026-${next}`,

        name:
          selectedFile.name,

        description:
          description.trim() ||
          "No evidence description has been provided.",

        caseId:
          selectedCase.id,

        caseTitle:
          selectedCase.title,

        type:
          evidenceType,

        size:
          selectedFile.size,

        hash:
          hashValue,

        custodian:
          custodian,

        integrity:
          "Verified",

        status:
          "Registered",

        createdAt:
          today,

        updatedAt:
          "Just now",

        versions: [
          {
            version: 1,
            hash:
              hashValue,
            createdAt:
              today,
            note:
              "Original evidence acquisition",
          },
        ],
      }

    setEvidence(
      (
        current,
      ) => [
        newEvidence,
        ...current,
      ],
    )

    setCases(
      (
        current,
      ) =>
        current.map(
          (item) =>
            item.id ===
            selectedCase.id
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

    closeRegistration()
  }

  return (
    <>
      {/* TOOLBAR */}

      <div
        className="
          mb-5
          flex
          flex-col
          gap-3
          xl:flex-row
          xl:items-center
          xl:justify-between
        "
      >
        <div
          className="
            flex
            flex-1
            flex-col
            gap-3
            lg:flex-row
          "
        >
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
              lg:max-w-[380px]
            "
          >
            <Search
              size={17}
              className="
                shrink-0
                text-white/30
              "
            />

            <input
              value={
                searchQuery
              }
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search evidence, case, or hash..."
              className="
                h-full
                w-full
                bg-transparent
                text-sm
                text-white
                placeholder:text-white/25
              "
            />
          </div>

          <div
            className="
              glass
              flex
              items-center
              gap-1
              overflow-x-auto
              rounded-2xl
              p-1
            "
          >
            {(
              [
                "All",
                "Verified",
                "Pending",
                "Mismatch",
              ] as const
            ).map(
              (
                filter,
              ) => {
                const active =
                  integrityFilter ===
                  filter

                return (
                  <motion.button
                    type="button"
                    key={
                      filter
                    }
                    whileTap={{
                      scale:
                        0.96,
                    }}
                    onClick={() =>
                      setIntegrityFilter(
                        filter,
                      )
                    }
                    className={`
                      relative
                      h-10
                      whitespace-nowrap
                      rounded-xl
                      px-4
                      text-xs
                      transition-colors

                      ${
                        active
                          ? "text-white"
                          : "text-white/35 hover:text-white/65"
                      }
                    `}
                  >
                    {active && (
                      <motion.div
                        layoutId="evidence-filter"
                        className="
                          absolute
                          inset-0
                          rounded-xl
                          border
                          border-white/10
                          bg-white/[0.08]
                        "
                      />
                    )}

                    <span
                      className="
                        relative
                        z-10
                      "
                    >
                      {
                        filter
                      }
                    </span>
                  </motion.button>
                )
              },
            )}
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{
            scale: 1.02,
          }}
          whileTap={{
            scale: 0.97,
          }}
          onClick={() => {
            resetRegistration()

            setRegisterOpen(
              true,
            )
          }}
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
          <UploadCloud
            size={17}
          />

          Register Evidence
        </motion.button>
      </div>

      {/* SUMMARY */}

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
          label="Total Evidence"
          value={
            evidence.length
          }
          icon={
            <Database
              size={16}
            />
          }
        />

        <MiniStat
          label="Verified"
          value={
            evidence.filter(
              (item) =>
                item.integrity ===
                "Verified",
            ).length
          }
          icon={
            <ShieldCheck
              size={16}
            />
          }
        />

        <MiniStat
          label="Pending"
          value={
            evidence.filter(
              (item) =>
                item.integrity ===
                "Pending",
            ).length
          }
          icon={
            <Clock3
              size={16}
            />
          }
        />

        <MiniStat
          label="Mismatches"
          value={
            evidence.filter(
              (item) =>
                item.integrity ===
                "Mismatch",
            ).length
          }
          icon={
            <CircleAlert
              size={16}
            />
          }
        />
      </div>

      <div
        className="
          mb-4
          flex
          items-center
          justify-between
          px-1
        "
      >
        <p
          className="
            text-xs
            text-white/30
          "
        >
          {
            filteredEvidence.length
          }{" "}
          {filteredEvidence.length ===
          1
            ? "evidence record"
            : "evidence records"}
        </p>

        <p
          className="
            text-xs
            text-white/20
          "
        >
          SHA-256 enabled
        </p>
      </div>

      {/* EVIDENCE LIST */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
        "
      >
        {filteredEvidence.map(
          (
            item,
            index,
          ) => (
            <EvidenceCard
              key={
                item.id
              }
              evidence={
                item
              }
              index={
                index
              }
              onOpen={() =>
                setSelectedEvidence(
                  item,
                )
              }
            />
          ),
        )}

        {filteredEvidence.length ===
          0 && (
          <EmptyState
            title="No evidence found"
            description="Try changing your search or integrity filter."
            icon={
              <Search
                size={26}
              />
            }
          />
        )}
      </div>

      {/* EVIDENCE DETAILS */}

      <AnimatePresence>
        {selectedEvidence && (
          <EvidenceDetails
            evidence={
              selectedEvidence
            }
            onClose={() =>
              setSelectedEvidence(
                null,
              )
            }
          />
        )}
      </AnimatePresence>

      {/* REGISTER EVIDENCE MODAL */}

      <AnimatePresence>
        {registerOpen && (
          <>
            <ModalBackdrop
              onClose={
                closeRegistration
              }
            />

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 25,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: 15,
              }}
              transition={{
                type:
                  "spring",
                stiffness:
                  300,
                damping:
                  28,
              }}
              className="
                glass
                fixed
                left-1/2
                top-1/2
                z-[80]
                max-h-[calc(100vh_-_2rem)]
                w-[calc(100%_-_2rem)]
                max-w-[680px]
                -translate-x-1/2
                -translate-y-1/2
                overflow-y-auto
                rounded-[32px]
                p-6
                md:p-8
              "
            >
              <ModalHeader
                title="Register Evidence"
                description="Select a digital evidence file and TRACE-X will calculate its SHA-256 fingerprint."
                onClose={
                  closeRegistration
                }
              />

              <div
                className="
                  mt-7
                  space-y-5
                "
              >
                {/* DROP ZONE */}

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
                    fileInputRef.current?.click()
                  }
                  className={`
                    cursor-pointer
                    rounded-[26px]
                    border
                    border-dashed
                    p-7
                    transition
                    md:p-8

                    ${
                      dragActive
                        ? "border-blue-300/40 bg-blue-400/[0.08]"
                        : "border-white/15 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    className="hidden"
                    onChange={(
                      event,
                    ) => {
                      const file =
                        event
                          .target
                          .files?.[0]

                      if (
                        file
                      ) {
                        void processFile(
                          file,
                        )
                      }
                    }}
                  />

                  <div
                    className="
                      text-center
                    "
                  >
                    <div
                      className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-[20px]
                        border
                        border-white/10
                        bg-white/[0.05]
                      "
                    >
                      <UploadCloud
                        size={23}
                        className="
                          text-white/55
                        "
                      />
                    </div>

                    <p
                      className="
                        mt-4
                        text-sm
                        font-medium
                        text-white/75
                      "
                    >
                      {selectedFile
                        ? selectedFile.name
                        : "Drop evidence here"}
                    </p>

                    <p
                      className="
                        mt-2
                        text-xs
                        leading-5
                        text-white/25
                      "
                    >
                      {selectedFile
                        ? `${formatBytes(
                            selectedFile.size,
                          )} • Click to choose another file`
                        : "Drag and drop a file, or click to browse"}
                    </p>
                  </div>
                </div>

                {/* HASH RESULT */}

                {(hashing ||
                  hashValue ||
                  hashError) && (
                  <div
                    className="
                      rounded-[22px]
                      border
                      border-white/[0.08]
                      bg-black/20
                      p-4
                    "
                  >
                    {hashing && (
                      <div
                        className="
                          flex
                          items-center
                          gap-3
                        "
                      >
                        <LoaderCircle
                          size={18}
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
                            SHA-256
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              text-white/25
                            "
                          >
                            Reading the
                            exact contents
                            of the selected
                            file.
                          </p>
                        </div>
                      </div>
                    )}

                    {hashValue &&
                      !hashing && (
                        <>
                          <div
                            className="
                              flex
                              items-center
                              gap-2
                            "
                          >
                            <ShieldCheck
                              size={16}
                              className="
                                text-emerald-300
                              "
                            />

                            <p
                              className="
                                text-sm
                                text-emerald-200/75
                              "
                            >
                              SHA-256
                              generated
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
                              hashValue
                            }
                          </p>
                        </>
                      )}

                    {hashError && (
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <CircleAlert
                          size={18}
                          className="
                            mt-0.5
                            text-red-300
                          "
                        />

                        <p
                          className="
                            text-sm
                            leading-6
                            text-red-200/70
                          "
                        >
                          {
                            hashError
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* METADATA */}

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <FormField
                    label="Case"
                  >
                    <select
                      value={
                        selectedCaseId
                      }
                      onChange={(
                        event,
                      ) =>
                        setSelectedCaseId(
                          event.target
                            .value,
                        )
                      }
                      className={selectClass}
                    >
                      {cases.map(
                        (
                          item,
                        ) => (
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
                        evidenceType
                      }
                      onChange={(
                        event,
                      ) =>
                        setEvidenceType(
                          event.target
                            .value as EvidenceType,
                        )
                      }
                      className={selectClass}
                    >
                      <option value="Document">
                        Document
                      </option>

                      <option value="Disk Image">
                        Disk Image
                      </option>

                      <option value="Network Capture">
                        Network Capture
                      </option>

                      <option value="Log Archive">
                        Log Archive
                      </option>

                      <option value="Image">
                        Image
                      </option>

                      <option value="Video">
                        Video
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </FormField>

                  <FormField
                    label="Current custodian"
                  >
                    <select
                      value={
                        custodian
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustodian(
                          event.target
                            .value,
                        )
                      }
                      className={selectClass}
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
                  label="Evidence description"
                >
                  <textarea
                    value={
                      description
                    }
                    onChange={(
                      event,
                    ) =>
                      setDescription(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Describe where the evidence came from and how it was acquired..."
                    rows={4}
                    className={textareaClass}
                  />
                </FormField>

                <div
                  className="
                    rounded-[20px]
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
                    <HardDrive
                      size={17}
                      className="
                        mt-0.5
                        shrink-0
                        text-blue-300/70
                      "
                    />

                    <p
                      className="
                        text-xs
                        leading-5
                        text-white/30
                      "
                    >
                      This stage stores
                      only evidence
                      metadata and the
                      SHA-256 value in
                      browser memory.
                      The actual file is
                      not persisted yet.
                      Secure off-chain
                      storage will be
                      connected later.
                    </p>
                  </div>
                </div>
              </div>

              <ModalActions
                onCancel={
                  closeRegistration
                }
                onConfirm={
                  registerEvidence
                }
                confirmText="Register Evidence"
                disabled={
                  !selectedFile ||
                  !hashValue ||
                  hashing ||
                  !selectedCaseId
                }
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* =========================================================
   EVIDENCE CARD
========================================================= */

function EvidenceCard({
  evidence,
  index,
  onOpen,
}: {
  evidence:
    EvidenceRecord
  index: number
  onOpen: () => void
}) {
  return (
    <motion.button
      type="button"
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay:
          index *
          0.04,
      }}
      whileHover={{
        y: -2,
      }}
      whileTap={{
        scale:
          0.996,
      }}
      onClick={
        onOpen
      }
      className="
        glass
        w-full
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
            items-start
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
                evidence.type
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
                  text-white/85
                "
              >
                {
                  evidence.name
                }
              </h3>

              <IntegrityBadge
                integrity={
                  evidence.integrity
                }
              />
            </div>

            <p
              className="
                mt-1
                text-[11px]
                font-medium
                tracking-wide
                text-white/25
              "
            >
              {
                evidence.id
              }{" "}
              •{" "}
              {
                evidence.type
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
                evidence.hash
              }
            </p>
          </div>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-x-7
            gap-y-3
          "
        >
          <MetaItem
            label="CASE"
            value={
              evidence.caseId
            }
          />

          <MetaItem
            label="CUSTODIAN"
            value={
              evidence.custodian
            }
          />

          <MetaItem
            label="SIZE"
            value={formatBytes(
              evidence.size,
            )}
          />

          <MetaItem
            label="STATUS"
            value={
              evidence.status
            }
          />

          <ChevronRight
            size={18}
            className="
              ml-auto
              text-white/20
            "
          />
        </div>
      </div>
    </motion.button>
  )
}

/* =========================================================
   EVIDENCE DETAILS
========================================================= */

function EvidenceDetails({
  evidence,
  onClose,
}: {
  evidence:
    EvidenceRecord
  onClose:
    () => void
}) {
  const [
    copied,
    setCopied,
  ] =
    useState(false)

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(
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

  return (
    <>
      <ModalBackdrop
        onClose={
          onClose
        }
      />

      <motion.aside
        initial={{
          x: "100%",
        }}
        animate={{
          x: 0,
        }}
        exit={{
          x: "100%",
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
          max-w-[620px]
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
            gap-5
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-[19px]
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
            mt-8
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

            <EvidenceStatusBadge
              status={
                evidence.status
              }
            />
          </div>

          <p
            className="
              mt-5
              text-xs
              font-medium
              tracking-[0.13em]
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
              break-words
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
            grid-cols-1
            gap-3
            sm:grid-cols-2
          "
        >
          <DetailCard
            label="Case"
            value={
              evidence.caseId
            }
            icon={
              <FolderKanban
                size={15}
              />
            }
          />

          <DetailCard
            label="Custodian"
            value={
              evidence.custodian
            }
            icon={
              <UserRound
                size={15}
              />
            }
          />

          <DetailCard
            label="Evidence type"
            value={
              evidence.type
            }
            icon={
              <FileText
                size={15}
              />
            }
          />

          <DetailCard
            label="File size"
            value={formatBytes(
              evidence.size,
            )}
            icon={
              <HardDrive
                size={15}
              />
            }
          />

          <DetailCard
            label="Created"
            value={
              evidence.createdAt
            }
            icon={
              <CalendarDays
                size={15}
              />
            }
          />

          <DetailCard
            label="Updated"
            value={
              evidence.updatedAt
            }
            icon={
              <Clock3
                size={15}
              />
            }
          />
        </div>

        {/* HASH */}

        <div
          className="
            mt-8
          "
        >
          <SectionLabel>
            Cryptographic fingerprint
          </SectionLabel>

          <div
            className="
              mt-3
              rounded-[22px]
              border
              border-white/[0.08]
              bg-black/20
              p-4
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
                  gap-2
                "
              >
                <Hash
                  size={15}
                  className="
                    text-white/35
                  "
                />

                <span
                  className="
                    text-xs
                    text-white/40
                  "
                >
                  SHA-256
                </span>
              </div>

              <motion.button
                type="button"
                whileTap={{
                  scale: 0.92,
                }}
                onClick={() =>
                  void copyHash()
                }
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-white/[0.04]
                  px-3
                  py-2
                  text-[10px]
                  text-white/40
                  transition
                  hover:text-white/70
                "
              >
                <Copy
                  size={12}
                />

                {copied
                  ? "Copied"
                  : "Copy"}
              </motion.button>
            </div>

            <p
              className="
                mt-4
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

        {/* CASE */}

        <div
          className="
            mt-8
            rounded-[22px]
            border
            border-white/[0.07]
            bg-white/[0.025]
            p-5
          "
        >
          <p
            className="
              text-xs
              text-white/25
            "
          >
            ASSOCIATED CASE
          </p>

          <p
            className="
              mt-2
              text-sm
              font-medium
              text-white/65
            "
          >
            {
              evidence.caseTitle
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
              evidence.caseId
            }
          </p>
        </div>

        {/* VERSION HISTORY */}

        <div
          className="
            mt-8
          "
        >
          <SectionLabel>
            Version history
          </SectionLabel>

          <div
            className="
              mt-4
              space-y-3
            "
          >
            {evidence.versions.map(
              (
                version,
              ) => (
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
                      items-center
                      justify-between
                      gap-3
                    "
                  >
                    <p
                      className="
                        text-sm
                        text-white/65
                      "
                    >
                      Version{" "}
                      {
                        version.version
                      }
                    </p>

                    <span
                      className="
                        text-[10px]
                        text-white/25
                      "
                    >
                      {
                        version.createdAt
                      }
                    </span>
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
   BADGES
========================================================= */

function PriorityBadge({
  priority,
}: {
  priority:
    CasePriority
}) {
  const styles: Record<
    CasePriority,
    string
  > = {
    Low:
      "border-blue-400/15 bg-blue-400/[0.06] text-blue-200/65",

    Medium:
      "border-amber-400/15 bg-amber-400/[0.06] text-amber-200/65",

    High:
      "border-orange-400/15 bg-orange-400/[0.06] text-orange-200/70",

    Critical:
      "border-red-400/15 bg-red-400/[0.06] text-red-200/75",
  }

  return (
    <span
      className={`
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        ${styles[priority]}
      `}
    >
      {priority}
    </span>
  )
}

function StatusBadge({
  status,
}: {
  status:
    CaseStatus
}) {
  const styles: Record<
    CaseStatus,
    string
  > = {
    Open:
      "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200/70",

    "Under Review":
      "border-amber-400/15 bg-amber-400/[0.06] text-amber-200/70",

    Closed:
      "border-white/10 bg-white/[0.04] text-white/35",
  }

  return (
    <span
      className={`
        inline-flex
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        ${styles[status]}
      `}
    >
      {status}
    </span>
  )
}

function IntegrityBadge({
  integrity,
}: {
  integrity:
    EvidenceIntegrity
}) {
  const styles: Record<
    EvidenceIntegrity,
    string
  > = {
    Verified:
      "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200/70",

    Pending:
      "border-amber-400/15 bg-amber-400/[0.06] text-amber-200/70",

    Mismatch:
      "border-red-400/15 bg-red-400/[0.06] text-red-200/75",
  }

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
        ${styles[integrity]}
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

      {integrity}
    </span>
  )
}

function EvidenceStatusBadge({
  status,
}: {
  status:
    EvidenceStatus
}) {
  return (
    <span
      className="
        inline-flex
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

/* =========================================================
   SHARED COMPONENTS
========================================================= */

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div
      className="
        glass
        rounded-[22px]
        p-4
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
        "
      >
        <div
          className="
            text-white/30
          "
        >
          {icon}
        </div>

        <p
          className="
            text-xl
            font-semibold
          "
        >
          {value}
        </p>
      </div>

      <p
        className="
          mt-3
          text-xs
          text-white/35
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
          max-w-[150px]
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

function DetailCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
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
      <div
        className="
          flex
          items-center
          gap-2
          text-white/25
        "
      >
        {icon}

        <span
          className="
            text-[10px]
          "
        >
          {label.toUpperCase()}
        </span>
      </div>

      <p
        className="
          mt-3
          break-words
          text-sm
          text-white/65
        "
      >
        {value}
      </p>
    </div>
  )
}

function ActivityItem({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      className="
        flex
        gap-4
      "
    >
      <div
        className="
          flex
          flex-col
          items-center
        "
      >
        <div
          className="
            mt-1
            h-2
            w-2
            rounded-full
            bg-white/40
          "
        />

        <div
          className="
            mt-2
            h-full
            w-px
            bg-white/[0.07]
          "
        />
      </div>

      <div
        className="
          pb-3
        "
      >
        <p
          className="
            text-sm
            text-white/60
          "
        >
          {title}
        </p>

        <p
          className="
            mt-1
            text-xs
            text-white/25
          "
        >
          {description}
        </p>
      </div>
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
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
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
        gap-5
      "
    >
      <div>
        <p
          className="
            text-xs
            font-medium
            tracking-[0.15em]
            text-white/30
          "
        >
          TRACE-X
        </p>

        <h3
          className="
            mt-2
            text-2xl
            font-semibold
            tracking-[-0.03em]
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-2
            max-w-lg
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
    <motion.button
      type="button"
      whileTap={{
        scale: 0.9,
      }}
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
        transition
        hover:text-white
      "
    >
      <X size={17} />
    </motion.button>
  )
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmText,
  disabled = false,
}: {
  onCancel:
    () => void
  onConfirm:
    () => void
  confirmText: string
  disabled?: boolean
}) {
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
        onClick={
          onCancel
        }
        className="
          h-11
          rounded-2xl
          px-5
          text-sm
          text-white/40
          transition
          hover:bg-white/[0.05]
          hover:text-white/70
        "
      >
        Cancel
      </button>

      <motion.button
        type="button"
        disabled={
          disabled
        }
        whileHover={
          disabled
            ? {}
            : {
                scale:
                  1.02,
              }
        }
        whileTap={
          disabled
            ? {}
            : {
                scale:
                  0.97,
              }
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
          transition

          ${
            disabled
              ? "cursor-not-allowed bg-white/20 text-white/30"
              : "bg-white text-black"
          }
        `}
      >
        <Plus size={16} />

        {confirmText}
      </motion.button>
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
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
        min-h-[320px]
        items-center
        justify-center
        rounded-[28px]
        p-8
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

function Divider() {
  return (
    <div
      className="
        my-8
        h-px
        bg-gradient-to-r
        from-transparent
        via-white/10
        to-transparent
      "
    />
  )
}

function SectionLabel({
  children,
}: {
  children:
    ReactNode
}) {
  return (
    <p
      className="
        text-xs
        font-medium
        uppercase
        tracking-[0.15em]
        text-white/25
      "
    >
      {children}
    </p>
  )
}

/* =========================================================
   PLACEHOLDER PAGES
========================================================= */

function PlaceholderPage({
  page,
}: {
  page: Page
}) {
  const icons = {
    cases:
      FolderKanban,

    evidence:
      FileText,

    transfers:
      ArrowLeftRight,

    verify:
      ScanSearch,

    audit:
      Activity,

    dashboard:
      LayoutDashboard,
  }

  const Icon =
    icons[page]

  return (
    <div
      className="
        glass
        flex
        min-h-[460px]
        items-center
        justify-center
        rounded-[30px]
        p-8
        text-center
      "
    >
      <div>
        <div
          className="
            mx-auto
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-[22px]
            border
            border-white/10
            bg-white/[0.05]
          "
        >
          <Icon
            size={25}
            className="
              text-white/45
            "
          />
        </div>

        <h3
          className="
            mt-6
            text-xl
            font-medium
            tracking-tight
          "
        >
          {
            pageInfo[
              page
            ].title
          }
        </h3>

        <p
          className="
            mx-auto
            mt-2
            max-w-md
            text-sm
            leading-6
            text-white/30
          "
        >
          This module is
          ready for us to
          build next.
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   LOGIN SCREEN
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

      <header
        className="
          absolute
          left-0
          right-0
          top-0
          z-20
          flex
          items-center
          justify-between
          px-6
          py-6
          md:px-10
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
              glass
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-2xl
            "
          >
            <Fingerprint
              size={20}
            />
          </div>

          <div>
            <p
              className="
                text-sm
                font-semibold
                tracking-[0.2em]
              "
            >
              TRACE-X
            </p>

            <p
              className="
                text-[10px]
                text-white/35
              "
            >
              Digital Evidence
              Integrity
            </p>
          </div>
        </div>

        <div
          className="
            hidden
            items-center
            gap-2
            rounded-full
            border
            border-white/10
            bg-white/5
            px-4
            py-2
            text-xs
            text-white/40
            backdrop-blur-xl
            md:flex
          "
        >
          <ShieldCheck
            size={14}
          />

          Secure forensic
          environment
        </div>
      </header>

      <div
        className="
          relative
          z-10
          flex
          min-h-screen
          items-center
          justify-center
          px-5
          py-28
        "
      >
        <motion.section
          initial={{
            opacity: 0,
            scale: 0.96,
            y: 30,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            duration: 0.75,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="
            glass
            w-full
            max-w-[440px]
            rounded-[34px]
            p-7
            md:p-9
          "
        >
          <div
            className="
              mb-8
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
              text-[32px]
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
              text-white/40
            "
          >
            Sign in to securely
            manage digital
            evidence, custody
            records, and
            blockchain
            verification.
          </p>

          <form
            onSubmit={(
              event,
            ) => {
              event.preventDefault()

              onLogin()
            }}
            className="
              mt-8
              space-y-4
            "
          >
            <FormField
              label="Email"
            >
              <input
                type="email"
                placeholder="investigator@tracex.local"
                className={inputClass}
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
                  placeholder="Enter your password"
                  className={`${inputClass} pr-16`}
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
                    transition
                    hover:text-white/70
                  "
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </FormField>

            <motion.button
              type="submit"
              whileHover={{
                scale: 1.015,
              }}
              whileTap={{
                scale: 0.975,
              }}
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
            </motion.button>
          </form>
        </motion.section>
      </div>
    </main>
  )
}

/* =========================================================
   AMBIENT BACKGROUND
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
            10,
            0,
          ],

          y: [
            0,
            40,
            80,
            0,
          ],

          scale: [
            1,
            1.12,
            0.95,
            1,
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease:
            "easeInOut",
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
            -15,
            0,
          ],

          y: [
            0,
            -50,
            -80,
            0,
          ],

          scale: [
            1,
            0.92,
            1.1,
            1,
          ],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease:
            "easeInOut",
        }}
      />
    </div>
  )
}

/* =========================================================
   SHA-256
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

  const hashArray =
    Array.from(
      new Uint8Array(
        digest,
      ),
    )

  return hashArray
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

/* =========================================================
   FILE TYPE DETECTION
========================================================= */

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

/* =========================================================
   SIZE FORMATTING
========================================================= */

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
    Math.floor(
      Math.log(
        bytes,
      ) /
        Math.log(
          1024,
        ),
    )

  const value =
    bytes /
    Math.pow(
      1024,
      index,
    )

  return `${value.toFixed(
    index === 0
      ? 0
      : 1,
  )} ${units[index]}`
}

/* =========================================================
   SHARED FORM CLASSES
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
`

export default App