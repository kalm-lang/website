import { resolve } from 'node:path';
export const verificationTimeout = Number(process.env.KALM_VERIFICATION_TIMEOUT_MS ?? 30_000);
if (!Number.isSafeInteger(verificationTimeout) || verificationTimeout < 1 || verificationTimeout > 600_000)
  throw new Error('KALM_VERIFICATION_TIMEOUT_MS must be an integer between 1 and 600000');

export const compilerCommand = {
  command: process.env.KALM_CLI_COMMAND || process.env.KALM_JAVA_COMMAND || 'java',
  args: process.env.KALM_CLI_COMMAND ? [] : ['-cp', resolve(import.meta.dirname, '../build-support/target/lib/*'), 'dev.kalm.compiler.cli.KalmCli'],
};
