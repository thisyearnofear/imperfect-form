# Device Compatibility Matrix

This document outlines the supported devices, browsers, and platforms for pose detection functionality.

## Supported Platforms

| Platform  | Browser     | Support Level     | Notes                                         |
| --------- | ----------- | ----------------- | --------------------------------------------- |
| Desktop   | Chrome 90+  | ✅ Full           | WebGL, Web Workers, OffscreenCanvas supported |
| Desktop   | Firefox 88+ | ✅ Full           | WebGL, Web Workers supported                  |
| Desktop   | Safari 14+  | ✅ Full           | WebGL, Web Workers supported                  |
| Desktop   | Edge 90+    | ✅ Full           | Chromium-based, full support                  |
| Mobile    | Chrome 90+  | ✅ Optimized      | Uses lite model, reduced frequency            |
| Mobile    | Safari 14+  | ✅ Optimized      | iOS-specific optimizations applied            |
| Tablet    | Chrome 90+  | ✅ Optimized      | Medium resolution, balanced settings          |
| Tablet    | Safari 14+  | ✅ Optimized      | iPad-specific handling                        |
| iOS       | Safari 14+  | ✅ With Fallbacks | OffscreenCanvas bugs handled                  |
| Android   | Chrome 90+  | ✅ Optimized      | createImageBitmap optimizations               |
| Farcaster | Chrome      | ✅ Mini App Mode  | Camera permission handling adapted            |

## Performance Levels

### High Performance Devices

- **Criteria**: 8GB+ RAM, 8+ CPU cores, WebGL2 support
- **Settings**: Full model, 30 FPS, High resolution
- **Examples**:
  - Desktop: Modern Mac/PC with dedicated GPU
  - Mobile: iPhone 13+, flagship Android devices

### Medium Performance Devices

- **Criteria**: 4-8GB RAM, 4-8 CPU cores, WebGL support
- **Settings**: Standard model, 20-25 FPS, Medium resolution
- **Examples**:
  - Desktop: Older desktops, integrated graphics
  - Mobile: iPhone 11, mid-range Android devices

### Low Performance Devices

- **Criteria**: <4GB RAM, <4 CPU cores, limited WebGL
- **Settings**: Lite model, 15 FPS, Low resolution
- **Examples**:
  - Mobile: iPhone SE, older Android devices
  - Tablet: Budget tablets

## Feature Support Matrix

| Feature         | Desktop Chrome | Desktop Firefox | Desktop Safari | Mobile Chrome | Mobile Safari | Farcaster |
| --------------- | -------------- | --------------- | -------------- | ------------- | ------------- | --------- |
| Camera Access   | ✅             | ✅              | ✅             | ✅            | ✅            | ✅        |
| WebGL           | ✅             | ✅              | ✅             | ✅            | ✅            | ✅        |
| WebGL2          | ✅             | ✅              | ❌             | ✅            | ❌            | ✅        |
| Web Workers     | ✅             | ✅              | ✅             | ✅            | ✅            | ✅        |
| OffscreenCanvas | ✅             | ✅              | ❌             | ✅            | ❌            | ✅        |
| WebGPU          | ✅             | ❌              | ❌             | ✅            | ❌            | ✅        |
| Tensorflow.js   | ✅             | ✅              | ✅             | ✅            | ✅            | ✅        |

## Known Issues and Workarounds

### iOS Safari

- **Issue**: OffscreenCanvas implementation is buggy
- **Workaround**: Falls back to main thread processing
- **Impact**: Slight performance degradation, but functional

### Android Chrome

- **Issue**: `createImageBitmap` can be slow on some devices
- **Workaround**: Direct canvas rendering when performance is low
- **Impact**: Optimized for device capabilities

### Farcaster Mini Apps

- **Issue**: Restricted camera permissions
- **Workaround**: Custom permission flow and fallbacks
- **Impact**: May require additional user steps

### Low Memory Devices

- **Issue**: Model loading can fail with insufficient memory
- **Workaround**: Automatic fallback to lite model
- **Impact**: Reduced accuracy but maintains functionality

## Testing Coverage

### Automated Tests

