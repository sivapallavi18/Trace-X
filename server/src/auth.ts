import {
  randomBytes,
} from "node:crypto"

import bcrypt from "bcryptjs"

import jwt, {
  type JwtPayload,
} from "jsonwebtoken"

import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express"

import {
  database,
} from "./database"

/* =========================================================
   TRACE-X AUTHENTICATION
========================================================= */

export type UserRole =
  | "Investigator"
  | "Forensic Analyst"
  | "Supervisor"
  | "Reviewer"
  | "Admin"

export type AuthContext = {
  userId: number
  email: string
  name: string
  role: UserRole
}

export type AuthenticatedRequest =
  Request & {
    auth?: AuthContext
  }

/* =========================================================
   CONFIGURATION
========================================================= */

const NODE_ENV =
  process.env.NODE_ENV ||
  "development"

const configuredJwtSecret =
  process.env.JWT_SECRET
    ?.trim()

const JWT_SECRET =
  configuredJwtSecret ||
  (
    NODE_ENV ===
    "production"
      ? ""
      : randomBytes(
          48,
        ).toString(
          "hex",
        )
  )

const DEMO_PASSWORD =
  process.env.AUTH_DEMO_PASSWORD ||
  (
    NODE_ENV ===
    "production"
      ? ""
      : "TraceX@2026!"
  )

const JWT_ISSUER =
  "trace-x"

const JWT_AUDIENCE =
  "trace-x-web"

const JWT_EXPIRATION =
  "8h"

/* =========================================================
   DATABASE ROW
========================================================= */

type UserRow = {
  id: number | string
  email: string
  name: string
  role: UserRole
  password_hash: string
  active: boolean
  created_at: Date | string
  updated_at: Date | string
  last_login_at: Date | string | null
}

/* =========================================================
   DEMO USERS
========================================================= */

const DEMO_USERS: Array<{
  email: string
  name: string
  role: UserRole
}> = [
  {
    email:
      "investigator@tracex.local",

    name:
      "Investigator A",

    role:
      "Investigator",
  },

  {
    email:
      "analyst@tracex.local",

    name:
      "Forensic Analyst A",

    role:
      "Forensic Analyst",
  },

  {
    email:
      "supervisor@tracex.local",

    name:
      "Supervisor A",

    role:
      "Supervisor",
  },

  {
    email:
      "reviewer@tracex.local",

    name:
      "Evidence Reviewer A",

    role:
      "Reviewer",
  },

  {
    email:
      "admin@tracex.local",

    name:
      "TRACE-X Admin",

    role:
      "Admin",
  },
]

/* =========================================================
   INITIALIZE AUTHENTICATION
========================================================= */

