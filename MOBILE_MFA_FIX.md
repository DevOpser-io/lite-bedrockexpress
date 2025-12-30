# Mobile MFA OAuth Fix

## Problem
When users with MFA enabled tried to log in via Google OAuth on the mobile app, the authentication screen would not redirect to the mobile MFA verification screen. Instead, it would show a blank screen because the OAuth callback was skipping MFA verification entirely.

## Root Cause
In `backend/routes/auth.js`, the Google OAuth callback handler (line ~1354) was unconditionally setting `req.session.mfaVerified = true` for all OAuth logins, including mobile clients. This meant that users with MFA enabled were never prompted to verify their MFA code.

The working implementation in fairytalegenie-bedrockexpress properly checks if:
1. The user has MFA enabled
2. Whether it's a mobile or web client
3. Whether the user is a Google OAuth user (who should trust Google's MFA) vs a password-based user who linked Google

## Solution
Updated the Google OAuth callback handler in `backend/routes/auth.js` to:

1. **Check if MFA is enabled**: Before skipping MFA, check if the user has MFA enabled
2. **Distinguish OAuth users**: Determine if this is a true Google OAuth user (created via Google) vs a password-based user who linked Google
3. **Handle mobile MFA flow**: For mobile clients with MFA enabled:
   - Generate an MFA session token
   - Store it in Redis with key `mobile_mfa_session:{token}`
   - Redirect to `/mobile/auth?mfa_required=true&sessionId={token}`
4. **Trust Google MFA**: For true Google OAuth users, trust Google's MFA and skip app MFA

## Changes Made

### File: `backend/routes/auth.js`

**Before (lines 1351-1394):**
```javascript
// OAuth users skip MFA
req.session.mfaVerified = true;
req.session.loginMethod = 'oauth';

// Handle mobile OAuth flow with session token exchange
if (isMobileAuth) {
  // Generate session token and redirect
  // ... (no MFA check)
}
```

**After (lines 1351-1481):**
```javascript
// Check if user has MFA enabled
const isGoogleOAuthUser = user.googleId && user.googleId.trim() !== '';

if (user.mfaEnabled && !isGoogleOAuthUser) {
  // Password-based user with MFA - require verification
  if (isMobileAuth) {
    // Generate MFA session token
    const mfaSessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store in Redis
    await redisClient.client.setEx(
      `mobile_mfa_session:${mfaSessionToken}`,
      300,
      JSON.stringify(sessionData)
    );
    
    // Redirect to mobile auth with MFA params
    const redirectURL = `${mobileRedirectURL}?mfa_required=true&sessionId=${mfaSessionToken}`;
    return res.redirect(redirectURL);
  } else {
    // Web client - redirect to web MFA
    return res.redirect('/auth/mfa-verify');
  }
} else if (isGoogleOAuthUser && user.mfaEnabled) {
  // Google OAuth user - trust Google's MFA
  req.session.mfaVerified = true;
  user.lastLogin = new Date();
  await user.save();
} else {
  // No MFA required
  req.session.mfaVerified = true;
}

// Continue with normal OAuth flow for non-MFA or verified users
```

## Flow Diagram

### Mobile OAuth with MFA Enabled

```
1. User clicks "Sign in with Google" in mobile app
2. Mobile app opens browser to /auth/google?mobile=true
3. User completes Google authentication
4. Google redirects to /auth/google/callback?mobile=true&code=...
5. Server checks: user.mfaEnabled && !isGoogleOAuthUser?
   YES → Generate MFA session token
   YES → Redirect to /mobile/auth?mfa_required=true&sessionId={token}
6. Mobile app detects mfa_required=true
7. Mobile app shows MFA input screen
8. User enters 6-digit TOTP code
9. Mobile app calls POST /mobile/auth/mfa-verify with sessionId and code
10. Server validates MFA code
11. Server creates authenticated session
12. Mobile app receives success response
```

### Mobile OAuth without MFA (or Google OAuth user)

```
1. User clicks "Sign in with Google" in mobile app
2. Mobile app opens browser to /auth/google?mobile=true
3. User completes Google authentication
4. Google redirects to /auth/google/callback?mobile=true&code=...
5. Server checks: user.mfaEnabled && !isGoogleOAuthUser?
   NO → Skip MFA (trust Google or no MFA)
6. Generate OAuth session token
7. Redirect to /mobile/auth?success=true&session={token}
8. Mobile app exchanges session token for authenticated session
9. Mobile app receives success response
```

## Testing Checklist

- [ ] Mobile OAuth login without MFA → Should work (no MFA prompt)
- [ ] Mobile OAuth login with MFA (password user) → Should show MFA screen
- [ ] Mobile OAuth login with MFA (Google user) → Should skip MFA (trust Google)
- [ ] Web OAuth login with MFA → Should redirect to /auth/mfa-verify
- [ ] Web OAuth login without MFA → Should work normally

## API Endpoints Used

1. **POST /mobile/auth/mfa-verify**
   - Accepts: `{ sessionId, code, method }`
   - Returns: `{ success, authenticated, user }`
   - Validates MFA code and creates authenticated session

2. **POST /mobile/auth/oauth-exchange**
   - Accepts: `{ sessionToken }`
   - Returns: `{ success, user }`
   - Exchanges OAuth session token for authenticated session

## Redis Keys

- `mobile_mfa_session:{token}` - MFA session data (5 min TTL)
- `oauth_mobile_session:{token}` - OAuth session data (5 min TTL)

## Notes

- MFA sessions expire after 5 minutes
- The mobile app must handle both `mfa_required=true` and `success=true` parameters
- Google OAuth users (created via Google) trust Google's MFA
- Password-based users who linked Google still require app MFA
