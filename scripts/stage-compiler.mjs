import spawn from 'cross-spawn';
const maven = process.env.KALM_MAVEN_COMMAND || (process.platform === 'win32' ? 'mvn.cmd' : 'mvn');
const args = ['-B', '-ntp', '-U', '-s', 'build-support/settings.xml', '-f', 'build-support/pom.xml'];
if (process.env.KALM_MAVEN_REPOSITORY) args.push(`-Dkalm.repository=${process.env.KALM_MAVEN_REPOSITORY}`);
if (process.env.KALM_MAVEN_LOCAL) args.push(`-Dmaven.repo.local=${process.env.KALM_MAVEN_LOCAL}`);
args.push('package');
const result = spawn.sync(maven, args, { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
