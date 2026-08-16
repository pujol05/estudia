import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
//sera el component que utilitzarem per gestionar l'autenticació de l'usuari a la nostra aplicació. 
// Ens permetrà iniciar sessió, tancar sessió, registrar-se i gestionar les sessions de manera segura.