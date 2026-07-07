import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { eventsCache } from '../utils/cache.js';
import { notificationQueue } from '../services/notification.queue.js';

// List all events
export const listEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `events:all:page:${page}:limit:${limit}`;
    const cachedEvents = await eventsCache.get<any[]>(cacheKey);
    if (cachedEvents) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cachedEvents);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const events = await prisma.event.findMany({
      orderBy: { event_date: 'asc' },
      take: limit,
      skip: skip
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

    eventsCache.set(cacheKey, joinedEvents);
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

    await notificationQueue.add('broadcast', {
      type: 'EVENT_CREATED',
      actorId: userId,
      title: 'New Event Published',
      body: `"${title}" has been added to the alumni events calendar.`,
      actionUrl: '/events'
    });

    await eventsCache.invalidate("events:");
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

    // Notify user of RSVP confirmation
    await notificationQueue.add('direct', {
      type: 'EVENT_RSVP',
      targetId: userId,
      title: "Event RSVP Registered",
      body: `You have successfully RSVP'd for "${event.title}".`,
      actionUrl: '/events'
    });

    // Schedule a reminder 24h before the event (only if event is in the future)
    const eventDate = new Date(event.event_date);
    const reminderTime = eventDate.getTime() - 24 * 60 * 60 * 1000;
    const delay = reminderTime - Date.now();
    if (delay > 0) {
      await notificationQueue.add('event_reminder', {
        userId,
        eventId: id,
        title: `Reminder: "${event.title}" is tomorrow!`,
        body: `Don't forget — "${event.title}" is happening tomorrow at ${eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} at ${event.location}.`,
        actionUrl: '/events'
      }, { delay });
    }

    await eventsCache.invalidate("events:");
    res.status(200).json({ success: true, rsvp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
