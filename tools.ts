import { tool } from "@langchain/core/tools";
import z from "zod";
import { oauth2Client } from "./server";
import { google } from "googleapis";
import tokens from "./tokens.json";

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
  ({ query }) => {
    //google calendar logic goes here
    return "The meeting has been created";
  },
  {
    name: "create-calendar-event",
    description: "Call to create the calendar events",
    schema: z.object({
      query: z.string().describe("the query to create calendar events"),
    }),
  }
);
