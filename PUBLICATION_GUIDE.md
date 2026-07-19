# TripMatch Mobile - App Store Publication Guide

## 🚀 Pre-Publication Checklist

### CRITICAL (Blocking Publication)
- [ ] Fix EAS Project ID in app.json
- [ ] Verify backend API uses HTTPS in production
- [ ] Create Privacy Policy (link in app)
- [ ] Create Terms of Service (link in app)
- [ ] Implement account deletion UI (/profile/settings exists with delete button)
- [ ] Configure support email/contact info
- [ ] Set correct API_URL for production environment

### IMPORTANT (Should Complete)
- [ ] Test on iOS device/simulator (iPhone 14 Pro, iPhone SE)
- [ ] Test on Android device/emulator (Samsung S23, Pixel 8)
- [ ] Test all payment flows (Stripe + Flutterwave)
- [ ] Test 2FA flows (Authenticator + SMS)
- [ ] Test image uploads and caching
- [ ] Test real-time messaging (WebSocket)
- [ ] Test location features
- [ ] Create 6+ App Store screenshots per platform
- [ ] Write compelling app description
- [ ] Set content rating
- [ ] Configure app pricing and regions

### RECOMMENDED
- [ ] Beta test on TestFlight (iOS) for 2+ weeks
- [ ] Beta test on Google Play Beta for 2+ weeks
- [ ] Performance test on low-end devices
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Load testing payment system
- [ ] Test offline mode and sync

## 📱 Local Testing Setup

### Prerequisites
```bash
# Install Expo CLI
npm install -g expo-cli eas-cli

# Or use npx (no installation needed)
# npx expo [command]
# npx eas [command]
```

### Test on iOS Simulator
```bash
# Install Xcode (if not already installed)
# From App Store or: xcode-select --install

# Run on default simulator
npm run ios

# Run on specific simulator
npx expo run:ios --device "iPhone 15 Pro"

# Or using Expo Go (faster)
npx expo start
# Then press 'i' in terminal to open on iOS simulator
```

### Test on Android Emulator
```bash
# Install Android Studio with emulator setup

# Run on default emulator
npm run android

# Or using Expo Go
npx expo start
# Then press 'a' in terminal to open on Android emulator
```

### Quick Expo Go Preview (No Build)
```bash
# Shows QR code to scan with Expo Go app
npx expo start

# On device: Open Expo Go app → Scan QR code
```

## 🏗️ Building for App Stores

### Setup EAS (Expo Application Services)

```bash
# 1. Create/login to EAS account
npx eas login

# 2. Configure EAS project
npx eas build:configure

# 3. Update app.json with your EAS project ID
# (Get from https://expo.dev/projects)
# Replace: "projectId": "REPLACE_WITH_YOUR_EAS_PROJECT_ID"
# With: "projectId": "your-actual-project-id"
```

### Build for iOS

```bash
# Create development build (for TestFlight)
npx eas build --platform ios --profile preview

# Create production build
npx eas build --platform ios --profile production

# Auto-submit to App Store Connect (requires credentials)
npx eas build --platform ios --auto-submit
```

### Build for Android

```bash
# Create development build (for internal testing)
npx eas build --platform android --profile preview

# Create production build (for Google Play)
npx eas build --platform android --profile production

# Auto-submit to Google Play (requires credentials)
npx eas build --platform android --auto-submit
```

### Configure EAS Profiles

