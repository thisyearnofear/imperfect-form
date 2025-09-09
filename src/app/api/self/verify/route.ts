import { NextRequest, NextResponse } from 'next/server';
import { SelfBackendVerifier, AllIds, DefaultConfigStore } from '@selfxyz/core';
import {
  SELF_PROTOCOL_CONFIG,
  getCurrentNetwork,
  getVerificationEndpoint,
  validateConfig,
} from '@/config/self-protocol';

/**
 * Self Protocol verification endpoint for Imperfect Form fitness app
 * This endpoint verifies zero-knowledge proofs from the Self mobile app
 * Enhanced with centralized configuration management
 */
export async function POST(req: NextRequest) {
  console.log('🔐 Self verification request received');

  try {
    // Validate configuration first
    const configValidation = validateConfig();
    if (!configValidation.isValid) {
      console.error('❌ Invalid Self Protocol configuration:', configValidation.errors);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Service configuration error',
          errors: configValidation.errors,
        },
        { status: 500 }
      );
    }

    const { attestationId, proof, publicSignals, userContextData } = await req.json();

    // Validate required fields
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      console.error('❌ Missing required verification fields');
      return NextResponse.json(
        {
          message: 'Proof, publicSignals, attestationId and userContextData are required',
        },
        { status: 400 }
      );
    }

    // Get current network configuration
    const currentNetwork = getCurrentNetwork();
    console.log(`🌐 Using network: ${currentNetwork.name} (Chain ID: ${currentNetwork.chainId})`);

    // Use centralized verification configuration
    const configStore = new DefaultConfigStore(SELF_PROTOCOL_CONFIG.verification);

    // Initialize Self backend verifier with centralized config
    const selfBackendVerifier = new SelfBackendVerifier(
      SELF_PROTOCOL_CONFIG.scope, // Centralized scope configuration
      getVerificationEndpoint(), // Centralized endpoint configuration
      false, // Production uses real passports only
      AllIds, // Accept all document types (passport, EU ID)
      configStore,
      'hex' // Use hex format for blockchain addresses
    );

    console.log('🔍 Verifying proof with Self Protocol...');

    // Verify the zero-knowledge proof
    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData
    );

    if (!result.isValidDetails.isValid) {
      console.error('❌ Verification failed:', result.isValidDetails);
      return NextResponse.json(
        {
          status: 'error',
          result: false,
          message: 'Identity verification failed',
          details: result.isValidDetails,
        },
        { status: 400 }
      );
    }

    console.log('✅ Verification successful for user:', result.userData.userIdentifier);

    // Return successful verification result
    return NextResponse.json({
      status: 'success',
      result: true,
      message: 'Identity verified successfully',
      credentialSubject: {
        userIdentifier: result.userData.userIdentifier,
        userDefinedData: result.userData.userDefinedData,
        // Additional verification data would be available in other result properties
        // depending on the Self Protocol SDK version and configuration
      },
      verificationDetails: {
        attestationId: result.attestationId,
        timestamp: new Date().toISOString(),
        minimumAge: SELF_PROTOCOL_CONFIG.verification.minimumAge,
        network: currentNetwork.name,
        chainId: currentNetwork.chainId,
      },
    });
  } catch (error) {
    console.error('💥 Self verification error:', error);

    return NextResponse.json(
      {
        status: 'error',
        result: false,
        message: error instanceof Error ? error.message : 'Verification service error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint with configuration validation
 */
export async function GET() {
  const configValidation = validateConfig();
  const currentNetwork = getCurrentNetwork();

  return NextResponse.json({
    status: configValidation.isValid ? 'healthy' : 'degraded',
    service: 'Self Protocol Verification',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    network: {
      name: currentNetwork.name,
      chainId: currentNetwork.chainId,
      hubAddress: currentNetwork.hubAddress,
      useMockPassports: false, // Production uses real passports only
    },
    configuration: {
      scope: SELF_PROTOCOL_CONFIG.scope,
      minimumAge: SELF_PROTOCOL_CONFIG.verification.minimumAge,
      isValid: configValidation.isValid,
      errors: configValidation.errors,
    },
  });
}
