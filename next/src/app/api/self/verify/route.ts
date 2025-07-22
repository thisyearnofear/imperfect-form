import { NextRequest, NextResponse } from "next/server";
import {
  SelfBackendVerifier,
  AllIds,
  DefaultConfigStore,
  VerificationConfig
} from "@selfxyz/core";

/**
 * Self Protocol verification endpoint for Imperfect Form fitness app
 * This endpoint verifies zero-knowledge proofs from the Self mobile app
 */
export async function POST(req: NextRequest) {
  console.log("🔐 Self verification request received");
  
  try {
    const { attestationId, proof, publicSignals, userContextData } = await req.json();

    // Validate required fields
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      console.error("❌ Missing required verification fields");
      return NextResponse.json({
        message: "Proof, publicSignals, attestationId and userContextData are required",
      }, { status: 400 });
    }

    // Configure verification requirements for fitness app
    const verificationConfig: VerificationConfig = {
      excludedCountries: [], // No country restrictions for fitness
      ofac: false, // No OFAC checking needed for fitness app
      minimumAge: 13, // Minimum age for fitness tracking
    };
    
    const configStore = new DefaultConfigStore(verificationConfig);

    // Initialize Self backend verifier
    const selfBackendVerifier = new SelfBackendVerifier(
      "imperfect-form-fitness", // Our app's unique scope
      process.env.NEXT_PUBLIC_SELF_ENDPOINT || process.env.NEXT_PUBLIC_APP_URL + "/api/self/verify",
      process.env.NODE_ENV !== "production", // Use mock passports in development
      AllIds, // Accept all document types (passport, EU ID)
      configStore,
      "hex", // Use hex format for blockchain addresses
    );

    console.log("🔍 Verifying proof with Self Protocol...");
    
    // Verify the zero-knowledge proof
    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData
    );

    if (!result.isValidDetails.isValid) {
      console.error("❌ Verification failed:", result.isValidDetails);
      return NextResponse.json({
        status: "error",
        result: false,
        message: "Identity verification failed",
        details: result.isValidDetails,
      }, { status: 400 });
    }

    console.log("✅ Verification successful for user:", result.userData.userIdentifier);

    // Return successful verification result
    return NextResponse.json({
      status: "success",
      result: true,
      message: "Identity verified successfully",
      credentialSubject: {
        userIdentifier: result.userData.userIdentifier,
        userDefinedData: result.userData.userDefinedData,
        // Additional verification data would be available in other result properties
        // depending on the Self Protocol SDK version and configuration
      },
      verificationDetails: {
        attestationId: result.attestationId,
        timestamp: new Date().toISOString(),
        minimumAge: verificationConfig.minimumAge,
      }
    });

  } catch (error) {
    console.error("💥 Self verification error:", error);
    
    return NextResponse.json({
      status: "error",
      result: false,
      message: error instanceof Error ? error.message : "Verification service error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "Self Protocol Verification",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}