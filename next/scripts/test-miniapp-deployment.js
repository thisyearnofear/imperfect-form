#!/usr/bin/env node

/**
 * Test script to verify Farcaster Mini App deployment
 * Run with: node scripts/test-miniapp-deployment.js
 */

const https = require('https');
const http = require('http');

const DOMAIN = 'imperfectform.fun';
const BASE_URL = `https://${DOMAIN}`;

console.log('🎭 Testing Farcaster Mini App Deployment...\n');

// Test functions
async function testUrl(url, description) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      const { statusCode, headers } = res;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = statusCode >= 200 && statusCode < 300;
        console.log(`${success ? '✅' : '❌'} ${description}`);
        console.log(`   Status: ${statusCode}`);
        console.log(`   URL: ${url}`);
        
        if (!success) {
          console.log(`   Error: ${data.substring(0, 200)}...`);
        } else if (url.includes('farcaster.json')) {
          try {
            const json = JSON.parse(data);
            console.log(`   ✅ Valid JSON manifest`);
            console.log(`   App Name: ${json.frame?.name || 'Not found'}`);
            console.log(`   Icon URL: ${json.frame?.iconUrl || 'Not found'}`);
            console.log(`   Has Account Association: ${json.accountAssociation ? 'Yes' : 'No (pending)'}`);
          } catch (e) {
            console.log(`   ❌ Invalid JSON: ${e.message}`);
          }
        }
        
        console.log('');
        resolve({ success, statusCode, data, headers });
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${description}`);
      console.log(`   Error: ${err.message}`);
      console.log(`   URL: ${url}\n`);
      resolve({ success: false, error: err.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`❌ ${description}`);
      console.log(`   Error: Request timeout`);
      console.log(`   URL: ${url}\n`);
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log(`Testing deployment for: ${DOMAIN}\n`);
  
  // Test main app
  await testUrl(BASE_URL, 'Main App Accessibility');
  
  // Test manifest file
  await testUrl(`${BASE_URL}/.well-known/farcaster.json`, 'Farcaster Manifest File');
  
  // Test icon files
  await testUrl(`${BASE_URL}/icon.png`, 'App Icon (icon.png)');
  await testUrl(`${BASE_URL}/splash.png`, 'Splash Icon (splash.png)');
  
  // Test webhook endpoint
  await testUrl(`${BASE_URL}/api/miniapp/webhook`, 'Webhook Endpoint (should return 405 for GET)');
  
  // Test frame image generation
  await testUrl(`${BASE_URL}/api/frames/workout/image?reps=50&exerciseMode=squats&timeSpent=60`, 'Frame Image Generation');
  
  console.log('🎯 Test Summary:');
  console.log('');
  console.log('If all tests pass, you can proceed with:');
  console.log('1. Visit https://warpcast.com/~/developers/new');
  console.log(`2. Enter domain: ${DOMAIN}`);
  console.log('3. Generate account association');
  console.log('4. Add the accountAssociation to your farcaster.json');
  console.log('5. Test in Farcaster by sharing your URL in a cast');
  console.log('');
  console.log('🎭 Your Mini App will then be fully registered and discoverable!');
}

// Run the tests
runTests().catch(console.error);
