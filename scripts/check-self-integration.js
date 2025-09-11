#!/usr/bin/env node

/**
 * Self Protocol Integration Status Checker
 * Validates the complete Self Protocol integration setup
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CELO_MAINNET_RPC = 'https://forno.celo.org';
const HUB_ADDRESS = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
const VERIFIED_FITNESS_ADDRESS = '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03'; // From constants.ts

async function checkSelfIntegration() {
  console.log('🔍 Self Protocol Integration Status Check\n');

  const results = {
    configuration: false,
    hubConnection: false,
    contractDeployment: false,
    frontendConfig: false,
    backendConfig: false,
  };

  try {
    // 1. Check Configuration Files
    console.log('📋 Checking configuration files...');

    const configPath = path.join(__dirname, '../src/config/self-protocol.ts');
    const constantsPath = path.join(__dirname, '../src/constants/contracts.ts');

    if (fs.existsSync(configPath) && fs.existsSync(constantsPath)) {
      console.log('✅ Configuration files exist');
      results.configuration = true;
    } else {
      console.log('❌ Missing configuration files');
    }

    // 2. Check Hub Connection
    console.log('\n🌐 Checking Self Protocol Hub connection...');

    const provider = new ethers.JsonRpcProvider(CELO_MAINNET_RPC);

    try {
      const hubCode = await provider.getCode(HUB_ADDRESS);
      if (hubCode !== '0x') {
        console.log('✅ Self Protocol Hub is accessible on Celo Mainnet');
        results.hubConnection = true;
      } else {
        console.log('❌ Self Protocol Hub not found at expected address');
      }
    } catch (error) {
      console.log('❌ Failed to connect to Self Protocol Hub:', error.message);
    }

    // 3. Check Contract Deployment
    console.log('\n📜 Checking VerifiedFitnessContract deployment...');

    try {
      const contractCode = await provider.getCode(VERIFIED_FITNESS_ADDRESS);
      if (contractCode !== '0x') {
        console.log('✅ VerifiedFitnessContract is deployed');
        results.contractDeployment = true;

        // Try to call a view function
        const contractABI = [
          'function MINIMUM_AGE() view returns (uint256)',
          'function SCOPE_NAME() view returns (string)',
          'function isVerifiedHuman(address) view returns (bool)',
        ];

        const contract = new ethers.Contract(VERIFIED_FITNESS_ADDRESS, contractABI, provider);

        try {
          const minimumAge = await contract.MINIMUM_AGE();
          const scopeName = await contract.SCOPE_NAME();
          console.log(`   📊 Minimum Age: ${minimumAge}`);
          console.log(`   📊 Scope Name: ${scopeName}`);
        } catch (error) {
          console.log('⚠️  Contract deployed but view functions failed:', error.message);
        }
      } else {
        console.log('❌ VerifiedFitnessContract not deployed at expected address');
        console.log(`   📍 Expected: ${VERIFIED_FITNESS_ADDRESS}`);
      }
    } catch (error) {
      console.log('❌ Failed to check contract deployment:', error.message);
    }

    // 4. Check Frontend Configuration
    console.log('\n🎨 Checking frontend configuration...');

    const modalPath = path.join(
      __dirname,
      '../src/components/verification/SelfVerificationModal.tsx'
    );
    if (fs.existsSync(modalPath)) {
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      if (
        modalContent.includes('SELF_PROTOCOL_CONFIG') &&
        modalContent.includes('VERIFIED_FITNESS_CONTRACT_ADDRESS')
      ) {
        console.log('✅ Frontend configuration updated');
        results.frontendConfig = true;
      } else {
        console.log('❌ Frontend configuration needs updates');
      }
    } else {
      console.log('❌ SelfVerificationModal not found');
    }

    // 5. Check Backend Configuration
    console.log('\n⚙️  Checking backend configuration...');

    const backendPath = path.join(__dirname, '../src/app/api/self/verify/route.ts');
    if (fs.existsSync(backendPath)) {
      const backendContent = fs.readFileSync(backendPath, 'utf8');
      if (
        backendContent.includes('SELF_PROTOCOL_CONFIG') &&
        backendContent.includes('SelfBackendVerifier')
      ) {
        console.log('✅ Backend configuration updated');
        results.backendConfig = true;
      } else {
        console.log('❌ Backend configuration needs updates');
      }
    } else {
      console.log('❌ Backend verification route not found');
    }

    // Summary
    console.log('\n📊 Integration Status Summary:');
    console.log('================================');

    const totalChecks = Object.keys(results).length;
    const passedChecks = Object.values(results).filter(Boolean).length;
    const percentage = Math.round((passedChecks / totalChecks) * 100);

    Object.entries(results).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      const name = check.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      console.log(`${status} ${name}`);
    });

    console.log(`\n🎯 Overall Status: ${percentage}% Complete (${passedChecks}/${totalChecks})`);

    if (percentage === 100) {
      console.log('\n🎉 Self Protocol integration is fully configured!');
    } else {
      console.log('\n🔧 Next Steps:');
      if (!results.contractDeployment) {
        console.log('   1. Deploy VerifiedFitnessContract to Celo Mainnet');
        console.log('   2. Update VERIFIED_FITNESS_CONTRACT_ADDRESS in constants.ts');
      }
      if (!results.frontendConfig) {
        console.log('   3. Complete frontend configuration updates');
      }
      if (!results.backendConfig) {
        console.log('   4. Complete backend configuration updates');
      }
      console.log('   5. Test end-to-end verification flow');
    }
  } catch (error) {
    console.error('💥 Status check failed:', error);
    process.exit(1);
  }
}

checkSelfIntegration();
