# First website deployment on Render

1. Sign in to Render with the GitHub account that can access `dshipUG/Bible_study`.
2. Create a new **Blueprint** and select that repository and its `main` branch. Render reads `render.yaml`.
3. Enter these values securely in Render when prompted:
   - `ABIDE_OPENAI_KEY`: your real OpenAI API key from your OpenAI account. The key stored in the ChatGPT cloud environment does not transfer to Render automatically.
   - `APP_ACCESS_PASSWORD`: a strong password you choose for your private pilot. This is separate from your Google password and OpenAI key.
4. Review the selected plan and any pricing shown by Render before deploying. This configuration requests the free web service plan; availability and terms depend on Render.
5. Deploy and wait until the service is live. Open the HTTPS website address supplied by Render.
6. The browser requests credentials: username `abide`, password the `APP_ACCESS_PASSWORD` you entered.
7. Select a passage, read it, add it to chat and send a question. Save a local study. Free services may need time to wake up after inactivity.

Google Drive can be connected later by adding GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the service. Register `https://YOUR-RENDER-ADDRESS/auth/google/callback` in Google Cloud. Render's RENDER_EXTERNAL_URL supplies the app origin automatically; do not set APP_URL to localhost on Render.

This is a single-instance private pilot. Google tokens live in memory and reconnecting is required after restarts. The shared app password restricts access while individual account sign-in and quotas are developed. Do not embed credentials in the repository. The user's existing Drive folder selection still needs implementing; the current save flow creates or finds an app-accessible folder named Abide Bible Studies.
