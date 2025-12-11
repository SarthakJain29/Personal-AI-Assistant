import { tool } from "@langchain/core/tools";
import z from "zod";
import { google } from "googleapis";
import tokens from "./tokens.json";
import type { EventData } from "./utils/types";

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

const calendar = google.calendar({ version: "v3", auth: oauth2Client }); //calendar instance


oauth2Client.setCredentials(tokens);

export const getEvents = tool(
  async (params) => {
    const { q, timeMin, timeMax } = params;

    try {
      const response = await calendar.events.list({
        calendarId: "primary", //fetches the main calendar of user
        q,
        timeMin,
        timeMax,
      });

      const result = response.data.items?.map((event) => {
        return {
          id: event.id,
          summary: event.summary,
          status: event.status,
          organizer: event.organizer,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
          meetingLink: event.hangoutLink,
          eventType: event.eventType,
        };
      });

      return JSON.stringify(result);
    } catch (error) {
      console.log("ERR", error);
    }

    return "Failed to connect to the calendar";
  },
  {
    name: "get-calendar-events",
    description:
      "Retrieve Google Calendar events for the authenticated user. Supports filtering by keyword and a specific time window. Use this tool whenever the user asks about upcoming meetings, past events, availability, or anything related to their schedule.",
    schema: z.object({
      q: z.string().describe(`Optional text query to filter events. 
      Use this for searching events by:
      - event title (summary)
      - description
      - location
      - organizer name or email
      - attendee names or emails
      If the user asks things like “meeting with John”, “doctor appointment”, “travel plans”, or anything text-based, set this field accordingly.

      Example: "meeting", "doctor", "john", "zoom"`),

      timeMin: z.string().describe(`Start datetime (ISO 8601 format). 
      Only return events that start *after* this time.
      Use this when the user asks about:
      - “today”
      - “this week”
      - “tomorrow”
      - “next month”
      Example: "2025-01-10T00:00:00Z".`),

      timeMax: z.string().describe(`End datetime (ISO 8601 format). 
      Only return events that start *before* this time.
      Use this to create date ranges.
      Example: "2025-01-10T23:59:59Z".`),
    }),
  }
);

export const createEvent = tool(
  async (eventData) => {
    const { summary, start, end, attendees } = eventData as EventData;

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        conferenceDataVersion: 1,
        requestBody: {
          summary,
          start,
          end,
          attendees,
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        },
      });
      if(response.statusText === 'OK'){
        return "The meeting has been created.";
      }
      return "Couldn't create the meeting"
    } catch (error) {
      console.log("ERR", error);
    }
    return "Failed to connect to the calendar";
  },
  {
    name: "create-calendar-event",
    description:
      "Use this tool to create a new Google Calendar event. Requires a title, start & end timestamps, and optional attendee information. Always provide complete and unambiguous date-time values.",
    schema: z.object({
      summary: z.string().describe("The title for the calendar event—for example: 'Project Sync Meeting'."
        ),

      start: z.object({
          dateTime: z.string().describe("The event start timestamp in RFC3339 format (e.g., '2025-01-15T09:00:00Z'). Must include date and time."
            ),
          timeZone: z.string().describe("The IANA timezone identifier for the event start time (e.g., 'Asia/Kolkata')."
            ),
        }).describe("Object describing the exact start time of the event."),

      end: z.object({
          dateTime: z.string().describe("The event end timestamp in RFC3339 format (e.g., '2025-01-15T10:00:00Z'). Must be later than start time."
            ),
          timeZone: z.string().describe("The IANA timezone identifier for the event end time (e.g., 'Asia/Kolkata')."
            ),
        }).describe("Object describing the exact end time of the event."),

      attendees: z.array(z.object({
            email: z.string().describe("Email address of an attendee who should be invited to the event."
              ),
            displayName: z.string().optional().describe("Optional display name of the attendee as it should appear on the invite."
              ),
          })
        ).optional().describe(
          "List of attendees to invite. Each entry must include an email."
        ),
    }),
  }
);

export const deleteEvent = tool(
  async (eventId) => {
    try {
      const response = await calendar.events.delete({
      calendarId: 'primary'
      })

      return "The meeting has been deleted.";

    } catch (error) {
      console.log('ERR', error);
    }

    return "Failed to connect to the calendar";
  }, 
  {
    name: "calendar_delete_event_by_id",
    description: `Use this tool ONLY when you already have the eventId. 
      You MUST NEVER call this tool using only the event name, date, or time.

      If the user asks to delete an event by title or time (e.g., "delete design talk at 8pm"):
      1. First call getEvents to retrieve events within the relevant time window.
      2. Identify the exact matching event.
      3. Extract its eventId.
      4. Only then call this tool with { eventId: "<id>" }.

      If you do not have the eventId, DO NOT call this tool.
      Ask for clarification or fetch events first.`,
    schema: z.object({
      eventId: z.string().describe("The unique ID of the calendar event to delete.Must correspond to an existing event in the user's calendar.")
    })
  }
)
