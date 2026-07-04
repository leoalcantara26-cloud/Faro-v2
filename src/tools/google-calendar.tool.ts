import { google, calendar_v3 } from 'googleapis';
import type { ITool, ToolResult } from './tool.interface';

export interface GoogleCalendarCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

type CalendarAction =
  | { action: 'list_events'; timeMin: string; timeMax: string; maxResults?: number }
  | { action: 'create_event'; summary: string; start: string; end: string; description?: string; attendees?: string[] }
  | { action: 'get_event'; eventId: string }
  | { action: 'delete_event'; eventId: string };

export class GoogleCalendarTool implements ITool {
  readonly name = 'google_calendar';
  readonly description = 'Lists, creates, and manages Google Calendar events';

  private calendar: calendar_v3.Calendar;

  constructor(credentials: GoogleCalendarCredentials) {
    const auth = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret);
    auth.setCredentials({ refresh_token: credentials.refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const p = params as CalendarAction;

    try {
      switch (p.action) {
        case 'list_events':
          return await this.listEvents(p.timeMin, p.timeMax, p.maxResults);

        case 'create_event':
          return await this.createEvent(p.summary, p.start, p.end, p.description, p.attendees);

        case 'get_event':
          return await this.getEvent(p.eventId);

        case 'delete_event':
          return await this.deleteEvent(p.eventId);

        default:
          return { success: false, error: `Unknown action: ${(p as { action: string }).action}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  private async listEvents(timeMin: string, timeMax: string, maxResults = 10): Promise<ToolResult> {
    const res = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return { success: true, data: res.data.items ?? [] };
  }

  private async createEvent(
    summary: string,
    start: string,
    end: string,
    description?: string,
    attendees?: string[],
  ): Promise<ToolResult> {
    const res = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees: attendees?.map((email) => ({ email })),
      },
    });
    return { success: true, data: res.data };
  }

  private async getEvent(eventId: string): Promise<ToolResult> {
    const res = await this.calendar.events.get({ calendarId: 'primary', eventId });
    return { success: true, data: res.data };
  }

  private async deleteEvent(eventId: string): Promise<ToolResult> {
    await this.calendar.events.delete({ calendarId: 'primary', eventId });
    return { success: true };
  }
}
