# locations-webhook

Receives a Zesty.io locations-model webhook and rebuilds the full locations JSON from a
Parsley endpoint, writing it straight into a Zesty view file. Delete and publish events
publish the rebuilt view immediately; update/save events only update the draft. Rebuilds
are debounced so a burst of changes collapses into one rebuild.

Runs two ways from the same handler (`src/webhook-handler.js`):
- Locally as a long-lived Express server (`src/webhook-server.js`), via `npm start`.
- As a Cloud Functions (2nd gen) HTTP function (`index.js`), for deployment.

## One-time GCP setup

1. Enable the required APIs on the target project:
   ```
   gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project=PROJECT_ID
   ```
2. Create the secret the function needs (value comes from the existing `.env`):
   ```
   gcloud secrets create locations-webhook-dev-token --project=PROJECT_ID --data-file=- <<< "YOUR_DEV_TOKEN"
   ```
3. Grant the Cloud Functions runtime service account access to that secret (the default
   compute service account unless you've set a custom one):
   ```
   gcloud secrets add-iam-policy-binding locations-webhook-dev-token --project=PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
   ```

## Deploying

1. Copy `deploy.config.example.json` to `deploy.config.json` (gitignored) and fill in:
   - `projectId`, `region`
   - `envVars` - the non-secret values from your `.env` (`INSTANCE_ZUID`,
     `LOCATIONS_ENDPOINT_URL`, `LOCATIONS_VIEW_ZUID`, etc.)
   - `secrets` - left as-is unless you named the Secret Manager secrets differently
2. `npm install`
3. `npm run deploy`

`npm run deploy` runs `scripts/deploy.js`, which:
- Deploys via `gcloud functions deploy --gen2`.
- Then runs `gcloud run services update --no-cpu-throttling` on the resulting Cloud Run
  service. **This step isn't optional.** `webhook-handler.js` responds to the webhook
  immediately (`res.status(202)`) and keeps working afterwards (`triggerRebuild`). Cloud Run
  freezes a container's CPU the instant a response is sent unless CPU is always-allocated -
  without `--no-cpu-throttling`, the rebuild can be silently killed mid-flight.

The deploy also pins `max-instances=1` / `concurrency=1` by default. `locations-sync.js`
debounces in-memory (`lastRunAt`/`inFlight`), which only works correctly within a single
instance - see the comment in that file. Keeping it to one instance makes the debounce behave
like it does today under `npm start`. It's still not perfectly durable (a cold start after
scale-to-zero resets `lastRunAt` to 0), but that only risks an extra rebuild, never a skipped
one.

After the first deploy, point the Zesty webhook at the printed Cloud Run URL instead of the
old server's address.

## Local testing against the Cloud Functions runtime

```
npm run start:function
```

Starts `functions-framework` on port 3000 using `index.js`, loading `.env` the same way
`npm start` does. POST a sample payload to `http://localhost:3000/`.
