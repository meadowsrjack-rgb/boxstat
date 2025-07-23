import { apiRequest } from "@/lib/queryClient";
import { storage } from "./storage";
import type { Request, Response } from "express";

// Route handler for account setup after Replit Auth
export async function setupAccount(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req.user as any)?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const {
      userType,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      address,
      emergencyContact,
      emergencyPhone,
      medicalInfo,
      allergies,
      schoolGrade,
      parentalConsent
    } = req.body;

    // Generate unique QR code for check-in
    const qrCodeData = `UYP-${userId}-${Date.now()}`;

    // Update user profile with complete information
    const updatedUser = await storage.updateUserProfile(userId, {
      userType,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      address,
      emergencyContact,
      emergencyPhone,
      medicalInfo,
      allergies,
      schoolGrade,
      parentalConsent,
      profileCompleted: true,
      qrCodeData,
    });

    res.json({ 
      message: "Account setup completed successfully",
      user: updatedUser,
      redirectUrl: userType === "player" ? "/player-dashboard" : "/parent-dashboard"
    });
  } catch (error) {
    console.error("Account setup error:", error);
    res.status(500).json({ message: "Account setup failed" });
  }
}