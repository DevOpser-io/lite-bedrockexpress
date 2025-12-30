# Mobile MFA Implementation Plan - Using Fairytale Genie Pattern

## Current Issue
The mobile-app.html in bedrock-express uses a complex component-based system with separate containers that get shown/hidden. This is causing issues with MFA flow.

## Fairytale Genie Pattern (Working)
Fairytale Genie uses a simple **view-based system**:

1. **All views in one HTML file** - Each screen is a `<div class="view">` 
2. **CSS-based visibility** - Active view has `class="view active"`
3. **Simple showView() function** - Toggles active class on views
4. **No redirects** - Everything happens in the same page
5. **Deep links only for native apps** - The mobile-app.html uses view switching

### Key Code Pattern:

```html
<!-- Login View -->
<div id="login-view" class="view active">
    <!-- Login form -->
</div>

<!-- MFA View -->
<div id="mfa-view" class="view">
    <!-- MFA form -->
</div>
```

```javascript
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    }
}

// When MFA is required
if (result.mfaRequired) {
    window.mfaSessionData = {
        mfaSessionToken: result.mfaSessionToken
    };
    showView('mfa-view');
    document.getElementById('mfa-code').focus();
}
```

## Implementation Steps

### 1. Update HTML Structure
Replace the current container-based system with view-based system:
- Convert `authContainer`, `mfaContainer`, `appContainer` to views
- Add `class="view"` to each screen
- Add `class="active"` to the default view (login)

### 2. Update CSS
Add view CSS from Fairytale Genie:
```css
.view {
    display: none;
}

.view.active {
    display: block;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

### 3. Update JavaScript
- Replace `showMFAVerification()` with `showView('mfa-view')`
- Replace `showLogin()` with `showView('login-view')`
- Replace `showApp()` with `showView('chat-view')`
- Add `showView()` function from Fairytale Genie

### 4. Update Login Flow
```javascript
// When login response comes back
if (data.mfaRequired) {
    window.mfaSessionData = {
        mfaSessionToken: data.sessionId  // Note: bedrock uses sessionId
    };
    showView('mfa-view');
    document.getElementById('mfa-code').focus();
}
```

### 5. Update MFA Verification
```javascript
// MFA form submit
const mfaSessionToken = window.mfaSessionData?.mfaSessionToken;
const response = await fetch('/mobile/auth/mfa-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        sessionId: mfaSessionToken,  // bedrock uses sessionId
        code: code,
        method: 'totp'
    })
});
```

## Benefits of This Approach

1. ✅ **Simpler** - No complex show/hide logic
2. ✅ **More reliable** - CSS handles visibility
3. ✅ **Matches Fairytale Genie** - Proven working implementation
4. ✅ **No redirects** - Everything in one page
5. ✅ **Easy to debug** - Just check which view has 'active' class

## Files to Modify

1. `/home/ec2-user/bedrock-express/backend/public/mobile-app.html`
   - Restructure to use view-based system
   - Add MFA view with proper structure

2. `/home/ec2-user/bedrock-express/backend/public/mobile-app.css`
   - Add view CSS rules
   - Add fadeIn animation

3. `/home/ec2-user/bedrock-express/backend/public/mobile-app.js`
   - Add showView() function
   - Update all navigation to use showView()
   - Update login flow to handle MFA
   - Update MFA verification

## Next Steps

1. Copy the exact view structure from Fairytale Genie
2. Adapt it to bedrock-express (change story views to chat views)
3. Test the MFA flow
4. Ensure Google OAuth still works
