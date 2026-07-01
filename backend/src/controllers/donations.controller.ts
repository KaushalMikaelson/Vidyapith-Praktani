import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { donationsCache } from '../utils/cache.js';

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = "donations:leaderboard";
    const cachedData = donationsCache.get<any[]>(cacheKey);
    if (cachedData) {
      res.status(200).json(cachedData);
      return;
    }

    const list = await prisma.donation.findMany({
      where: { payment_status: 'approved', show_on_leaderboard: true },
      orderBy: { amount_paise: 'desc' }
    });

    if (list.length === 0) {
      res.status(200).json([]);
      return;
    }

    const donorIds = Array.from(new Set(list.map(d => d.donor_id)));
    const donors = await prisma.user.findMany({
      where: { id: { in: donorIds } },
      include: { profile: true }
    });

    const donorsMap = new Map(donors.map(u => [u.id, u]));

    const joinedLeaderboard = list.map(donation => {
      const donor = donorsMap.get(donation.donor_id);
      return {
        id: donation.id,
        total_amount: donation.amount_paise, // map to amount_paise
        user: donor ? {
          id: donor.id,
          full_name: donor.profile?.full_name || "Vidyapith Alumnus",
          profile_photo: donor.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
          batch_year: donor.profile?.batch_year || 2008,
          leaving_class: donor.profile?.leaving_class || "XII"
        } : {
          id: 'usr-guest',
          full_name: "Anonymous Alumnus",
          profile_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
          batch_year: 2000,
          leaving_class: "XII"
        }
      };
    });

    donationsCache.set(cacheKey, joinedLeaderboard);
    res.status(200).json(joinedLeaderboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createCheckoutSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, cause, showOnLeaderboard } = req.body;
    const userId = req.user?.id || 'usr-guest';

    const newDonation = await prisma.donation.create({
      data: {
        donor_id: userId,
        amount_paise: parseInt(amount) * 100,
        cause,
        razorpay_id: 'pay_' + Math.random().toString(36).substr(2, 12).toUpperCase(),
        payment_status: 'approved', // Simulates direct payment acceptance
        receipt_url: `receipt_Exempt80G_${Math.floor(Math.random() * 10000)}.pdf`,
        show_on_leaderboard: showOnLeaderboard
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "Donation Successful",
        body: `Donated ₹${amount} to ${cause}. 80G tax receipt ready.`,
        type: "success"
      }
    });

    donationsCache.invalidate("donations:");
    res.status(201).json({ success: true, donation: newDonation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
