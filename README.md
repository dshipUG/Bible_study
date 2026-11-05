# Abide Bible Study

A mobile-first Bible study app with the selected dark navy, charcoal, cream, and gold palette. Includes 66 books, chapter and verse selection, KJV/WEB/BBE translations, verse copy/insert, and topic-guided AI conversation.

Requires Node.js 24+. Run `npm ci` to install the locked dependencies.

```sh
npm ci
npm start
```

The app listens on port 3000 (override with PORT). Supply ABIDE_OPENAI_KEY (or OPENAI_API_KEY) securely in the server environment to enable chat; optionally set OPENAI_MODEL (default: gpt-4.1-mini). The server reads process environment variables; it does not automatically load a .env file. The key is never sent to the browser. Without a key, the interface works and chat reports that configuration is needed.

Passages load from https://bible-api.com through the server; chat uses https://api.openai.com from the server. John 1:1 KJV is included as a starter passage. The three offered translations are available through the passage provider. Other translations require an appropriate provider/license. Chapter numbering follows the 66-book Protestant canon.

Research presets cover original words, historical context, manuscripts, cross-references, application, and interpretive perspectives. Responses use model knowledge, not live web research; verify interpretations and sources. Study drafts and saved studies use browser local storage; clearing browser data removes them. Connected users can save Google Docs in an Abide Bible Studies folder.

This is a local development prototype. The hosted private pilot requires APP_ACCESS_PASSWORD. Add individual accounts and per-user rate limits before broader public release. See DEPLOY.md for hosting instructions.

Run `npm test` for server checks.

See [SETUP.md](SETUP.md) for Google connection, hosting, and live verification instructions.

## NLT connection

Set `NLT_API_KEY` in the Render service's Environment settings, then redeploy. The server calls Tyndale's official https://api.nlt.to/api/passages endpoint and converts its HTML into plain verse data for the existing reader. The key stays on the server. NLT is available in the translation selector; it returns a setup message if no key is configured. Existing translations continue to use bible-api.com.

Tyndale's standard key-based terms list 500 verses per request and 5,000 requests per day for noncommercial use. Commercial use needs a suitable license from Tyndale. See https://api.nlt.to/ and your account's license terms. This integration requests one chapter or verse at a time. It does not download a Bible database or include study notes. The NLT credit is displayed alongside the reader and included when copying a verse or exporting it to Drive.
