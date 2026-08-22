import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
//sera el component que utilitzarem per gestionar l'autenticació de l'usuari a la nostra aplicació. 
// Ens permetrà iniciar sessió, tancar sessió, registrar-se i gestionar les sessions de manera segura.
