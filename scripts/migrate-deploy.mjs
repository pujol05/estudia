import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const MAX_ATTEMPTS = 3;

function runMigration() {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
    const child = spawn(command, ["migrate", "deploy"], {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = await runMigration();

  if (result.code === 0) process.exit(0);

  const isTemporaryConnectionError = result.output.includes("P1001");
  if (!isTemporaryConnectionError || attempt === MAX_ATTEMPTS) {
    process.exit(result.code);
  }

  const delaySeconds = attempt * 5;
  console.warn(
    "Database temporarily unreachable (P1001). Retrying migration in "
      + delaySeconds + "s (" + (attempt + 1) + "/" + MAX_ATTEMPTS + ")...",
  );
  await wait(delaySeconds * 1_000);
}
