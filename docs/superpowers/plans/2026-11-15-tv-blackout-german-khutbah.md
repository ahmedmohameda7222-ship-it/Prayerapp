# Implementation plan: prayer blackout and published German Friday khutbah

1. Write RED regression tests for 30s Iqama, exact prayer blackout durations, four-minute postprayer start/end and Friday no-black.
2. Add shared `prayer-lifecycle.ts` constant functions. Update resolvers and existing legacy tests to new user-approved boundaries.
3. Update Adhan and Iqama language. Full black DOM bypass at DisplayShell (no child markup) and tests.
4. Add source-only German khutbah endpoint, narrow read-only TV proxy, client fetch and safe parser. Render German-only paginated sermon for JUMUAH_NOW (different services same Friday's sermon).
5. Update Admin TV Test stage simulation for blackout/postprayer, ensure Stop and deadline do not leave a black screen. Update fixtures/tests.
6. GitHub CI: TV Vitest + typecheck/lint/build + two-app integration; root CI, Android and Security. Squash merge and verify both main-only Vercel production deployments and read-only khutbah endpoint. Never start live TV Test on physical device for production verification.
