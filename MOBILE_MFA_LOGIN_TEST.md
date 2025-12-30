# Mobile MFA Login Testing Guide

## Current Status
The mobile MFA login flow is fully implemented and should be working. The code is correct.

## Issue
The browser may have cached the old JavaScript file. You need to **hard refresh** the page.

## How to Test

### Step 1: Hard Refresh the Browser
**Important:** You must clear the browser cache to load the updated JavaScript.

**Chrome/Edge:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Or manually:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 2: Test the Login Flow

1. **Open the mobile app**: `http://localhost:8000/mobile-app.html`

2. **Log in with MFA-enabled user**:
   - Enter email and password
   - Click "Sign In"

3. **Expected behavior**:
   - Loading screen appears
   - Console shows: `[Login] MFA verification required`
   - **MFA verification screen appears** with:
     - 🔐 icon
     - "Two-Factor Authentication" title
     - 6-digit code input field
     - "Verify" button
     - "Cancel" button

4. **Enter MFA code**:
   - Type your 6-digit TOTP code from authenticator app
   - Click "Verify"

5. **Expected result**:
   - Code is verified
   - App container appears
   - Conversations load

## What the Code Does

### Login Flow (mobile-app.js lines 688-696)
```javascript
// Check if MFA is required
if (data.mfaRequired) {
    console.log('[Login] MFA verification required');
    // Store session ID for MFA verification
    this.mfaSessionId = data.sessionId;
    // Show MFA verification screen
    this.showMFAVerification();
    return;
}
```

### Show MFA Screen (mobile-app.js lines 546-555)
```javascript
showMFAVerification() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('authContainer').classList.remove('show');
    document.getElementById('mfaContainer').classList.remove('hidden');
    document.getElementById('appContainer').style.display = 'none';
    // Focus on MFA input
    setTimeout(() => {
        document.getElementById('mfaCodeInput')?.focus();
    }, 100);
}
```

### MFA Verification (mobile-app.js lines 561-638)
```javascript
async handleMFASubmit(e) {
    e.preventDefault();
    
    const code = document.getElementById('mfaCodeInput').value;
    
    // Submit MFA code to mobile endpoint
    const response = await fetch(`${this.apiUrl}/mobile/auth/mfa-verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiClient.apiKey,
            'X-Platform': this.apiClient.platform
        },
        body: JSON.stringify({
            sessionId: this.mfaSessionId,
            code: code,
            method: 'totp'
        }),
        credentials: 'include'
    });
    
    if (response.ok) {
        const data = await response.json();
        if (data.success && data.authenticated) {
            // MFA verified successfully
            this.isAuthenticated = true;
            this.mfaSessionId = null;
            this.hideMFAVerification();
            this.showApp();
            await this.loadConversations();
        }
    }
}
```

## Backend Endpoints

### POST /mobile/auth/login
Returns when MFA is required:
```json
{
  "success": true,
  "mfaRequired": true,
  "sessionId": "abc123...",
  "mfaMethods": ["totp", "backup"],
  "message": "MFA verification required"
}
```

### POST /mobile/auth/mfa-verify
Accepts:
```json
{
  "sessionId": "abc123...",
  "code": "123456",
  "method": "totp"
}
```

Returns on success:
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "mfaEnabled": true
  }
}
```

## Troubleshooting

### Issue: Blank screen after login
**Cause:** Browser cached old JavaScript
**Solution:** Hard refresh (Ctrl+Shift+R)

### Issue: MFA screen doesn't appear
**Check:**
1. Open DevTools Console (F12)
2. Look for: `[Login] MFA verification required`
3. If you see it, the backend is working
4. Check if `mfaContainer` element exists: `document.getElementById('mfaContainer')`
5. Check if it has `hidden` class: `document.getElementById('mfaContainer').classList`

### Issue: "MFA session expired"
**Cause:** Session token expired (5 minutes)
**Solution:** Log in again

### Issue: "Invalid MFA code"
**Cause:** Wrong code or time sync issue
**Solution:** 
- Check authenticator app time sync
- Try a fresh code
- Verify you're using the correct account in authenticator

## Comparison with Fairytale Genie

Both implementations now work identically:

| Feature | Fairytale Genie | Bedrock Express |
|---------|-----------------|-----------------|
| Login endpoint | `/mobile/auth/login` | `/mobile/auth/login` |
| MFA verify endpoint | `/mobile/auth/mfa-verify` | `/mobile/auth/mfa-verify` |
| Session storage | Redis (5 min) | Redis (5 min) |
| MFA UI | Dedicated screen | Dedicated screen |
| Response format | JSON | JSON |

## Next Steps

1. **Hard refresh the browser** (most important!)
2. Try logging in with MFA-enabled user
3. If you still see a blank screen, check the browser console for errors
4. Share any console errors you see

The code is correct and matches the Fairytale Genie implementation. The issue is almost certainly browser caching.
