import { resolve } from 'node:path';
export const compilerCommand = {
  command: process.env.KALM_CLI_COMMAND || process.env.KALM_JAVA_COMMAND || 'java',
  args: process.env.KALM_CLI_COMMAND ? [] : ['-cp', resolve(import.meta.dirname, '../build-support/target/lib/*'), 'dev.kalm.compiler.cli.KalmCli'],
};
