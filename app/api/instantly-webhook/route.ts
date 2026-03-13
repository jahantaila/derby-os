import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "../../../scripts/instantly-to-ghl.js";

export async function POST(request: NextRequest) {
  try {
    console.log("📨 Received Instantly webhook");
    
    // Parse the webhook payload
    const payload = await request.json();
    console.log("📋 Webhook payload:", JSON.stringify(payload, null, 2));
    
    // Handle the webhook using our automation script
    const result = await handleWebhook(payload);
    
    if (result.success) {
      console.log("✅ Webhook processed successfully:", result);
      return NextResponse.json({ 
        success: true, 
        message: "Lead processed successfully",
        contactId: result.contactId,
        currentProvider: result.currentProvider
      });
    } else {
      console.error("❌ Webhook processing failed:", result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Handle GET requests for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: "Instantly → GoHighLevel webhook endpoint is active",
    timestamp: new Date().toISOString()
  });
}