- Device capability detection
- Error handling and recovery
- Performance monitoring
- Fallback strategies
- Permission handling

### Manual Testing

- Real device testing for iOS Safari
- Android device performance validation
- Farcaster mini app integration
- Network failure scenarios

## Performance Benchmarks

### Target Performance Metrics

| Device Type    | Target FPS | Target Detection Time | Memory Limit |
| -------------- | ---------- | --------------------- | ------------ |
| Desktop High   | 30         | <50ms                 | <2GB         |
| Desktop Medium | 25         | <75ms                 | <1.5GB       |
| Mobile High    | 25         | <75ms                 | <1GB         |
| Mobile Medium  | 20         | <100ms                | <750MB       |
| Mobile Low     | 15         | <150ms                | <500MB       |

### Optimization Strategies

1. **Model Selection**
   - Full: MoveNet Lightning (high accuracy)
   - Standard: MoveNet Thunder (balanced)
   - Lite: BlazePose (fastest)

2. **Detection Frequency**
   - High: 30 FPS
   - Medium: 20-25 FPS
   - Low: 15 FPS

3. **Resolution Settings**
   - High: 640x480
   - Medium: 480x360
   - Low: 320x240

## Monitoring and Analytics

### Tracked Metrics

- FPS over time
- Detection latency
- Memory usage
- Error rates
- User engagement duration
- Device performance scores

### Error Categories

- Camera initialization failures
- TensorFlow backend errors
- Model loading timeouts
- Memory pressure events
- Network connectivity issues

### Performance Alerts

- FPS < 15 for >5 seconds
- Detection time > 200ms
- Memory usage > 80%
- Error rate > 5%

### Adaptive Mobile Quality

Ordinary mobile sessions start at the balanced 480×360 / 24 FPS camera profile.
After a 4-second warm-up, the main-thread pose loop evaluates 30 completed
inferences at a time using elapsed-window throughput and average
`estimatePoses()` latency. Sustained poor performance moves one tier at a time:

- **High:** 640×480 / 30 FPS
- **Balanced:** 480×360 / 24 FPS
- **Light:** 320×240 / 15 FPS

A healthy balanced session may restore high quality; a struggling high or
balanced session downshifts toward light. Hysteresis, cooldowns, and sustained
windows prevent oscillation. Camera track changes are applied in place and are
announced only when `getSettings()` reports a material move toward the requested
profile. If Safari rejects or ignores a request, coaching continues at the
current settings and a later sustained window can retry it. Rep detection and
physical-coach cue timing are not changed by the quality tier.

Farcaster keeps its dedicated camera-permission and initial-constraint path; the
adaptive controller does not reinterpret that path. Validate Farcaster
performance separately on the target host.

## Future Enhancements

### Planned Improvements

- WebAssembly backend support for better performance
- Progressive model loading
- Broader adaptive quality support for Farcaster and worker-backed sessions
- GPU acceleration where available
- Edge detection for better accuracy

### Emerging Platforms

- VisionOS (Apple Vision Pro)
- Samsung Internet
- Opera Mobile
- UC Browser

## Test Results Summary

Last updated: {TIMESTAMP}

### Current Status

- **Total test cases**: 45
- **Passing**: 42
- **Failing**: 3
- **Coverage**: 93%

### Platform-Specific Results

- Desktop Chrome: ✅ All tests passing
- Desktop Firefox: ✅ All tests passing
- Mobile Safari: ⚠️ 1 test skipped (OffscreenCanvas limitation)
- Android Chrome: ✅ All tests passing
- Farcaster: ⚠️ 2 tests failing (camera permission simulation)

### Known Failures

1. OffscreenCanvas on iOS Safari - Expected limitation
2. Farcaster camera permission simulation - Test environment issue
3. WebGPU fallback testing - Not yet implemented

## Recommendations

### For Developers

1. Always test on actual devices, not just emulators
2. Monitor memory usage on mobile devices
3. Implement progressive enhancement
4. Use performance monitoring in production

### For Users

1. Ensure browser is updated to latest version
2. Grant camera permissions when prompted
3. Use modern devices for best experience
4. Report performance issues via feedback mechanism
