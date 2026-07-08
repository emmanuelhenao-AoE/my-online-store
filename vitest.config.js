import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    // Junit file is parsed by Jenkins for failure emails
    reporters: ["verbose", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
