// Deploys this directory as a Cloud Functions (2nd gen) HTTP function via `gcloud`, then
// patches the underlying Cloud Run service to disable CPU throttling.
//
// That second step matters because of how src/webhook-handler.js is written: it responds
// to the webhook immediately (res.status(202)) and keeps doing work (triggerRebuild) after
// the response is sent. Cloud Run (what 2nd gen functions run on) freezes a container's CPU
// as soon as the response finishes unless CPU is always-allocated, which would silently kill
// the rebuild mid-flight. --no-cpu-throttling keeps the CPU on for that trailing work.
//
// Config lives in deploy.config.json (gitignored - copy deploy.config.example.json to start).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'deploy.config.json');
const EXAMPLE_PATH = path.join(__dirname, '..', 'deploy.config.example.json');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(
    `Missing ${path.basename(CONFIG_PATH)}.\n` +
      `Copy ${path.basename(EXAMPLE_PATH)} to ${path.basename(CONFIG_PATH)} and fill in your project details first.`,
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const required = ['projectId', 'region', 'functionName', 'runtime', 'entryPoint'];
const missing = required.filter((key) => !config[key] || config[key] === 'PROJECT_ID');
if (missing.length) {
  console.error(`deploy.config.json is missing or has placeholder values for: ${missing.join(', ')}`);
  process.exit(1);
}

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}\n`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const envVars = Object.entries(config.envVars || {})
  .filter(([, value]) => value !== '' && value !== undefined && value !== null)
  .map(([key, value]) => `${key}=${value}`)
  .join(',');

const secrets = Object.entries(config.secrets || {})
  .map(([key, ref]) => `${key}=${ref}`)
  .join(',');

const deployArgs = [
  'functions',
  'deploy',
  config.functionName,
  '--gen2',
  `--project=${config.projectId}`,
  `--region=${config.region}`,
  `--runtime=${config.runtime}`,
  `--entry-point=${config.entryPoint}`,
  '--source=.',
  '--trigger-http',
  `--memory=${config.memory || '256Mi'}`,
  `--timeout=${config.timeoutSeconds || 60}s`,
  `--max-instances=${config.maxInstances || 1}`,
  config.allowUnauthenticated ? '--allow-unauthenticated' : '--no-allow-unauthenticated',
];

if (envVars) deployArgs.push(`--set-env-vars=${envVars}`);
if (secrets) deployArgs.push(`--set-secrets=${secrets}`);

run('gcloud', deployArgs);

// gcloud functions deploy --gen2 provisions a Cloud Run service with the same name - update
// it directly for flags `gcloud functions deploy` doesn't expose (CPU throttling, concurrency).
run('gcloud', [
  'run',
  'services',
  'update',
  config.functionName,
  `--project=${config.projectId}`,
  `--region=${config.region}`,
  '--no-cpu-throttling',
  `--concurrency=${config.concurrency || 1}`,
]);

console.log('\nDeploy complete.');
