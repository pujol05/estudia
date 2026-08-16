//crea les rutes que necesita better auth per gestionar la autenticació i les sessions de l'usuari. Aquestes rutes són utilitzades per iniciar sessió, tancar sessió, registrar-se i gestionar les sessions de manera segura.
/*
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/get-session
*/

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);