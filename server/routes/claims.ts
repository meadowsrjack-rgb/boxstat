import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";

const router = Router();

router.post('/claim', requireAuth, async (req: any, res) => {
  try {
    const accountId = req.user?.claims?.sub as string;
    const { claimCode, dob } = req.body || {};
    
    if (!claimCode || !dob) {
      return res.status(400).json({ ok: false, error: "Missing claim code or date of birth" });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find the claim
      const claimResult = await client.query(
        'SELECT profile_id, dob FROM profile_claims WHERE claim_code = $1',
        [claimCode]
      );

      if (claimResult.rowCount === 0) {
        return res.status(404).json({ ok: false, error: "Invalid claim code" });
      }

      const claim = claimResult.rows[0];
      
      // Verify DOB matches
      if (claim.dob && new Date(claim.dob).toISOString().split('T')[0] !== new Date(dob).toISOString().split('T')[0]) {
        return res.status(400).json({ ok: false, error: "Date of birth does not match" });
      }

      // Update the profile with the account_id
      const updateResult = await client.query(
        'UPDATE profiles SET account_id = $1 WHERE id = $2 AND account_id IS NULL',
        [accountId, claim.profile_id]
      );

      if (updateResult.rowCount === 0) {
        return res.status(400).json({ ok: false, error: "Profile already claimed or not found" });
      }

      // Delete the claim code
      await client.query('DELETE FROM profile_claims WHERE claim_code = $1', [claimCode]);

      await client.query('COMMIT');
      res.json({ ok: true, profileId: claim.profile_id });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;