# Bedrock Express

An Express.js version of a Bedrock AI Chat application with Amazon Bedrock integration. This application features a clear separation between frontend and backend components for easier AI-driven customization.

## Project Structure

The project is organized with a clear separation of concerns:

```
bedrock-express/
├── frontend/                 # Frontend code
│   ├── node_modules/         # Frontend dependencies
│   ├── public/               # Static assets served by Express
│   │   ├── static/           # CSS, JS, images, etc.
│   │   └── index.html        # Main HTML entry point
│   ├── src/                  # Frontend source code
│   │   ├── chat.js           # Chat functionality
│   │   ├── styles.css        # Main stylesheet
│   │   ├── mfa.js            # Multi-factor authentication
│   │   └── account.js        # Account management
│   ├── package.json          # Frontend dependencies
│   └── webpack.config.js     # Frontend webpack configuration
│
├── backend/                  # Backend code
│   ├── node_modules/         # Backend dependencies
│   ├── config/               # Configuration settings
│   ├── controllers/          # Request handlers
│   ├── routes/               # API routes
│   ├── services/             # Business logic and external services
│   ├── utils/                # Utility functions
│   ├── package.json          # Backend dependencies
│   └── server.js             # Main entry point
│
└── package.json              # Root coordination scripts
```

## Features

- Clear separation between frontend and backend
- Amazon Bedrock integration for AI chat
- Streaming message responses
- Chat history management
- Temporary/persistent conversation modes

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- AWS credentials configured for Bedrock access

### Installation

```bash
# Install all dependencies (frontend and backend)
npm run install:all
```

### Development

```bash
# Build frontend assets and start backend in development mode
npm run dev

# Just build frontend assets
npm run frontend:build

# Watch frontend files for changes
npm run frontend:watch

# Start backend in development mode
npm run backend:dev
```

### Production

```bash
# Build frontend and start backend
npm start
```

## Configuration

The application's configuration is centralized in the `backend/config/index.js` file. You can customize settings through environment variables or by modifying the config file directly.

Key settings include:

- Server port (default: 8000)
- AWS Bedrock model ID and parameters
- Chat settings (system prompt, history size)

## Architecture

This application follows a modular architecture:

1. **Frontend**: Browser-based UI built with vanilla JavaScript and CSS
2. **Backend**: Express.js server with Amazon Bedrock integration
3. **API**: RESTful endpoints for chat and conversation management

The frontend and backend communicate via HTTP requests, with server-sent events (SSE) used for streaming responses.

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow that builds Docker images, deploys to AWS, and optionally builds mobile apps for Android and iOS.

### Required GitHub Secrets (Core)

These secrets are required for the basic Docker build and AWS deployment:

| Secret | Description |
|--------|-------------|
| `AWS_REGION` | AWS region for deployment (e.g., `us-east-1`) |
| `AWS_ROLE_TO_ASSUME` | IAM role ARN for GitHub Actions OIDC |
| `REGISTRIES` | ECR registry ID(s) |
| `ECR_REPO_NAME` | ECR repository name |
| `TFC_TOKEN` | Terraform Cloud API token |
| `DB_NAME_SECRET_NAME` | AWS Secrets Manager name for database name |
| `DB_USER_SECRET_NAME` | AWS Secrets Manager name for database user |
| `DB_PASSWORD_SECRET_NAME` | AWS Secrets Manager name for database password |
| `DB_HOST_SECRET_NAME` | AWS Secrets Manager name for database host |
| `DB_PORT_SECRET_NAME` | AWS Secrets Manager name for database port |

### Optional Secrets (Terraform Cloud)

For Terraform Cloud integration (production and staging deployments):

| Secret | Description |
|--------|-------------|
| `CONTAINER_LABEL_AIDEMO_WORKSPACE_ID` | Production TFC workspace ID |
| `CONTAINER_LABEL_AIDEMO_VARIABLE_ID` | Production TFC variable ID |
| `CONTAINER_LABEL_AIDEMO_WORKSPACE_ID_STAGING` | Staging TFC workspace ID |
| `CONTAINER_LABEL_AIDEMO_VARIABLE_ID_STAGING` | Staging TFC variable ID |
| `source_workspace_id_flaskai` | Source workspace ID |
| `source_workspace_flaskai_variable_id` | Source workspace variable ID (production) |
| `source_workspace_flaskai_variable_id_staging` | Source workspace variable ID (staging) |

### Optional Secrets (Mobile App Build - Android)

These secrets enable Android app building and signing. If not provided, the mobile build steps will be skipped gracefully:

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded Android keystore file (.jks) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias in the keystore |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_PACKAGE_NAME` | Android package name (e.g., `com.example.app`) |
| `ANDROID_DEBUG_SHA256` | Debug signing certificate SHA-256 fingerprint |
| `ANDROID_RELEASE_SHA256` | Release signing certificate SHA-256 fingerprint |
| `ANDROID_PLAY_SIGNING_SHA256` | Google Play signing certificate SHA-256 fingerprint |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play Console service account JSON (for automatic uploads) |

### Optional Secrets (Mobile App Build - iOS)

These secrets enable iOS app building and signing. If not provided, the iOS build job will be skipped:

| Secret | Description |
|--------|-------------|
| `IOS_CERTIFICATE_BASE64` | Base64-encoded iOS distribution certificate (.p12) |
| `IOS_CERTIFICATE_PASSWORD` | Certificate password |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded provisioning profile |
| `IOS_TEAM_ID` | Apple Developer Team ID |
| `IOS_BUNDLE_ID` | iOS app bundle ID (e.g., `com.example.app`) |
| `APPLE_TEAM_ID` | Apple Team ID for code signing |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API Key ID (for TestFlight uploads) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | App Store Connect API Issuer ID |
| `APP_STORE_CONNECT_API_KEY_BASE64` | Base64-encoded App Store Connect API key (.p8) |

### Graceful Degradation

The CI/CD pipeline is designed to run gracefully even without all secrets configured:

- **No mobile secrets**: Docker build and deployment proceed normally; mobile build steps are skipped
- **No Android keystore**: Debug APKs are built instead of signed release builds
- **No iOS certificates**: iOS build job is skipped entirely
- **No Google Play credentials**: AAB files are uploaded as artifacts only (manual upload required)
- **No TestFlight credentials**: IPA files are uploaded as artifacts only (manual upload required)

### Mobile Build Prerequisites

To enable mobile builds, your project needs:

1. `capacitor.config.json` - Capacitor configuration file
2. `build-mobile.sh` - Mobile build script
3. `android/` directory - Android project (can be auto-generated by Capacitor)
4. `ios/` directory - iOS project (can be auto-generated by Capacitor)

### Branch Strategy

- **main**: Production builds with full signing and deployment
- **staging**: Staging builds with WebView debugging enabled for testing

Staging builds enable Chrome DevTools (Android) and Safari Web Inspector (iOS) debugging to help diagnose issues before production deployment.