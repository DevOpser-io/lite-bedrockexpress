# Mobile App Production Deployment Guide

This guide covers the complete process for deploying the Bedrock Chat mobile app to production via Google Play Store.

## Prerequisites

- Google Play Console account (Developer account - $25 one-time fee)
- Java Development Kit (JDK) 17 installed locally
- Android Studio (optional, but helpful for testing)

## Part 1: Generate Production Signing Key

### 1.1 Create Keystore

On your **local machine** (keep this secure):

```bash
# Create a secure directory for your keystore
mkdir -p ~/android-keys
cd ~/android-keys

# Generate the production keystore
keytool -genkey -v -keystore bedrock-chat-release.keystore \
  -alias bedrock-chat \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You'll be prompted for:
- **Keystore password**: Choose a strong password (save securely!)
- **Key password**: Can be same as keystore password
- **Name**: Your name or company name
- **Organizational Unit**: Your team/department
- **Organization**: Your company name
- **City**, **State**, **Country Code**

⚠️ **CRITICAL**: Back up this keystore file and passwords in a secure location (password manager, encrypted storage). If you lose this, you **cannot update your app** on Google Play Store!

### 1.2 Extract SHA-256 Fingerprint

```bash
keytool -list -v -keystore bedrock-chat-release.keystore -alias bedrock-chat
```

Look for the **SHA-256** certificate fingerprint. It will look like:
```
SHA256: FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

Copy this - you'll need it for Google Play Console and deep linking.

### 1.3 Encode Keystore for GitHub

```bash
# Convert keystore to base64
base64 -i bedrock-chat-release.keystore -o bedrock-chat-release.keystore.b64

# Display the encoded content (you'll copy this to GitHub Secrets)
cat bedrock-chat-release.keystore.b64
```

On macOS, if the above doesn't work, try:
```bash
base64 -i bedrock-chat-release.keystore > bedrock-chat-release.keystore.b64
```

## Part 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Contents of `.b64` file | Base64-encoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Your keystore password | Password from Step 1.1 |
| `ANDROID_KEY_ALIAS` | `bedrock-chat` | Alias used when creating keystore |
| `ANDROID_KEY_PASSWORD` | Your key password | Usually same as keystore password |
| `ANDROID_RELEASE_SHA256` | SHA-256 fingerprint | From Step 1.2 |

## Part 3: Build Production APK

### 3.1 Automatic Build (GitHub Actions)

Once secrets are configured, pushing to the `main` branch will automatically:
1. Build a **signed release APK** (not debug)
2. Upload it as a workflow artifact
3. Use production environment configuration

### 3.2 Manual Build (Local)

If you want to build locally:

```bash
# Sync Capacitor
npx cap sync android

# Configure Android signing
./configure-android-signing.sh

# Create keystore.properties file
cat > android/keystore.properties << EOF
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=bedrock-chat
storeFile=../release.keystore
EOF

# Copy your keystore to the android directory
cp ~/android-keys/bedrock-chat-release.keystore android/release.keystore

# Build release APK
cd android
./gradlew assembleRelease

# The APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Part 4: Prepare for Google Play Store

### 4.1 Create App Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - **App name**: Bedrock Chat
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
   - Accept declarations
4. Click **Create app**

### 4.2 Set Up App Content

Complete all required sections in the Play Console:

#### Privacy Policy
- Create and host a privacy policy (required for apps handling user data)
- Add the URL to Play Console

#### App Access
- Specify if app requires login
- Provide demo credentials if needed

#### Ads
- Declare whether your app contains ads

#### Content Rating
- Complete the content rating questionnaire
- Get your app rated (ESRB, PEGI, etc.)

#### Target Audience
- Select age groups
- Declare if app is directed at children

#### Store Listing
- **App name**: Bedrock Chat
- **Short description** (80 chars max)
- **Full description** (4000 chars max)
- **Screenshots**:
  - At least 2 screenshots (phone)
  - Recommended: 6-8 screenshots showing key features
  - Size: 16:9 or 9:16 aspect ratio
  - Resolution: 1080x1920 or higher
- **App icon**: 512x512 PNG (32-bit)
- **Feature graphic**: 1024x500 JPG or PNG
- **App category**: Choose appropriate category

### 4.3 Upload APK/AAB

⚠️ **Important**: Google Play Store requires **Android App Bundle (AAB)** format, not APK.

#### Option A: Use Play App Signing (Recommended)

This is the easiest approach:

1. In Play Console, go to **Setup** → **App signing**
2. Accept the terms for **Play App Signing**
3. Google will manage your app signing key
4. You upload APKs signed with your upload key

To create an App Bundle instead of APK:

```bash
cd android
./gradlew bundleRelease

# The AAB will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

Update the GitHub workflow to build AAB:

```yaml
# In build-and-deploy.yml, change:
./gradlew assembleRelease
# To:
./gradlew bundleRelease
```

#### Option B: Manual Upload (First Release)

1. Go to **Release** → **Production**
2. Click **Create new release**
3. Upload your **app-release.aab** file
4. Fill in release notes
5. Review and roll out to production

### 4.4 Configure App Signing (Play Console)

If using Play App Signing:

1. Get the **SHA-256 certificate fingerprint** from Play Console:
   - Go to **Setup** → **App signing**
   - Copy the **SHA-256 certificate fingerprint** under "App signing key certificate"
2. Add this to your GitHub Secrets as `ANDROID_PLAY_SIGNING_SHA256`
3. This is used for deep linking and OAuth configuration

## Part 5: Publishing

### 5.1 Internal Testing (Optional but Recommended)

Before public release, test with internal testers:

1. Go to **Testing** → **Internal testing**
2. Create a new release
3. Add internal testers by email
4. Upload AAB and publish
5. Testers will receive link to download from Play Store

### 5.2 Production Release

1. Complete all **required sections** in Play Console (they'll have a checkmark when done)
2. Go to **Release** → **Production**
3. Click **Create new release**
4. Upload **app-release.aab**
5. Add **release notes** (what's new in this version)
6. Set **rollout percentage** (start with 20% for safety, then increase)
7. Click **Review release**
8. Click **Start rollout to Production**

⏰ **Review time**: Google typically reviews apps within 1-3 days.

### 5.3 Subsequent Updates

For future updates:

1. Increment version in `android/app/build.gradle`:
   ```gradle
   versionCode 2  // Increment for each release
   versionName "1.1.0"  // Semantic versioning
   ```
2. Build new AAB
3. Upload to Play Console
4. Add release notes
5. Roll out

## Part 6: Deep Linking Configuration

Your app uses deep linking (configured in `.well-known/assetlinks.json`).

After uploading to Play Store, verify deep linking works:

1. Get the **Play App Signing SHA-256** from Play Console
2. Update GitHub Secret: `ANDROID_PLAY_SIGNING_SHA256`
3. Redeploy your backend to update `assetlinks.json`
4. Verify at: `https://yourdomain.com/.well-known/assetlinks.json`
5. Test with Google's tool: https://developers.google.com/digital-asset-links/tools/generator

## Troubleshooting

### Build Fails with "keystore not found"

- Ensure all GitHub Secrets are set correctly
- Check that secret names match exactly
- Verify base64 encoding is correct (no extra whitespace)

### App Signing Certificate Mismatch

- Use the SHA-256 from **Play Console** → **App signing** (not your upload key)
- Update `assetlinks.json` with Play Store's signing key

### "Upload failed: version code already exists"

- Increment `versionCode` in `android/app/build.gradle`
- Each upload must have a unique, incrementing version code

### Deep Links Not Working

- Verify `assetlinks.json` is accessible and correct
- Check SHA-256 fingerprints match
- Use Google's verification tool
- Wait 24-48 hours after uploading to Play Store

## Security Best Practices

1. ✅ Never commit keystores or passwords to git
2. ✅ Store keystore in secure backup (encrypted cloud storage)
3. ✅ Use GitHub Secrets for all sensitive values
4. ✅ Limit access to production secrets
5. ✅ Rotate passwords annually
6. ✅ Keep a copy of SHA-256 fingerprints documented

## Useful Commands

```bash
# Check APK signing info
apksigner verify --print-certs app-release.apk

# Get SHA-256 from APK
keytool -printcert -jarfile app-release.apk

# Get SHA-256 from keystore
keytool -list -v -keystore bedrock-chat-release.keystore

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build release AAB
./gradlew bundleRelease

# Clean build
./gradlew clean
```

## Resources

- [Google Play Console](https://play.google.com/console)
- [Android App Signing Docs](https://developer.android.com/studio/publish/app-signing)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [Deep Linking Guide](https://developer.android.com/training/app-links)
- [Digital Asset Links Tester](https://developers.google.com/digital-asset-links/tools/generator)

---

## Quick Reference

### One-Time Setup Checklist

- [ ] Generate production keystore
- [ ] Save keystore and passwords securely
- [ ] Extract SHA-256 fingerprint
- [ ] Add all 5 GitHub Secrets
- [ ] Create Google Play Console account
- [ ] Create app listing in Play Console
- [ ] Complete all required Play Console sections
- [ ] Set up Play App Signing
- [ ] Build and upload first AAB

### For Each Release

- [ ] Increment versionCode and versionName
- [ ] Test locally or in internal testing
- [ ] Build signed AAB (`./gradlew bundleRelease`)
- [ ] Upload to Play Console
- [ ] Add release notes
- [ ] Review and publish
- [ ] Monitor for crashes/reviews

---

**Last Updated**: 2025-10-26