export async function initializeAuthentication() {
  if (
    !JWT_SECRET
  ) {
    throw new Error(
      "JWT_SECRET must be configured when NODE_ENV=production.",
    )
  }

  if (
    !DEMO_PASSWORD
  ) {
    throw new Error(
      "AUTH_DEMO_PASSWORD must be configured when NODE_ENV=production.",
    )
  }

  if (
    DEMO_PASSWORD.length <
    8
  ) {
    throw new Error(
      "AUTH_DEMO_PASSWORD must contain at least 8 characters.",
    )
  }

  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,

      email TEXT NOT NULL
        UNIQUE,

      name TEXT NOT NULL,

      role TEXT NOT NULL
        CHECK (
          role IN (
            'Investigator',
            'Forensic Analyst',
            'Supervisor',
            'Reviewer',
            'Admin'
          )
        ),

      password_hash TEXT NOT NULL,

      active BOOLEAN NOT NULL
        DEFAULT TRUE,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      last_login_at TIMESTAMPTZ
    )
  `)

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role)
  `)

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_users_active
    ON users(active)
  `)

  /*
   * Development seed accounts.
   *
   * All demo accounts use the same password only for the
   * current local capstone environment.
   */
  const passwordHash =
    await bcrypt.hash(
      DEMO_PASSWORD,
      12,
    )

  for (
    const user
    of DEMO_USERS
  ) {
    await database.query(
      `
        INSERT INTO users (
          email,
          name,
          role,
          password_hash,
          active
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          TRUE
        )

        ON CONFLICT (
          email
        )

        DO UPDATE SET
          name =
            EXCLUDED.name,

          role =
            EXCLUDED.role,

          password_hash =
            EXCLUDED.password_hash,

          active =
            TRUE,

          updated_at =
            NOW()
      `,
      [
        user.email,
        user.name,
        user.role,
        passwordHash,
      ],
    )
  }

  if (
    !configuredJwtSecret &&
    NODE_ENV !==
    "production"
  ) {
    console.warn(
      "Authentication warning: JWT_SECRET is not configured.",
    )

    console.warn(
      "TRACE-X is using an ephemeral development JWT secret. Login tokens will become invalid whenever the backend restarts.",
    )
  }
}

/* =========================================================
   TOKEN
========================================================= */

function createToken(
  user: AuthContext,
) {
  return jwt.sign(
    {
      email:
        user.email,

      name:
        user.name,

      role:
        user.role,
    },

    JWT_SECRET,

    {
      algorithm:
        "HS256",

      subject:
        String(
          user.userId,
        ),

      issuer:
        JWT_ISSUER,

      audience:
        JWT_AUDIENCE,

      expiresIn:
        JWT_EXPIRATION,
    },
  )
}

/* =========================================================
   PUBLIC USER OBJECT
========================================================= */

function mapPublicUser(
  row: UserRow,
) {
  return {
    id:
      Number(
        row.id,
      ),

    email:
      row.email,

    name:
      row.name,

    role:
      row.role,

    active:
      row.active,

    createdAt:
      new Date(
        row.created_at,
      ).toISOString(),

    lastLoginAt:
      row.last_login_at
        ? new Date(
            row.last_login_at,
          ).toISOString()
        : null,
  }
}

/* =========================================================
   REQUIRE AUTHENTICATION
========================================================= */

export const requireAuth:
  RequestHandler =
  async (
    request:
      Request,

    response:
      Response,

    next:
      NextFunction,
  ) => {
    try {
      const authorization =
        request.headers.authorization

      if (
        !authorization ||
        !authorization.startsWith(
          "Bearer ",
        )
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication is required.",
          })

        return
      }

      const token =
        authorization
          .slice(
            "Bearer ".length,
          )
          .trim()

      if (
        !token
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication token is missing.",
          })

        return
      }

      let payload:
        JwtPayload

      try {
        payload =
          jwt.verify(
            token,
            JWT_SECRET,
            {
              algorithms: [
                "HS256",
              ],

              issuer:
                JWT_ISSUER,

              audience:
                JWT_AUDIENCE,
            },
          ) as JwtPayload
      } catch {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication token is invalid or expired.",
          })

        return
      }

      const userId =
        Number(
          payload.sub,
        )

      if (
        !Number.isInteger(
          userId,
        ) ||
        userId <= 0
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication token is invalid.",
          })

        return
      }

      const result =
        await database.query<UserRow>(
          `
            SELECT
              id,
              email,
              name,
              role,
              password_hash,
              active,
              created_at,
              updated_at,
              last_login_at

            FROM users

            WHERE
              id = $1
              AND active = TRUE
          `,
          [
            userId,
          ],
        )

      if (
        result.rows.length ===
        0
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "The authenticated TRACE-X user no longer exists or has been disabled.",
          })

        return
      }

      const user =
        result.rows[0]

      const authenticatedRequest =
        request as
          AuthenticatedRequest

      authenticatedRequest.auth = {
        userId:
          Number(
            user.id,
          ),

        email:
          user.email,

        name:
          user.name,

        role:
          user.role,
      }

      next()
    } catch (error) {
      console.error(
        "TRACE-X authentication middleware failed:",
        error,
      )

      response
        .status(500)
        .json({
          success:
            false,

          message:
            "Authentication service failed.",
        })
    }
  }

/* =========================================================
   REQUIRE ROLE
========================================================= */

export function requireRoles(
  ...allowedRoles:
    UserRole[]
):
  RequestHandler {
  return (
    request:
      Request,

    response:
      Response,

    next:
      NextFunction,
  ) => {
    const authenticatedRequest =
      request as
        AuthenticatedRequest

    const auth =
      authenticatedRequest.auth

    if (
      !auth
    ) {
      response
        .status(401)
        .json({
          success:
            false,

          message:
            "Authentication is required.",
        })

      return
    }

    if (
      !allowedRoles.includes(
        auth.role,
      )
    ) {
      response
        .status(403)
        .json({
          success:
            false,

          message:
            `Role '${auth.role}' is not permitted to perform this operation.`,
        })

      return
    }

    next()
  }
}

/* =========================================================
   AUTH CONTEXT
========================================================= */

export function getAuthContext(
  request:
    Request,
) {
  const auth =
    (
      request as
        AuthenticatedRequest
    ).auth

  if (
    !auth
  ) {
    throw new Error(
      "TRACE-X authenticated user context is unavailable.",
    )
  }

  return auth
}

/* =========================================================
   AUTH ROUTER
========================================================= */

export const authRouter =
  Router()

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */

authRouter.post(
  "/login",

  async (
    request:
      Request,

    response:
      Response,
  ) => {
    try {
      const {
        email,
        password,
      } =
        request.body

      if (
        typeof email !==
          "string" ||
        !email.trim()
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Email is required.",
          })

        return
      }

      if (
        typeof password !==
          "string" ||
        !password
      ) {
        response
          .status(400)
          .json({
            success:
              false,

            message:
              "Password is required.",
          })

        return
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase()

      const result =
        await database.query<UserRow>(
          `
            SELECT
              id,
              email,
              name,
              role,
              password_hash,
              active,
              created_at,
              updated_at,
              last_login_at

            FROM users

            WHERE
              email = $1
          `,
          [
            normalizedEmail,
          ],
        )

      /*
       * Intentionally use the same generic error for an
       * unknown email and incorrect password.
       */
      if (
        result.rows.length ===
        0
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Invalid email or password.",
          })

        return
      }

      const user =
        result.rows[0]

      if (
        !user.active
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Invalid email or password.",
          })

        return
      }

      const passwordValid =
        await bcrypt.compare(
          password,
          user.password_hash,
        )

      if (
        !passwordValid
      ) {
        response
          .status(401)
          .json({
            success:
              false,

            message:
              "Invalid email or password.",
          })

        return
      }

      const authContext:
        AuthContext = {
          userId:
            Number(
              user.id,
            ),

          email:
            user.email,

          name:
            user.name,

          role:
            user.role,
        }

      const token =
        createToken(
          authContext,
        )

      await database.query(
        `
          UPDATE users

          SET
            last_login_at = NOW(),
            updated_at = NOW()

          WHERE
            id = $1
        `,
        [
          user.id,
        ],
      )

      const refreshedResult =
        await database.query<UserRow>(
          `
            SELECT
              id,
              email,
              name,
              role,
              password_hash,
              active,
              created_at,
              updated_at,
              last_login_at

            FROM users

            WHERE
              id = $1
          `,
          [
            user.id,
          ],
        )

      response.json({
        success:
          true,

        message:
          "Login successful.",

        token,

        tokenType:
          "Bearer",

        expiresIn:
          JWT_EXPIRATION,

        user:
          mapPublicUser(
            refreshedResult
              .rows[0],
          ),
      })
    } catch (error) {
      console.error(
        "TRACE-X login failed:",
        error,
      )

      response
        .status(500)
        .json({
          success:
            false,

          message:
            "TRACE-X authentication service failed.",
        })
    }
  },
)

/* ---------------------------------------------------------
   CURRENT USER
--------------------------------------------------------- */

authRouter.get(
  "/me",

  requireAuth,

  async (
    request:
      Request,

    response:
      Response,
  ) => {
    const auth =
      getAuthContext(
        request,
      )

    response.json({
      success:
        true,

      user: {
        id:
          auth.userId,

        email:
          auth.email,

        name:
          auth.name,

        role:
          auth.role,
      },
    })
  },
)

/* ---------------------------------------------------------
   LOGOUT

   JWTs are stateless at this stage. The frontend removes
   its token. Server-side token revocation can be added later.
--------------------------------------------------------- */

authRouter.post(
  "/logout",

  requireAuth,

  (
    _request:
      Request,

    response:
      Response,
  ) => {
    response.json({
      success:
        true,

      message:
        "Logout acknowledged. Remove the token from the client.",
    })
  },
)