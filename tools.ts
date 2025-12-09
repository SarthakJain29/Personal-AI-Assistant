import { tool } from "@langchain/core/tools";
import z from "zod";

export const createEvent = tool(
  ({ query }) => {
    //google calendar logic goes here
    return "The meeting has been created";
  },
  {
    name: "create-calendar-event",
    description: "Call to create the calendar events",
    schema: z.object({}),
  }
);

export const getEvents = tool(
  ({ query }) => {
    //google calendar logic goes here
    return JSON.stringify([
      { title: "Prodgain Interview", date: "10th Dec 2025", time: "2 PM", location: "Gmeet" },
    ]);
  },
  {
    name: "get-calendar-events",
    description: "Call to get the calendar events",
    schema: z.object({}),
  }
);
