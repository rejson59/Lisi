// ============================================================
// Calendar Service - Integracja z kalendarzem urządzenia
// ============================================================

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { CalendarEvent } from '../../../shared/src/types';

export class CalendarService {
  private calendarId: string | null = null;

  /** Inicjalizuj - poproś o uprawnienia i znajdź kalendarz */
  async initialize(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Calendar] Brak uprawnień do kalendarza');
        return false;
      }

      // Znajdź lub stwórz kalendarz Lisi
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const lisiCalendar = calendars.find((c) => c.title === 'Lisi');
      
      if (lisiCalendar) {
        this.calendarId = lisiCalendar.id;
      } else {
        // Stwórz kalendarz Lisi
        this.calendarId = await this.createLisiCalendar();
      }

      return true;
    } catch (err) {
      console.error('[Calendar] Błąd inicjalizacji:', err);
      return false;
    }
  }

  /** Stwórz kalendarz Lisi */
  private async createLisiCalendar(): Promise<string> {
    const defaultCalendarSource = Platform.OS === 'ios'
      ? await Calendar.getDefaultCalendarAsync()
      : { isLocalAccount: true, name: 'Lisi', type: Calendar.EntityTypes.EVENT };

    const calendarId = await Calendar.createCalendarAsync({
      title: 'Lisi',
      color: '#ff6b9d',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: (defaultCalendarSource as any).source?.id,
      source: (defaultCalendarSource as any).source || { name: 'Lisi', isLocalAccount: true },
      name: 'Lisi Calendar',
      ownerAccount: 'local',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    console.log('[Calendar] Stworzono kalendarz Lisi:', calendarId);
    return calendarId;
  }

  /** Dodaj wydarzenie do kalendarza urządzenia */
  async addEvent(event: CalendarEvent): Promise<string> {
    if (!this.calendarId) {
      throw new Error('Kalendarz nie zainicjalizowany');
    }

    const eventId = await Calendar.createEventAsync(this.calendarId, {
      title: event.title,
      notes: event.description,
      location: event.location,
      startDate: new Date(event.start_time),
      endDate: new Date(event.end_time),
      allDay: event.all_day,
      alarms: event.reminder_minutes
        ? [{ relativeOffset: -event.reminder_minutes }]
        : [],
    });

    console.log('[Calendar] Dodano wydarzenie:', eventId);
    return eventId;
  }

  /** Pobierz wydarzenia z kalendarza urządzenia */
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.calendarId) return [];

    try {
      const events = await Calendar.getEventsAsync(
        [this.calendarId],
        startDate,
        endDate
      );

      return events.map((e) => ({
        id: e.id,
        user_id: 'local',
        title: e.title,
        description: e.notes || undefined,
        location: e.location || undefined,
        start_time: e.startDate.toISOString(),
        end_time: e.endDate.toISOString(),
        all_day: e.allDay,
      }));
    } catch (err) {
      console.error('[Calendar] Błąd pobierania wydarzeń:', err);
      return [];
    }
  }

  /** Usuń wydarzenie */
  async deleteEvent(eventId: string): Promise<void> {
    await Calendar.deleteEventAsync(eventId);
  }

  /** Aktualizuj wydarzenie */
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    await Calendar.updateEventAsync(eventId, {
      title: updates.title,
      notes: updates.description,
      location: updates.location,
      startDate: updates.start_time ? new Date(updates.start_time) : undefined,
      endDate: updates.end_time ? new Date(updates.end_time) : undefined,
      allDay: updates.all_day,
    });
  }
}
