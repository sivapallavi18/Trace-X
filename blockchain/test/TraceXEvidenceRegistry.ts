import assert from "node:assert/strict"

import {
  describe,
  it,
} from "node:test"

import hre from "hardhat"

import {
  keccak256,
  toBytes,
  type Hex,
} from "viem"

/* =========================================================
   HARDHAT TEST NETWORK
========================================================= */

const {
  viem,
  networkHelpers,
} =
  await hre.network.create()

/* =========================================================
   TEST VALUES
========================================================= */

const EVIDENCE_KEY =
  keccak256(
    toBytes(
      "EV-2026-0125",
    ),
  )

const HASH_VERSION_1: Hex =
  "0x91b8f6a4d38e9f72c4a10e8f09dd6b8342ae6ef10b47a9ef67b6fd308a3f2521"

const HASH_VERSION_2: Hex =
  "0x51be229f0da3d17d7cc581d89cc4fcf953e3e35fb331b1a725967a987e2c89aa"

const WRONG_HASH: Hex =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

/* =========================================================
   TEST SUITE
========================================================= */

describe(
  "TraceXEvidenceRegistry",

  function () {
    async function deployRegistryFixture() {
      const registry =
        await viem.deployContract(
          "TraceXEvidenceRegistry",
        )

      const [
        ownerWallet,
        secondWallet,
      ] =
        await viem.getWalletClients()

      return {
        registry,
        ownerWallet,
        secondWallet,
      }
    }

    /* -----------------------------------------------------
       OWNER
    ----------------------------------------------------- */

    it(
      "authorizes the deploying wallet",

      async function () {
        const {
          registry,
          ownerWallet,
        } =
          await networkHelpers.loadFixture(
            deployRegistryFixture,
          )

        const owner =
          await registry.read.owner()

        assert.equal(
          owner.toLowerCase(),
          ownerWallet
            .account
            .address
            .toLowerCase(),
        )

        const authorized =
          await registry
            .read
            .authorizedWriters([
              ownerWallet
                .account
                .address,
            ])

        assert.equal(
          authorized,
          true,
        )
      },
    )

    /* -----------------------------------------------------
       FIRST VERSION
    ----------------------------------------------------- */

    it(
      "anchors a SHA-256 evidence fingerprint",

      async function () {
        const {
          registry,
        } =
          await networkHelpers.loadFixture(
            deployRegistryFixture,
          )

        await registry
          .write
          .anchorEvidenceVersion([
            EVIDENCE_KEY,
            HASH_VERSION_1,
          ])

        const version =
          await registry
            .read
            .latestVersion([
              EVIDENCE_KEY,
            ])

        /*
         * latestVersion is uint32.
         * Viem returns uint32 as a JavaScript number.
         */
        assert.equal(
          version,
          1,
        )

        const verified =
          await registry
            .read
            .verifyEvidence([
              EVIDENCE_KEY,
              1,
              HASH_VERSION_1,
            ])

        assert.equal(
          verified,
          true,
        )
      },
    )

    /* -----------------------------------------------------
       VERSIONING
    ----------------------------------------------------- */

    it(
      "keeps multiple evidence versions independently",

      async function () {
        const {
          registry,
        } =
          await networkHelpers.loadFixture(
            deployRegistryFixture,
          )

        await registry
          .write
          .anchorEvidenceVersion([
            EVIDENCE_KEY,
            HASH_VERSION_1,
          ])

        await registry
          .write
          .anchorEvidenceVersion([
            EVIDENCE_KEY,
            HASH_VERSION_2,
          ])

        const latestVersion =
          await registry
            .read
            .latestVersion([
              EVIDENCE_KEY,
            ])

        /*
         * latestVersion is uint32,
         * therefore Viem returns number, not bigint.
         */
        assert.equal(
          latestVersion,
          2,
        )

        const versionOneStillValid =
          await registry
            .read
            .verifyEvidence([
              EVIDENCE_KEY,
              1,
              HASH_VERSION_1,
            ])

        const versionTwoValid =
          await registry
            .read
            .verifyEvidence([
              EVIDENCE_KEY,
              2,
              HASH_VERSION_2,
            ])

        const wrongHashValid =
          await registry
            .read
            .verifyEvidence([
              EVIDENCE_KEY,
              2,
              WRONG_HASH,
            ])

        assert.equal(
          versionOneStillValid,
          true,
        )

        assert.equal(
          versionTwoValid,
          true,
        )

        assert.equal(
          wrongHashValid,
          false,
        )
      },
    )

    /* -----------------------------------------------------
       CUSTODY EVENT
    ----------------------------------------------------- */

    it(
      "records custody-event digests",

      async function () {
        const {
          registry,
        } =
          await networkHelpers.loadFixture(
            deployRegistryFixture,
          )

        await registry
          .write
          .anchorEvidenceVersion([
            EVIDENCE_KEY,
            HASH_VERSION_1,
          ])

        const eventDigest =
          keccak256(
            toBytes(
              "EV-2026-0125|VERIFIED|TEST",
            ),
          )

        await registry
          .write
          .recordCustodyEvent([
            EVIDENCE_KEY,
            4,
            eventDigest,
          ])

        const count =
          await registry
            .read
            .custodyEventCount([
              EVIDENCE_KEY,
            ])

        /*
         * custodyEventCount is uint64.
         * Viem returns this as bigint.
         *
         * So 1n is correct here.
         */
        assert.equal(
          count,
          1n,
        )
      },
    )

    /* -----------------------------------------------------
       ACCESS CONTROL
    ----------------------------------------------------- */

    it(
      "rejects unauthorized writers and accepts authorized writers",

      async function () {
        const {
          registry,
          secondWallet,
        } =
          await networkHelpers.loadFixture(
            deployRegistryFixture,
          )

        await viem
          .assertions
          .revertWith(
            registry
              .write
              .anchorEvidenceVersion(
                [
                  EVIDENCE_KEY,
                  HASH_VERSION_1,
                ],
                {
                  account:
                    secondWallet.account,
                },
              ),

            "TRACE-X: writer not authorized",
          )

        await registry
          .write
          .setWriter([
            secondWallet
              .account
              .address,

            true,
          ])

        await registry
          .write
          .anchorEvidenceVersion(
            [
              EVIDENCE_KEY,
              HASH_VERSION_1,
            ],
            {
              account:
                secondWallet.account,
            },
          )

        const version =
          await registry
            .read
            .latestVersion([
              EVIDENCE_KEY,
            ])

        /*
         * uint32 → JavaScript number
         */
        assert.equal(
          version,
          1,
        )
      },
    )
  },
)