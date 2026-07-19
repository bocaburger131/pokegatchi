# BOCABURGER131 — Godot Mobile Re-Auth Steps (Important)

`ERR_UNSAFE_PORT` on `localhost:1` is expected for this OAuth flow.
You do NOT need that page to load.

## Correct flow
1. I generate a fresh auth URL (new state each time).
2. You open it, approve Google permissions.
3. Browser redirects to `http://localhost:1/...` and fails with ERR_UNSAFE_PORT.
4. Copy the FULL URL from address bar.
5. Paste it back to me immediately.

## Why your previous URL failed
- It used an older `state` value.
- OAuth state must match the latest generated URL exactly.

## Next action
Reply: "generate fresh auth link now"
Then I’ll give a fresh link and immediately exchange your pasted callback URL.

## Draft requirement noted
You asked for Drafts only (not sending email).
After auth works, I will create a structured Gmail draft only.
