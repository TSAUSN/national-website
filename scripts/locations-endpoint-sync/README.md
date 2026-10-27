# locations-endpoint-sync

Deployed as the Cloud Run service / Cloud Functions (2nd gen) function
`locations-endpoint-sync` (project `salvation-army-usa-prod`, region `us-central1`).

Receives a Zesty.io locations-model webhook and rebuilds the full locations JSON from a
Parsley endpoint, writing it straight into a Zesty view file. Delete, publish and unpublish
events publish the rebuilt view immediately; update/save events only update the draft.
Update rebuilds are debounced so a burst of saves collapses into one rebuild; publish,
delete and unpublish rebuilds are never debounced or dropped.

Runs two ways from the same handler (`src/webhook-handler.js`):
- Locally as a long-lived Express server (`src/webhook-server.js`), via `npm start`.
- As a Cloud Functions (2nd gen) HTTP function (`index.js`), for deployment.

## One-time GCP setup

1. Enable the required APIs on the target project:
   ```
   gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project=PROJECT_ID
   ```
2. Create the secret the function needs (value comes from the existing `.env`). Don't use
   `<<<` - it appends a newline to the secret, which makes an invalid `Authorization` header.
   Bash:
   ```
   printf '%s' "YOUR_DEV_TOKEN" | gcloud secrets create locations-webhook-dev-token --project=PROJECT_ID --data-file=-
   ```
   PowerShell (writes the value to a temp file with no trailing newline or BOM):
   ```
   $f = [IO.Path]::GetTempFileName(); [IO.File]::WriteAllText($f, "YOUR_DEV_TOKEN"); gcloud secrets create locations-webhook-dev-token --project=PROJECT_ID --data-file="$f"; Remove-Item $f
   ```
   To replace the value of an existing secret, use `gcloud secrets versions add` with the same
   `--data-file` input. (The service also trims the token, but keep the secret clean.)
3. Grant the Cloud Functions runtime service account access to that secret (the default
   compute service account unless you've set a custom one):
   ```
   gcloud secrets add-iam-policy-binding locations-webhook-dev-token --project=PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
   ```

## Deploying

1. Copy `deploy.config.example.json` to `deploy.config.json` (gitignored) and fill in:
   - `projectId`, `region` (`functionName` is already `locations-endpoint-sync`, the deployed
     service name - keep it, or the deploy creates a second service)
   - `envVars` - the non-secret values from your `.env` (`INSTANCE_ZUID`,
     `LOCATIONS_ENDPOINT_PATH`, `LOCATIONS_LIVE_DOMAIN`, `LOCATIONS_PREVIEW_DOMAIN`,
     `LOCATIONS_VIEW_ZUID`, `LOCATIONS_VIEW_DEV_ZUID`, etc.)
   - `secrets` - left as-is unless you named the Secret Manager secrets differently
   - Never put a real `zpw` value in `deploy.config.example.json`; it only belongs in your
     gitignored `deploy.config.json` / `.env`.
2. `npm install`
3. `npm run deploy`

`npm run deploy` runs `scripts/deploy.js`, which:
- Deploys via `gcloud functions deploy --gen2`.
- Then runs `gcloud run services update --no-cpu-throttling` on the resulting Cloud Run
  service. **This step isn't optional.** `webhook-handler.js` responds to the webhook
  immediately (`res.status(202)`) and keeps working afterwards (`triggerRebuild`). Cloud Run
  freezes a container's CPU the instant a response is sent unless CPU is always-allocated -
  without `--no-cpu-throttling`, the rebuild can be silently killed mid-flight.
- Then runs `gcloud run services describe` and fails if `cpu-throttling` isn't `false`.

Deploy only with `npm run deploy`. A plain `gcloud functions deploy` on its own can reset the
Cloud Run flags (CPU throttling back on, concurrency back to the default), which brings back the
"webhook fires but nothing updates" failure.

The deploy also pins `max-instances=1` / `concurrency=1` by default. `locations-sync.js`
keeps its run state in memory (`lastRunAt`/`inFlight`/`queued`), which only works correctly
within a single instance - see the comment in that file. Keeping it to one instance makes it
behave like it does today under `npm start`:
- Update/save rebuilds are debounced: one arriving within `REBUILD_DEBOUNCE_MS` of the last
  rebuild's start, or while a rebuild is running, is skipped - its draft change only lands once
  a later rebuild runs.
- Publish/delete/unpublish rebuilds are never debounced or dropped. If one arrives while a
  rebuild is running, it is queued, and all such events arriving meanwhile are coalesced into a
  single publish rebuild that starts as soon as the current one finishes.

The state isn't durable: a restart or a cold start after scale-to-zero resets it, losing any
queued publish rebuild that hadn't started yet.

After the first deploy, point the Zesty webhook at the printed Cloud Run URL instead of the
old server's address.

## Post-deploy checks

```
gcloud run services describe locations-endpoint-sync --project=salvation-army-usa-prod --region=us-central1
```

Confirm:
- CPU is always allocated: `run.googleapis.com/cpu-throttling: 'false'` (shown as
  "CPU Allocation: CPU is always allocated" in the summary view).
- Max instances is 1 (`autoscaling.knative.dev/maxScale: '1'`).
- Concurrency is 1 (`containerConcurrency: 1`).

Also make sure the source endpoint (`generate-locations.json`, from `LOCATIONS_ENDPOINT_PATH`)
is **published** on live. Publish/delete/unpublish rebuilds fetch it from
`LOCATIONS_LIVE_DOMAIN`; if it's unpublished there, the response won't be the locations array
and the run fails with `invalid payload` without writing anything.

## Configuration notes

- Every fetch URL gets a `_cb=<timestamp>` cache-buster so the CDN can't serve a stale copy.
- The GET to the website sends no `Authorization` header; preview access comes from the
  `zpw` query in `LOCATIONS_ENDPOINT_PATH`.
- A fetched payload must be an array with at least `LOCATIONS_MIN_COUNT` items (default 1),
  otherwise nothing is written.
- Missing required env vars (`INSTANCE_ZUID`, `DEV_TOKEN`, `LOCATIONS_ENDPOINT_PATH`,
  `LOCATIONS_LIVE_DOMAIN`, `LOCATIONS_PREVIEW_DOMAIN`, `LOCATIONS_VIEW_ZUID`,
  `LOCATIONS_VIEW_DEV_ZUID`) fail the run with a `missing env vars` error.

## Logs

Every log call writes one JSON line (`{severity, label, fn, data}`) to stdout/stderr, which
Cloud Logging picks up with the right severity. `zpw` values and tokens are redacted. File
logging is off unless `LOG_TO_FILE=true` (files go under `LOG_DIR`, default the OS temp dir);
logging failures never stop a rebuild.

Read recent logs:
```
gcloud run services logs read locations-endpoint-sync --project=salvation-army-usa-prod --region=us-central1 --limit=100
```
Errors only:
```
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="locations-endpoint-sync" AND severity>=ERROR' --project=salvation-army-usa-prod --limit=50
```

A healthy run logs `received` -> `fetch attempt` (status 200) -> `view write` per view ->
`rebuilt`. Useful labels when it doesn't: `debounced`, `queued behind in-flight run`,
`fetch retry`, `missing env vars`, `rebuild failed`.

## Local testing against the Cloud Functions runtime

```
npm run start:function
```

Starts `functions-framework` on port 3000 using `index.js`, loading `.env` the same way
`npm start` does. POST a sample payload to `http://localhost:3000/`.
