import readline from "node:readline/promises";
import { ChatGroq } from "@langchain/groq";
import { createEvent, cancelEvent, getEvents } from "./tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  END,
  START,
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
} from "@langchain/langgraph";
import type { AIMessage } from "@langchain/core/messages";

const tools = [createEvent, getEvents, cancelEvent];

const toolNode = new ToolNode(tools);

const model = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
}).bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    //means tool call needs to be done
    return "tools";
  }
  return "END";
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("LLM", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "LLM")
  .addEdge("tools", "LLM")
  .addConditionalEdges("LLM", shouldContinue, {
    END: END,
    tools: "tools",
  });

const checkpointer = new MemorySaver();

const agent = graph.compile({ checkpointer });

async function main() {
  let config = { configurable: { thread_id: "1" } };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const userInput = await rl.question("You: ");
    if (userInput === "bye") break;

    const result = await agent.invoke(
      {
        messages: [
          {
            role: "system",
            content: `You are a personal assistant that helps users manage their Google Calendar.
      You have access to these tools: 
      getEvents for retrieving events,
      createEvent for creating new events,
      cancelEvent for deleting an event by EventId

      if the user says to delete or remove an event by name or time, you must first use getEvents tool to find the eventId
      You must never call the calendar_delete_event_by_id tool without having the eventId 

      Example:
      User: "Delete my design meeting at 3pm today"
      Assistant: 
      1. Call getEvents to retrieve events around 3pm.
      2. Identify the event and extract eventId: "abc123".
      3. Call delete-event tool with: { "eventId": "abc123" }.

      Use the provided tools whenever the user asks to view or create calendar events.
      Ask for clarification when event details are incomplete or ambiguous.

      Response Format:
      Present answers in a clean, structured, and readable format (sections, bullet points, or short steps).
      current date and time: ${new Date().toUTCString()}
      TimeZone: Asia/Kolkata (UTC+5:30)`,
          },
          {
            role: "user",
            content: userInput,
          },
        ],
      },
      config
    );

    console.log("AI: ", result.messages[result.messages.length - 1]?.content);
  }

  rl.close();
}

main();
