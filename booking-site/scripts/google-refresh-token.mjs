#!/usr/bin/env node
/**
 * One-time helper: turns your Google OAuth client into a refresh token.
 *
 *   npm run google-token
 *
 * It spins up a throwaway server on http://localhost:5555, opens the Google
 * consent screen, catches the redirect, exchanges the code, and prints the
 * refresh token. Then it shuts down. Nothing is stored.
 *
 * BEFORE RUNNING: in Google Cloud Console -> Credentials -> your OAuth client,
 * add this to "Authorized redirect URIs":
 *
 *   http://localhost:5555/callback
 *
 * Requires Node 18+ (for built-in fetch).
 */

import http from "node:http";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar";

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log("\n  Google Calendar refresh token\n  " + "─".repeat(40));
console.log(
  `\n  Make sure ${REDIRECT_URI}\n  is listed under "Authorized redirect URIs" on your OAuth client.\n`,
);

const clientId = (await rl.question("  GOOGLE_CLIENT_ID:     ")).trim();
const clientSecret = (await rl.question("  GOOGLE_CLIENT_SECRET: ")).trim();
rl.close();

if (!clientId || !clientSecret) {
  console.error("\n  Both values are required. Nothing to do.\n");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    // Both of these matter: without them Google returns an access token only.
    access_type: "offline",
    prompt: "consent",
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h1>Denied</h1><p>${error}</p><p>Close this tab and try again.</p>`);
    console.error(`\n  Google returned: ${error}\n`);
    server.close();
    process.exit(1);
  }

  const code = url.searchParams.get("code");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const json = await tokenRes.json();

  if (!tokenRes.ok || !json.refresh_token) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Something went wrong</h1><p>Check the terminal.</p>");
    console.error("\n  Token exchange failed:\n", JSON.stringify(json, null, 2));
    console.error(
      "\n  No refresh_token usually means you've authorised this client before.",
      "\n  Revoke it at https://myaccount.google.com/permissions and run this again.\n",
    );
    server.close();
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<h1 style='font-family:system-ui'>Done.</h1><p style='font-family:system-ui'>Your refresh token is in the terminal. You can close this tab.</p>",
  );

  console.log("\n  " + "─".repeat(40));
  console.log("\n  Paste this into .env.local and into Vercel:\n");
  console.log(`  GOOGLE_REFRESH_TOKEN=${json.refresh_token}\n`);
  console.log("  " + "─".repeat(40) + "\n");

  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`\n  Opening your browser...`);
  console.log(`  If it doesn't open, paste this in manually:\n\n  ${authUrl}\n`);

  const cmd =
    process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  try {
    spawn(cmd, [authUrl], { shell: true, stdio: "ignore", detached: true }).unref();
  } catch {
    /* the printed URL is the fallback */
  }
});
