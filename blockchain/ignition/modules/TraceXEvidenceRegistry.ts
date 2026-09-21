import {
  buildModule,
} from "@nomicfoundation/hardhat-ignition/modules"

/* =========================================================
   TRACE-X SMART CONTRACT DEPLOYMENT
========================================================= */

export default buildModule(
  "TraceXEvidenceRegistryModule",

  (module) => {
    const registry =
      module.contract(
        "TraceXEvidenceRegistry",
      )

    return {
      registry,
    }
  },
)