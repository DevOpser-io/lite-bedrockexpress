# Mobile API Authentication Setup

This document explains how to set up mobile API key authentication for the Bedrock Express mobile app.

## Overview

The mobile app uses API key authentication (similar to fairytalegenie) with the following features:
- **API Key**: Identifies the mobile app
- **Platform Detection**: Tracks iOS/Android/Web
- **Request Signing** (optional): HMAC-SHA256 for tamper protection
- **Session Auth**: Combined with session cookies for user authentication

## AWS Secrets Manager Configuration

### Required Secrets

Add the following keys to your existing `ADDITIONAL_SECRETS` in AWS Secrets Manager:

```json
{
  "GOOGLE_CLIENT_ID": "your-google-client-id",
  "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
  "MOBILE_API_KEY": "generate-a-secure-random-key-here",
  "MOBILE_SIGNING_SECRET": "generate-a-secure-random-signing-secret-here"
}
```

### Generate Secure Keys

Use these commands to generate secure random keys:

```bash
# Generate Mobile API Key (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Mobile Signing Secret (128 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Update AWS Secrets Manager

1. Go to AWS Secrets Manager console
2. Find your `bedrockflask-additional-secrets-*` secret
3. Click "Retrieve secret value"
4. Click "Edit"
5. Add the `MOBILE_API_KEY` and `MOBILE_SIGNING_SECRET` keys with generated values
6. Save the secret

Example:
```json
{
  "GOOGLE_CLIENT_ID": "123456789-abcdefghijklmnop.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "GOCSPX-abc123def456",
  "MOBILE_API_KEY": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "MOBILE_SIGNING_SECRET": "f1e2d3c4b5a6978685746352413029182736455463728190abcdef0123456789fedcba9876543210"
}
```

## Development Mode

For local development, the system will auto-generate API keys if not found in Secrets Manager. You'll see warnings like:

```
⚠️  Using generated API key for mobile: a1b2c3d4...
⚠️  Set MOBILE_API_KEY in AWS Secrets Manager for production!
```

The development API key is: `dev_mobile_api_key_change_in_production`

**IMPORTANT**: Never use the development key in production!

## Mobile App Configuration

### For Web Emulator (Current)

The mobile app automatically uses the development API key. No configuration needed.

### For Native Apps (Future)

Update the build configuration to inject the production API key:

**iOS (Capacitor):**
```swift
// In capacitor.config.json or during build
window.MOBILE_CONFIG = {
    apiKey: 'your-production-api-key-here',
    apiUrl: 'https://your-production-domain.com'
};
```

**Android (Capacitor):**
```java
// In build.gradle or config
buildConfigField "String", "MOBILE_API_KEY", "\"your-production-api-key-here\""
```

## How It Works

1. **Client Request**: Mobile app sends requests with these headers:
   - `X-API-Key`: The mobile API key
   - `X-Platform`: ios/android/web
   - `X-Client-Version`: App version

2. **Middleware Validation**: `mobileAuth` middleware checks:
   - API key matches the one in Secrets Manager
   - Optional: Validates request signature (if signing is enabled)
   - Optional: Checks user session (for user-specific requests)

3. **EventSource Streams**: For streaming responses (which don't support custom headers):
   - API key is passed as query parameter: `?apiKey=xxx&platform=web`

## Routes Protected

The following routes support mobile authentication:

- `/api/chat/message` - Send chat messages
- `/api/chat/stream` - Stream AI responses
- `/conversation_history` - Get conversation list
- `/get_conversation/:id` - Get specific conversation
- `/reset` - Reset conversation

All routes use `mobileAuth({ optional: true })` which means:
- Mobile apps: Must provide valid API key
- Web apps: Use session authentication as usual
- Both work seamlessly

## Security Features

### API Key Validation
- Keys are stored securely in AWS Secrets Manager
- Auto-refreshed every hour from Secrets Manager
- Development keys print warnings

### Request Signing (Optional)
- HMAC-SHA256 signature of: `METHOD:PATH:TIMESTAMP:BODY`
- Prevents request tampering
- 5-minute timestamp window
- Enable by setting `MOBILE_SIGNING_SECRET`

### Session Authentication
- Mobile apps use both API key AND session cookies
- API key identifies the app
- Session cookie identifies the user
- Both are required for user-specific operations

## Testing

### Test Mobile Auth Locally

1. Start the server: `npm start`
2. Open mobile app: `http://localhost:8000/mobile-app.html`
3. Sign in with Google OAuth
4. Check browser console for:
   ```
   [Mobile Auth] Mobile API request: POST /api/chat/message [web v1.0.0]
   📱 Mobile API Request: POST http://localhost:8000/api/chat/message
   ```

### Test API Key Validation

```bash
# Valid request (development key)
curl -X POST http://localhost:8000/api/chat/message \
  -H "X-API-Key: dev_mobile_api_key_change_in_production" \
  -H "X-Platform: web" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Invalid request (wrong key)
curl -X POST http://localhost:8000/api/chat/message \
  -H "X-API-Key: wrong-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
# Should return: {"error":"Invalid API key","code":"INVALID_API_KEY"}
```

## Troubleshooting

### "Invalid API key" Error

1. Check the API key in mobile-app.js matches the backend
2. For development: Use `dev_mobile_api_key_change_in_production`
3. For production: Ensure Secrets Manager has `MOBILE_API_KEY` set

### "API key required" Error

1. Ensure `X-API-Key` header is sent
2. For EventSource: API key must be in query params

### Secrets Not Loading

1. Check AWS credentials are configured
2. Verify secret name: `bedrockflask-additional-secrets-*`
3. Check server logs for secrets loading errors

## Migration from Session-Only Auth

The system is backward compatible:
- Web apps continue using session cookies
- Mobile apps use API key + session cookies
- No changes needed for existing web auth

## Production Checklist

- [ ] Generate secure random keys using crypto
- [ ] Add `MOBILE_API_KEY` to AWS Secrets Manager
- [ ] Add `MOBILE_SIGNING_SECRET` to AWS Secrets Manager (optional)
- [ ] Update mobile app build to inject production API key
- [ ] Set `debug: false` in MobileAPIClient config
- [ ] Test mobile authentication in production environment
- [ ] Monitor logs for invalid API key attempts
