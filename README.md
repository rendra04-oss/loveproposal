# Romantic Proposal — Cloudflare Workers + D1

## Deploy
1. Create a Cloudflare Worker from this GitHub repository.
2. Bind a D1 database to the Worker using the variable name `DB`.
3. Add the `ADMIN_KEY` secret in Worker Settings > Variables and Secrets.
4. Run the SQL in `schema.sql` against the D1 database.
5. Deploy.

The frontend lives in `public/` and the API lives in `src/index.js`.
