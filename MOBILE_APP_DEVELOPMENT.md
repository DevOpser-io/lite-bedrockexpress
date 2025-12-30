# Bedrock Express Mobile App Development Guide

This template includes a complete mobile app setup for the `/chat` application using Capacitor, allowing you to build native iOS and Android apps alongside your web application.

## Quick Start

### 1. Install Dependencies
```bash
npm install
npm run install:all
```

### 2. Build Mobile App
```bash
# Build for local development
npm run mobile:build

# Build for staging
npm run mobile:build:staging

# Build for production
npm run mobile:build:prod
```

### 3. Initialize Native Projects
```bash
# First time setup
npx cap add android
npx cap add ios

# Sync after changes
npm run mobile:sync
```

### 4. Run on Device/Emulator
```bash
# Android
npm run mobile:run:android

# iOS (Mac only)
npm run mobile:run:ios
```

## Architecture

### Mobile Frontend (`mobile-chat-app.html`)
- Single-page application optimized for mobile
- Capacitor integration for native features
- OAuth authentication flow
- Real-time chat with streaming responses
- Offline support with service workers
- Responsive design for all screen sizes

### Build System
- `build-mobile.sh`: Prepares mobile assets
- GitHub Actions: Automated APK/IPA builds
- Environment-specific configurations

### Native Integration
- Capacitor for cross-platform development
- Android Studio project (`/android`)
- Xcode project (`/ios`)
- App association files for deep linking

## Development Workflow

### Simultaneous Web & Mobile Development

1. **Edit Chat Features**: Modify both web and mobile frontends
   - Web: `backend/templates/chat.ejs`
   - Mobile: `mobile-chat-app.html`

2. **Test Locally**:
   ```bash
   # Run backend
   npm run dev

   # Build mobile
   npm run mobile:build

   # Test in browser
   open frontend/public/static/dist/index.html
   ```

3. **Deploy to Device**:
   ```bash
   npm run mobile:sync
   npm run mobile:run:android
   ```

## Configuration

### Environment Variables

The mobile app automatically detects and uses the appropriate API URL:

- **Production**: Set in `build-mobile.sh`
- **Staging**: Set in `build-mobile.sh`
- **Local**: Auto-detects IP address

### API URLs

Update in `build-mobile.sh`:
```bash
production)
    API_URL="https://your-api.com"
    ;;
staging)
    API_URL="https://staging.your-api.com"
    ;;
```

### App Identity

Update in `capacitor.config.json`:
```json
{
  "appId": "com.yourcompany.app",
  "appName": "Your App Name"
}
```

## GitHub Actions Integration

### Automatic APK Generation

Every push to `main` or `staging` triggers:
1. Frontend build
2. Mobile app preparation
3. Android APK generation
4. Artifact upload (30-day retention)

### Required GitHub Secrets

Add these to your repository settings:

#### For App Signing:
- `ANDROID_DEBUG_SHA256`: Debug keystore SHA-256
- `ANDROID_PLAY_SIGNING_SHA256`: Production SHA-256 from Play Console
- `IOS_TEAM_ID`: Apple Developer Team ID
- `IOS_BUNDLE_ID`: iOS app bundle identifier

#### For AWS Deployment:
- `AWS_ROLE_TO_ASSUME`: AWS IAM role
- `AWS_REGION`: AWS region
- `ECR_REPO_NAME`: ECR repository name
- `REGISTRIES`: ECR registry URL

### Downloading Build Artifacts

1. Go to Actions tab in GitHub
2. Select the workflow run
3. Download from Artifacts section:
   - `BedrockChat-Android-APK-{branch}-{number}`

## Mobile-Specific Features

### Authentication
- Google OAuth integration
- Token storage using Capacitor Storage
- Auto-refresh on app resume

### Chat Features
- Real-time streaming responses
- Message history persistence
- Offline message queue
- Conversation management

### Native Features
- Push notifications (ready for implementation)
- Biometric authentication (ready for implementation)
- Network status monitoring
- Deep linking support

## Platform-Specific Setup

### Android Development

1. **Install Android Studio**
2. **Open Android Project**:
   ```bash
   npm run mobile:android
   ```
3. **Configure Signing** (for release):
   - Create keystore
   - Update `android/app/build.gradle`

### iOS Development (Mac Only)

1. **Install Xcode**
2. **Install CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```
3. **Open iOS Project**:
   ```bash
   npm run mobile:ios
   ```
4. **Configure Signing**:
   - Select team in Xcode
   - Set bundle identifier

## Testing

### Local Testing
```bash
# 1. Start backend
npm run dev

# 2. Build mobile
npm run mobile:build

# 3. Serve mobile app
python3 -m http.server 3000 -d frontend/public/static/dist

# 4. Open browser
# http://localhost:3000
```

### Device Testing

#### Android
```bash
# USB debugging enabled
npm run mobile:run:android

# Or generate APK
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/
```

#### iOS
```bash
# Mac with Xcode required
npm run mobile:run:ios
```

## Troubleshooting

### Common Issues

1. **Build Fails**:
   ```bash
   rm -rf node_modules
   npm install
   npx cap sync
   ```

2. **Android Studio Issues**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew build
   ```

3. **iOS Pod Issues**:
   ```bash
   cd ios/App
   pod install --repo-update
   ```

4. **API Connection Issues**:
   - Check `build-mobile.sh` for correct API URL
   - Ensure CORS is configured in backend
   - Verify network permissions in app

### Debug Tools

- **Chrome DevTools**: For web debugging
- **Android Studio Logcat**: For Android logs
- **Xcode Console**: For iOS logs
- **Safari Web Inspector**: For iOS web debugging

## Production Deployment

### Android (Google Play)

1. Generate signed APK/AAB
2. Upload to Play Console
3. Get production SHA-256
4. Update GitHub secrets

### iOS (App Store)

1. Archive in Xcode
2. Upload to App Store Connect
3. Submit for review
4. Update GitHub secrets with Team ID

## Extending the Mobile App

### Adding New Features

1. **Update Mobile HTML**: `mobile-chat-app.html`
2. **Add Native Plugin**:
   ```bash
   npm install @capacitor/plugin-name
   npx cap sync
   ```
3. **Update Build Script**: `build-mobile.sh`
4. **Test on Devices**

### Customizing UI

- Edit styles in `mobile-chat-app.html`
- Add assets to `mobile/assets/`
- Update icons and splash screens

### API Integration

Modify endpoints in `mobile-chat-app.html`:
```javascript
endpoints: {
    chat: {
        send: '$API_URL/your/endpoint',
        // Add new endpoints
    }
}
```

## Best Practices

1. **Keep Web & Mobile in Sync**: Update both frontends together
2. **Test on Real Devices**: Emulators don't catch all issues
3. **Version Control**: Tag releases for mobile app stores
4. **Security**: Never commit API keys or certificates
5. **Performance**: Optimize images and minimize bundle size

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com)
- [iOS Developer Guide](https://developer.apple.com)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review GitHub Actions logs
3. Consult platform-specific documentation
4. Open an issue in the repository

---

*This mobile app setup allows you to maintain a single codebase while deploying to web, iOS, and Android platforms simultaneously.*