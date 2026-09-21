// SPDX-License-Identifier: MIT

pragma solidity ^0.8.34;

/**
 * @title TraceXEvidenceRegistry
 * @notice Tamper-evident blockchain registry for TRACE-X.
 *
 * IMPORTANT:
 *
 * This contract does NOT store:
 * - evidence files
 * - filenames
 * - case descriptions
 * - investigator names
 * - personal information
 *
 * It stores only cryptographic identifiers and hashes.
 */
contract TraceXEvidenceRegistry {
    /* =====================================================
       CUSTODY ACTION CODES
    ===================================================== */

    uint8 public constant ACTION_REGISTERED = 1;
    uint8 public constant ACTION_TRANSFERRED = 2;
    uint8 public constant ACTION_RECEIVED = 3;
    uint8 public constant ACTION_VERIFIED = 4;
    uint8 public constant ACTION_SEALED = 5;
    uint8 public constant ACTION_ARCHIVED = 6;

    /* =====================================================
       OWNERSHIP
    ===================================================== */

    address public immutable owner;

    mapping(address => bool) public authorizedWriters;

    /* =====================================================
       EVIDENCE ANCHORS
    ===================================================== */

    struct EvidenceAnchor {
        bytes32 sha256Hash;
        uint64 anchoredAt;
        address anchoredBy;
    }

    /*
     * evidenceKey
     *      ↓
     * version
     *      ↓
     * EvidenceAnchor
     */
    mapping(
        bytes32 => mapping(uint32 => EvidenceAnchor)
    ) private evidenceAnchors;

    /*
     * Latest blockchain version for each evidence key.
     */
    mapping(bytes32 => uint32) public latestVersion;

    /*
     * Number of custody events recorded for each evidence.
     */
    mapping(bytes32 => uint64) public custodyEventCount;

    /* =====================================================
       EVENTS
    ===================================================== */

    event WriterAuthorizationChanged(
        address indexed writer,
        bool authorized
    );

    event EvidenceVersionAnchored(
        bytes32 indexed evidenceKey,
        uint32 indexed version,
        bytes32 indexed sha256Hash,
        address anchoredBy,
        uint64 anchoredAt
    );

    event CustodyEventAnchored(
        bytes32 indexed evidenceKey,
        uint64 indexed sequence,
        uint8 actionCode,
        bytes32 indexed eventDigest,
        address recordedBy,
        uint64 recordedAt
    );

    /* =====================================================
       CONSTRUCTOR
    ===================================================== */

    constructor() {
        owner = msg.sender;

        authorizedWriters[msg.sender] = true;

        emit WriterAuthorizationChanged(
            msg.sender,
            true
        );
    }

    /* =====================================================
       MODIFIERS
    ===================================================== */

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "TRACE-X: owner only"
        );

        _;
    }

    modifier onlyWriter() {
        require(
            authorizedWriters[msg.sender],
            "TRACE-X: writer not authorized"
        );

        _;
    }

    /* =====================================================
       WRITER MANAGEMENT
    ===================================================== */

    /**
     * @notice Authorize or revoke a blockchain writer.
     *
     * Later the TRACE-X backend wallet will be an authorized
     * writer.
     */
    function setWriter(
        address writer,
        bool authorized
    )
        external
        onlyOwner
    {
        require(
            writer != address(0),
            "TRACE-X: zero writer"
        );

        authorizedWriters[writer] = authorized;

        emit WriterAuthorizationChanged(
            writer,
            authorized
        );
    }

    /* =====================================================
       EVIDENCE VERSION ANCHORING
    ===================================================== */

    /**
     * @notice Anchors one SHA-256 evidence fingerprint.
     *
     * evidenceKey:
     *   keccak256 of TRACE-X's internal evidence ID.
     *
     * sha256Hash:
     *   SHA-256 calculated from the actual evidence bytes.
     *
     * Example:
     *
     * EV-2026-0125
     *      │
     *      ▼
     * keccak256("EV-2026-0125")
     *      │
     *      ▼
     * evidenceKey
     *
     * test-evidence.txt
     *      │
     *      ▼
     * SHA-256(file bytes)
     *      │
     *      ▼
     * sha256Hash
     */
    function anchorEvidenceVersion(
        bytes32 evidenceKey,
        bytes32 sha256Hash
    )
        external
        onlyWriter
        returns (uint32 version)
    {
        require(
            evidenceKey != bytes32(0),
            "TRACE-X: zero evidence key"
        );

        require(
            sha256Hash != bytes32(0),
            "TRACE-X: zero evidence hash"
        );

        version =
            latestVersion[evidenceKey] + 1;

        evidenceAnchors[
            evidenceKey
        ][
            version
        ] = EvidenceAnchor({
            sha256Hash:
                sha256Hash,

            anchoredAt:
                uint64(block.timestamp),

            anchoredBy:
                msg.sender
        });

        latestVersion[
            evidenceKey
        ] = version;

        emit EvidenceVersionAnchored(
            evidenceKey,
            version,
            sha256Hash,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    /* =====================================================
       CUSTODY EVENTS
    ===================================================== */

    /**
     * @notice Anchors a digest representing a custody event.
     *
     * The blockchain receives only eventDigest.
     *
     * Sensitive event metadata stays in PostgreSQL.
     */
    function recordCustodyEvent(
        bytes32 evidenceKey,
        uint8 actionCode,
        bytes32 eventDigest
    )
        external
        onlyWriter
        returns (uint64 sequence)
    {
        require(
            latestVersion[evidenceKey] > 0,
            "TRACE-X: evidence not anchored"
        );

        require(
            actionCode >= ACTION_REGISTERED &&
            actionCode <= ACTION_ARCHIVED,
            "TRACE-X: invalid custody action"
        );

        require(
            eventDigest != bytes32(0),
            "TRACE-X: zero event digest"
        );

        sequence =
            custodyEventCount[evidenceKey] + 1;

        custodyEventCount[
            evidenceKey
        ] = sequence;

        emit CustodyEventAnchored(
            evidenceKey,
            sequence,
            actionCode,
            eventDigest,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    /* =====================================================
       READ ANCHOR
    ===================================================== */

    function getAnchor(
        bytes32 evidenceKey,
        uint32 version
    )
        external
        view
        returns (
            bytes32 sha256Hash,
            uint64 anchoredAt,
            address anchoredBy
        )
    {
        require(
            version > 0 &&
            version <= latestVersion[evidenceKey],
            "TRACE-X: anchor not found"
        );

        EvidenceAnchor memory anchor =
            evidenceAnchors[
                evidenceKey
            ][
                version
            ];

        return (
            anchor.sha256Hash,
            anchor.anchoredAt,
            anchor.anchoredBy
        );
    }

    /* =====================================================
       BLOCKCHAIN HASH VERIFICATION
    ===================================================== */

    /**
     * @notice Compares a supplied SHA-256 value with the
     * blockchain anchor.
     */
    function verifyEvidence(
        bytes32 evidenceKey,
        uint32 version,
        bytes32 sha256Hash
    )
        external
        view
        returns (bool)
    {
        if (
            version == 0 ||
            version > latestVersion[evidenceKey]
        ) {
            return false;
        }

        return
            evidenceAnchors[
                evidenceKey
            ][
                version
            ].sha256Hash ==
            sha256Hash;
    }
}