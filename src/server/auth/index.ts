import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

import { env } from "@/lib/env";
import { startTrialSubscription } from "@/server/billing/subscriptions";
import { db, schema } from "@/server/db";

import { createPersonalOrganization } from "./organization";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env().BETTER_AUTH_SECRET,
  baseURL: env().BETTER_AUTH_URL,

  user: {
    additionalFields: {
      /**
       * `input: false` — nunca aceito de `updateUser`/cadastro, só existe pra
       * ser LIDO da sessão. Promover alguém é um UPDATE direto no banco.
       */
      isSuperAdmin: { type: "boolean", defaultValue: false, input: false },
    },
  },

  /**
   * Em produção só a URL configurada é aceita. Em desenvolvimento aceitamos a
   * origem da própria requisição: o Next troca de porta sozinho quando a 3000
   * está ocupada, e sem isso o login passa a falhar com uma mensagem que não
   * aponta para a causa.
   */
  trustedOrigins: (request) => {
    const configurada = [env().BETTER_AUTH_URL];
    if (process.env.NODE_ENV === "production") return configurada;

    // O Better Auth chama isto sem requisição em alguns caminhos internos.
    const origin = request?.headers?.get("origin");
    return origin ? [...configurada, origin] : configurada;
  },

  emailAndPassword: {
    enabled: true,
    // Verificação de e-mail entra junto com o envio transacional (fase 6).
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  databaseHooks: {
    user: {
      create: {
        // Ninguém deve cair num estado "logado mas sem organização": todo funil
        // pertence a uma org, então criamos uma no mesmo instante do cadastro.
        after: async (createdUser) => {
          await createPersonalOrganization(createdUser);
        },
      },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      membershipLimit: 50,
      creatorRole: "owner",
      organizationHooks: {
        // Cobre organizações criadas pela API do plugin (`authClient.organization.create`).
        // A pessoal do cadastro é criada por fora disso — ver `createPersonalOrganization`.
        afterCreateOrganization: async ({ organization: createdOrganization }) => {
          await startTrialSubscription(createdOrganization.id);
        },
      },
    }),
    // Precisa ser o último: é o que grava os cookies nas server actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
