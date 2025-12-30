# lite expressAI Application Template (with Claude Sonnet 3.5 via AWS Bedrock)

This repository contains the code for the lite AI application.
This is a site template for the [DevOpser AI Hosting and Development platform](https://app.devopser.io).

## CICD Process (GitOps)

## Development Environment Setup

The easiest way to get up and running is to launch a development environment within the Site Detail page of your site on the [DevOpser platform](https://app.devopser.io). See the following docs for step by step guide:
- [Launch a Development Environment](https://devopser.io/docs/launch-development-environment.html)
    
To launch a Dev environment inside your own infrastructure/ VPC, subscribe to [the Bedrock express AMI in AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-tti62q7ulbcoq), spin up an EC2 using the AMI, and clone this repo into the environment. For detailed step by step instructions to get up and running, [please see the following tutorial](https://devopser.io/blog/get-started-building-your-own-ai-application-in-20-minutes.html) or you can use the [Terraform quickstart](https://github.com/DevOpser-io/bedrock-express-quickstart).

## Deployment Process (Staging and Production)

1. Create a new branch for your changes, or you can use the "dev" branch that has been pre-made for you.
2. Make your changes in the new branch and test your changes thoroughly on a remote dev environment.
3. Create a pull request to the appropriate branch:
   - For staging deployment: Create a pull request to the `staging` branch.
   - For production deployment: Create a pull request to the `main` branch.
4. Wait for the required reviews and checks to pass.
5. Merge your own PR at your discretion. When you merge your PR or push changes to Staging, you will trigger a build and deployment to the staging environment.
6. If everything looks good, merge the PR to main and trigger a build and deployment to the production environment.

## Mobile App Builds (Optional)

This repository includes GitHub Actions workflows to automatically build Android APK/AAB files and iOS IPA files. Mobile builds are optional - the web application will build and deploy normally even if mobile secrets are not configured.

### Required GitHub Secrets for Mobile Builds

#### Android Build Secrets

To enable Android signed release builds, add these secrets to your GitHub repository:

1. **ANDROID_PACKAGE_NAME** - Your Android app package name (e.g., "com.example.app")
   - Find it in your `android/app/build.gradle` file as `applicationId`
   - This is used for both Capacitor initialization and Google Play uploads

2. **ANDROID_KEYSTORE_BASE64** - Your Android keystore file encoded as base64
   ```bash
   # Generate a keystore (if you don't have one):
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
       
   # Encode existing keystore to base64:
   base64 -i upload-keystore.jks -o keystore-base64.txt
   # Copy the contents of keystore-base64.txt as the secret value
   ```

3. **ANDROID_KEYSTORE_PASSWORD** - The password for your keystore

4. **ANDROID_KEY_ALIAS** - The alias you used when creating the keystore (e.g., "upload")

5. **ANDROID_KEY_PASSWORD** - The password for the key (often same as keystore password)

#### Android Google Play Upload (Optional)

To automatically upload builds to Google Play Console:

1. **GOOGLE_PLAY_SERVICE_ACCOUNT_JSON** - Service account JSON for Google Play uploads

   **Setup Instructions:**
   1. Go to [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select existing
   3. Enable the "Google Play Android Developer API"
   4. Create a service account:
      - Go to "IAM & Admin" → "Service Accounts"
      - Click "Create Service Account"
      - Give it a name like "github-actions-playstore"
      - Grant no specific roles in Cloud Console
   5. Create and download JSON key:
      - Click on the service account
      - Go to "Keys" tab → "Add Key" → "Create new key" → JSON
   6. In Google Play Console:
      - Go to "Users and Permissions"
      - Invite the service account email
      - Grant "Release Manager" permissions
   7. Encode the JSON file as the secret value (paste entire JSON content)

#### iOS Build Secrets

To enable iOS signed builds and TestFlight uploads:

1. **IOS_BUNDLE_ID** - Your iOS app bundle identifier (e.g., "com.example.app")
   - Find it in Apple Developer Portal under Identifiers
   - This is used for Capacitor initialization and provisioning

2. **IOS_CERTIFICATE_BASE64** - Your iOS distribution certificate (.p12) as base64
   ```bash
   # Export certificate from Keychain Access as .p12, then:
   base64 -i Certificates.p12 -o cert-base64.txt
   ```

3. **IOS_CERTIFICATE_PASSWORD** - Password for the .p12 certificate

4. **IOS_PROVISIONING_PROFILE_BASE64** - Your provisioning profile as base64
   ```bash
   # Download from Apple Developer Portal, then:
   base64 -i YourApp.mobileprovision -o profile-base64.txt
   ```

5. **APPLE_TEAM_ID** - Your Apple Developer Team ID (found in Apple Developer Portal)

#### iOS TestFlight Upload (Optional)

To automatically upload to TestFlight:

1. **APP_STORE_CONNECT_API_KEY_ID** - API Key ID from App Store Connect

2. **APP_STORE_CONNECT_API_ISSUER_ID** - Issuer ID from App Store Connect

3. **APP_STORE_CONNECT_API_KEY_BASE64** - The .p8 private key file as base64

   **Setup Instructions:**
   1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
   2. Navigate to "Users and Access" → "Keys"
   3. Click "+" to create a new API key
   4. Name it (e.g., "GitHub Actions") and select "App Manager" role
   5. Download the .p8 file (you can only download once!)
   6. Note the Key ID and Issuer ID shown on the page
   7. Encode the .p8 file:
      ```bash
      base64 -i AuthKey_XXXXXXXXXX.p8 -o apikey-base64.txt
      ```

#### App Association Files (Optional)

For deep linking support:

- **ANDROID_DEBUG_SHA256** - SHA256 fingerprint of debug certificate
- **ANDROID_RELEASE_SHA256** - SHA256 fingerprint of release certificate
- **IOS_BUNDLE_ID** - Your iOS app bundle identifier
- **IOS_TEAM_ID** - Your Apple Developer Team ID

### Adding Secrets to GitHub

1. Go to your repository on GitHub
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each secret with the name and value as specified above

### Build Outputs

- **Android**: APK files for direct installation, AAB files for Google Play Store
- **iOS**: IPA files for TestFlight/App Store distribution
- Builds are uploaded as GitHub Actions artifacts
- Staging builds have WebView debugging enabled for development
- Production builds have debugging disabled for security

Without these secrets configured, the workflow will still build debug versions for testing, but won't create signed releases suitable for app store distribution.
