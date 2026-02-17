#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

/**
 * Reset local development environment:
 * - Clear game logs
 * - Ready for fresh tournament testing
 */
async function main() {
  const gameLogsDir = path.resolve(__dirname, "../../../.context/game-logs");

  console.log("🧹 Resetting local environment...\n");

  // Clear game logs
  if (fs.existsSync(gameLogsDir)) {
    const files = fs.readdirSync(gameLogsDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(gameLogsDir, file));
    });
    console.log(`✅ Cleared ${files.length} tournament log(s) from ${gameLogsDir}`);
  } else {
    console.log("ℹ️  No game logs directory found");
  }

  console.log("\n✨ Reset complete!");
  console.log("\nNext steps:");
  console.log("  1. Restart chain: yarn chain");
  console.log("  2. Redeploy: yarn deploy");
  console.log("  3. Start game engine: yarn run-game");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