Create `eas.json` if not present:

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    },
    "preview2": {
      "android": { "gradleCommand": ":app:assembleRelease" },
      "ios": { "buildConfiguration": "Release" }
    },
    "production": {
      "android": { "buildType": "apk" },
      "ios": {}
    }
  }
}
```

## 🔐 Production Configuration

### Environment Variables

Create `.env.production`:
```
EXPO_PUBLIC_API_URL=https://api.tripmatch.io/api
EXPO_PUBLIC_SENTRY_DSN=https://[your-sentry-dsn]@[sentry-host]/[project-id]
```

Update `app.json`:
```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": false
    }
  }
}
```

## 📋 iOS App Store Submission

### Prepare for App Store Connect

1. **Create Apple Developer Account**: $99/year at developer.apple.com
2. **Create App ID**: Unique identifier for your app
3. **Configure Certificates & Provisioning Profiles**: (EAS handles this)
4. **Prepare App Store Listing**:
   - App name: "TripMatch"
   - Subtitle: "Find Your Travel Companion"
   - Description (max 4000 chars)
   - Keywords: travel, buddy, trips, adventure, social
   - Support URL & Privacy Policy URL
   - Screenshots (6 required, up to 5)
   - Promotional image (1024×1024 min)
   - Preview video (optional, but recommended)

### App Store Review Guidelines Compliance

✅ **Already Compliant:**
- Portrait orientation support
- iPad support
- Error handling
- No private APIs
- HTTPS-only (when backend HTTPS)
- Proper permissions

⚠️ **Must Address:**
- Privacy Policy: Must explain all data collection
- Terms of Service: Must be accessible in-app
- Account Deletion: Implement UI button (backend exists)
- Age Rating: Set to 17+ (payment features, social)

### Content Rating

Fill out questionnaire:
- Frequent/Intense Violence: No
- Frequent/Intense Sexual Content: No
- Profanity or Crude Humor: No
- Alcohol, Tobacco, Drugs: No
- Gambling: No
- Prolonged Graphic Sadistic Violence: No
- Graphic Sexual Content: No
- Health/Safety: Maybe (location tracking)
- Kids: No

**Recommended Rating: 17+** (In-app purchases + social interaction)

## 📱 Google Play Store Submission

### Prepare for Google Play Console

1. **Create Google Developer Account**: $25 one-time at play.google.com
2. **Create App Listing**: Travel & Local category
3. **Prepare Store Listing**:
   - App title: "TripMatch"
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - Screenshots (2-8 per phone, up to 12)
   - Feature graphic (1024×500)
   - Privacy policy URL (required)
   - Contact info & Support URL

### Content Rating

Fill out IAMAI (India) questionnaire:
- Target audience: Teens (13+), Adults (16+)
- Violence/Gore: No
- Drugs: No
- Sexual content: No
- Profanity: No
- Gambling: Yes (contains payment features)

**Recommended Rating: 12+** (Payment features, social matching)

## 🧪 Testing Checklist

### Core Features
- [ ] Login/signup flow
- [ ] Profile completion modal
- [ ] Trip browsing and filtering
- [ ] Trip detail view with map
- [ ] Real-time messaging
- [ ] Buddy requests
- [ ] Activity feed

### Payment Flows
- [ ] Badge purchase (Stripe)
- [ ] Badge purchase (Flutterwave)
- [ ] Trip boost purchase
- [ ] Pro subscription
- [ ] Payment success/error handling

### User Interactions
- [ ] Image upload and caching
- [ ] Location permissions
- [ ] Photo permissions
- [ ] Notification permissions
- [ ] 2FA setup/verification
- [ ] Account deletion

### Edge Cases
- [ ] Offline mode behavior
- [ ] Network timeout handling
- [ ] Token refresh on 401
- [ ] WebSocket reconnection
- [ ] Image caching
- [ ] Memory leaks (use Xcode Profiler)

### Performance
- [ ] App startup time < 3 seconds
- [ ] List scrolling smooth (60 fps)
- [ ] Image loading < 2 seconds
- [ ] Payment flow < 10 seconds
- [ ] No jank during animations

## 📊 Submission Status

| Platform | Status | Notes |
|----------|--------|-------|
| iOS | 🟡 Ready for Testing | EAS Project ID needed, privacy policy required |
| Android | 🟡 Ready for Testing | Privacy policy required, content rating needed |

## 🎯 Timeline Estimate

- **Week 1**: Local testing, bug fixes
- **Week 2**: TestFlight/Beta setup, first reviews
- **Week 3**: Address feedback, prepare app store listing
- **Week 4**: App Store submission review (1-2 days)
- **Week 5**: Google Play submission review (2-4 hours)

**Total: 4-5 weeks to production**

## 💰 Costs

- Apple Developer Program: $99/year
- Google Play: $25 one-time
- EAS (optional, free for basic): Can purchase if needed
- **Total: ~$125**

## 🆘 Common Issues & Solutions

### "usesCleartextTraffic" Rejection
✅ **Fixed**: Changed to `false` in app.json

### EAS Project ID Missing
**Solution**: Register project at expo.dev, get ID, update app.json

### Privacy Policy Required
**Solution**: Create policy addressing:
- Data collection (email, photos, location)
- Data usage (trip matching, messaging)
- Data retention (until account deletion)
- User rights (access, deletion, portability)

### Payment Not Showing
**Solution**: Verify Stripe/Flutterwave API keys in backend

### Location Permission Denied
**Solution**: App gracefully handles without crashing (tested)

## 📞 Support Resources

- Expo Documentation: https://docs.expo.dev
- EAS Build Docs: https://docs.expo.dev/build
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines
- Google Play Console Help: https://support.google.com/googleplay/android-developer
- Sentry Setup: https://docs.sentry.io/platforms/react-native

## ✅ Final Checklist

Before submitting:

- [ ] All TypeScript errors resolved (0 errors)
- [ ] All tests passing
- [ ] Privacy Policy linked in app settings
- [ ] Terms of Service accessible
- [ ] Support email configured
- [ ] App icons finalized (1024x1024 minimum)
- [ ] Screenshots prepared (6 per platform)
- [ ] App description finalized
- [ ] Version number set correctly (1.0.0)
- [ ] Build number incremented
- [ ] All fonts properly bundled
- [ ] No hardcoded API keys
- [ ] Error reporting working
- [ ] Analytics configured
- [ ] Payment flows tested end-to-end
- [ ] Account deletion working

**Ready to submit!** 🚀
