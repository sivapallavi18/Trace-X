import "dotenv/config"

import {
  createHash,
} from "node:crypto"

import {
  anchorEvidenceOnBlockchain,
  getBlockchainStatus,
  verifyEvidenceOnBlockchain,
} from "./blockchain"

/* =========================================================
   TRACE-X BLOCKCHAIN SMOKE TEST
========================================================= */

async function run() {
  console.log("")
  console.log(
    "======================================",
  )
  console.log(
    "    TRACE-X BLOCKCHAIN SMOKE TEST",
  )
  console.log(
    "======================================",
  )

  /* -------------------------------------------------------
     CONNECTION TEST
  ------------------------------------------------------- */

  console.log("")
  console.log(
    "1. Connecting to Hardhat...",
  )

  const status =
    await getBlockchainStatus()

  console.log(
    `   Connected: ${status.connected}`,
  )

  console.log(
    `   Chain ID: ${status.chainId}`,
  )

  console.log(
    `   Current block: ${status.blockNumber}`,
  )

  console.log(
    `   Contract: ${status.contractAddress}`,
  )

  console.log(
    `   Contract deployed: ${status.contractDeployed}`,
  )

  console.log(
    `   Writer: ${status.writerAddress}`,
  )

  console.log(
    `   Writer authorized: ${status.writerAuthorized}`,
  )

  if (
    !status.writerAuthorized
  ) {
    throw new Error(
      "The backend development writer is not authorized.",
    )
  }

  /* -------------------------------------------------------
     CREATE TEST EVIDENCE VALUES
  ------------------------------------------------------- */

  const evidenceId =
    `TRACE-X-SMOKE-${Date.now()}`

  const testBytes =
    Buffer.from(
      "TRACE-X blockchain integration smoke test",
      "utf8",
    )

  const sha256Hash =
    createHash(
      "sha256",
    )
      .update(
        testBytes,
      )
      .digest(
        "hex",
      )

  console.log("")
  console.log(
    "2. Test evidence created",
  )

  console.log(
    `   Evidence ID: ${evidenceId}`,
  )

  console.log(
    `   SHA-256: ${sha256Hash}`,
  )

  /* -------------------------------------------------------
     WRITE TO BLOCKCHAIN
  ------------------------------------------------------- */

  console.log("")
  console.log(
    "3. Anchoring SHA-256...",
  )

  const anchor =
    await anchorEvidenceOnBlockchain(
      evidenceId,
      sha256Hash,
    )

  console.log(
    "   Blockchain anchor created.",
  )

  console.log(
    `   Evidence key: ${anchor.evidenceKey}`,
  )

  console.log(
    `   Version: ${anchor.version}`,
  )

  console.log(
    `   Transaction: ${anchor.transactionHash}`,
  )

  console.log(
    `   Block: ${anchor.blockNumber}`,
  )

  /* -------------------------------------------------------
     CORRECT HASH VERIFICATION
  ------------------------------------------------------- */

  console.log("")
  console.log(
    "4. Verifying correct SHA-256...",
  )

  const correctVerification =
    await verifyEvidenceOnBlockchain(
      evidenceId,
      anchor.version,
      sha256Hash,
    )

  console.log(
    `   Verified: ${correctVerification.verified}`,
  )

  if (
    !correctVerification.verified
  ) {
    throw new Error(
      "The correct SHA-256 did not verify against the blockchain.",
    )
  }

  /* -------------------------------------------------------
     WRONG HASH VERIFICATION
  ------------------------------------------------------- */

  const wrongHash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

  console.log("")
  console.log(
    "5. Testing modified SHA-256...",
  )

  const wrongVerification =
    await verifyEvidenceOnBlockchain(
      evidenceId,
      anchor.version,
      wrongHash,
    )

  console.log(
    `   Verified: ${wrongVerification.verified}`,
  )

  if (
    wrongVerification.verified
  ) {
    throw new Error(
      "A deliberately incorrect SHA-256 unexpectedly verified.",
    )
  }

  /* -------------------------------------------------------
     SUCCESS
  ------------------------------------------------------- */

  console.log("")
  console.log(
    "======================================",
  )
  console.log(
    "       BLOCKCHAIN TEST PASSED",
  )
  console.log(
    "======================================",
  )

  console.log("")
  console.log(
    "Express/Node can now:",
  )

  console.log(
    "✓ connect to Hardhat",
  )

  console.log(
    "✓ find the TRACE-X contract",
  )

  console.log(
    "✓ use an authorized writer",
  )

  console.log(
    "✓ anchor a SHA-256",
  )

  console.log(
    "✓ receive a transaction receipt",
  )

  console.log(
    "✓ verify the original SHA-256",
  )

  console.log(
    "✓ reject a different SHA-256",
  )

  console.log("")
}

/* =========================================================
   RUN
========================================================= */

run()
  .catch(
    (error) => {
      console.error("")
      console.error(
        "======================================",
      )

      console.error(
        "       BLOCKCHAIN TEST FAILED",
      )

      console.error(
        "======================================",
      )

      console.error("")
      console.error(
        error,
      )
      console.error("")

      process.exitCode =
        1
    },
  )
  .finally(
    async () => {
      /*
       * JsonRpcProvider uses background resources.
       * Destroying it lets this standalone script terminate
       * cleanly when the smoke test finishes.
       */

      const {
        blockchainProvider,
      } =
        await import(
          "./blockchain"
        )

      blockchainProvider
        .destroy()
    },
  )