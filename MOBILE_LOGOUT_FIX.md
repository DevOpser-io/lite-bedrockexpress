# Mobile Logout Fix

## Problem
When users tried to sign out from the mobile app, they received an error: "Error signing out. Please try again."

## Root Cause
The mobile app was calling `/auth/logout` which **always returns a 302 redirect** to `/auth/login`. The mobile app uses `MobileAPIClient` which expects JSON responses, not HTML redirects. When the logout endpoint returned a redirect:
1. The fetch request followed the redirect to `/auth/login`
2. The response was HTML (the login page), not JSON
3. The mobile app's error handler caught this as an error
4. User saw "Error signing out. Please try again."

## Solution (Benchmarked against Fairytale Genie)
After analyzing the working implementation in fairytalegenie-bedrockexpress, I found they use a **dedicated mobile logout endpoint** at `/auth/mobile/logout` that always returns JSON.

This is cleaner than trying to detect mobile clients in the regular logout endpoint because:
- No header detection needed
- Clear separation of concerns
- No risk of accidentally breaking web logout
- Follows REST API best practices

### Changes Made:
1. **Created `/auth/mobile/logout` endpoint** in `backend/routes/auth.js` that always returns JSON
2. **Updated mobile app** to call `/auth/mobile/logout` instead of `/auth/logout`

## Implementation Details

### File: `backend/routes/auth.js` (lines 1085-1119)

**New Mobile Logout Endpoint:**
```javascript
// POST /auth/mobile/logout - Mobile logout endpoint (always returns JSON)
router.post('/mobile/logout', async (req, res) => {
  try {
    console.log('[Mobile Logout] Request received');
    
    // Clear session if it exists
    if (req.session) {
      delete req.session.mfaVerified;
      delete req.session.conversationId;
    }
    
    // Logout using passport
    req.logout(function(err) {
      if (err) {
        console.error('[Mobile Logout] Passport logout error:', err);
        return res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }
      
      console.log('[Mobile Logout] Logout successful');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    console.error('[Mobile Logout] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});
```

### File: `backend/public/mobile-app.js` (line 471)

**Before:**
```javascript
const response = await this.apiClient.post('/auth/logout', {});
```

**After:**
```javascript
const response = await this.apiClient.post('/auth/mobile/logout', {});
```

## How It Works

### Endpoint Separation
- **`/auth/mobile/logout`** - Dedicated mobile endpoint that always returns JSON
- **`/auth/logout`** - Web endpoint that redirects to login page

### Response Format

**Mobile Endpoint (`/auth/mobile/logout`):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Web Endpoint (`/auth/logout`):**
- HTTP 302 redirect to `/auth/login`

## Mobile App Flow

1. User clicks "Sign Out" button
2. Mobile app calls `this.apiClient.post('/auth/mobile/logout', {})`
3. Server processes logout and returns JSON
4. Mobile app receives `{ success: true }` response
5. Mobile app clears local storage and shows login screen

## Comparison with Fairytale Genie

| Aspect | Fairytale Genie | Bedrock Express (Fixed) |
|--------|-----------------|-------------------------|
| Mobile Endpoint | `/auth/mobile/logout` | `/auth/mobile/logout` |
| Web Endpoint | `/auth/logout` | `/auth/logout` |
| Response Type | JSON for mobile, redirect for web | JSON for mobile, redirect for web |
| Header Detection | Not needed (separate endpoints) | Not needed (separate endpoints) |
| Session Cleanup | ✓ | ✓ |

## Testing

- [ ] Mobile app logout → Returns JSON, clears session
- [ ] Web app logout → Redirects to login page
- [ ] Logout error handling → Returns appropriate error

## Related Files

- `/backend/routes/auth.js` - Logout endpoints (both mobile and web)
- `/backend/public/mobile-api-client.js` - Mobile API client
- `/backend/public/mobile-app.js` - Mobile app that calls logout

## Notes

- **Cleaner architecture**: Separate endpoints for mobile and web (following Fairytale Genie pattern)
- **No header detection needed**: Endpoint path determines response type
- **Backward compatible**: Web logout unchanged
- **Session properly destroyed**: Both mobile and web clients clear session
- **MFA verification flag cleared**: Ensures proper re-authentication
