import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await prisma.donation.findMany({
      where: { payment_status: 'approved', show_on_leaderboard: true },
      orderBy: { amount_paise: 'desc' }
    });
    res.status(200).json(list);
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

    res.status(201).json({ success: true, donation: newDonation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
