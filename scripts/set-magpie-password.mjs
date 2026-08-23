/**
 * Reset the Magpie sign-in password for kellylucas.dev/brain.
 *
 *   npm run magpie:password
 *
 * Prompts for a new password twice (input is hidden), then prints ONLY the
 * scrambled record for the MAGPIE_PASSWORD_RECORD environment variable in the
 * website's Vercel project. The password itself is never printed or stored.
 * Paste the record into Vercel, redeploy, and sign in with the new password.
 */
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (text) => {
      if (text.includes(question)) write(text);
      // keep typed characters off the screen and out of the transcript
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const first = await promptHidden("New password (typing is hidden): ");
if (first.length < 8) {
  process.stderr.write("Use at least 8 characters.\n");
  process.exit(1);
}
const second = await promptHidden("Type it again: ");
if (first !== second) {
  process.stderr.write("The two entries did not match. Nothing changed; run it again.\n");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const record = `${salt}.${scryptSync(first, salt, 32).toString("hex")}`;
process.stdout.write(`
Done. Copy the line between the markers into the website's Vercel project:
Settings -> Environment Variables -> MAGPIE_PASSWORD_RECORD (replace the value),
then press Redeploy. Your password itself was not saved or shown anywhere.

----- copy from here -----
${record}
----- to here -----
`);
