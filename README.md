# x-social-bridge

Minimal isolated X auth bridge for @valhalla_ascent.

## Current phase
- health check
- OAuth start
- OAuth callback
- auth status
- identity verification only
- posting disabled

## Expected env
- X_CLIENTID
- X_CLIENTSECRET
- X_REDIRECT_URI
- X_EXPECTED_USERNAME

## Routes
- GET /health
- GET /auth/x/start
- GET /auth/x/callback
- GET /auth/x/status
