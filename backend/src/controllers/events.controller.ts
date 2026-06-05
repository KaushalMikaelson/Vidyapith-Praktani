import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// List all events
export const listEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { event_date: 'asc' }
    });

    const eventIds = events.map(e => e.id);
    const rsvps = await prisma.rSVP.findMany({
      where: { event_id: { in: eventIds } }
    });

    const joinedEvents = events.map(evt => {
      const eventRsvps = rsvps.filter(r => r.event_id === evt.id);
      return {
        ...evt,
        rsvps: eventRsvps
      };
    });

    res.status(200).json(joinedEvents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new event
export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, eventDate, location, eventType, onlineLink, maxCapacity } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        event_date: new Date(eventDate),
        location,
        event_type: eventType,
        online_link: onlineLink || '',
        max_capacity: parseInt(maxCapacity) || 100,
        created_by: userId
      }
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// RSVP to event
export const rsvpEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { guestCount, dietaryPref } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ error: "Event not found." });
      return;
    }

    const rsvp = await prisma.rSVP.upsert({
      where: {
        event_id_user_id: {
          event_id: id,
          user_id: userId
        }
      },
      update: {
        guest_count: parseInt(guestCount) || 0,
        dietary_pref: dietaryPref || 'Vegetarian'
      },
      create: {
        event_id: id,
        user_id: userId,
        guest_count: parseInt(guestCount) || 0,
        dietary_pref: dietaryPref || 'Vegetarian'
      }
    });

    // Notify organizers or confirm to user
    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "Event RSVP Registered",
        body: `You have successfully RSVP'd for "${event.title}".`,
        type: "success"
      }
    });

    res.status(200).json({ success: true, rsvp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
