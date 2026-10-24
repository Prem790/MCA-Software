import { createHash, randomBytes } from "node:crypto";

export const invitationTokens = {
  hash(raw: string) {
    return createHash("sha256").update(raw).digest("hex");
  },
  create() {
    const raw = randomBytes(32).toString("hex");
    return { raw, hash: this.hash(raw) };
  },
};
