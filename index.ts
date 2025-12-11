import { ChatGroq } from "@langchain/groq";
import { createEvent, getEvents } from "./tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  END,
  START,
  StateGraph,
  MessagesAnnotation,
} from "@langchain/langgraph";
import type { AIMessage } from "@langchain/core/messages";

const tools = [createEvent, getEvents];

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

const agent = graph.compile();

async function main() {
  const result = await agent.invoke({
    messages: [
      { role: "system", content: `You are a personal assistant that helps users manage their Google Calendar.
      You have access to two tools: getEvents for retrieving events and createEvent for creating new events.

      Your Responsibilities:-

      Use the provided tools whenever the user asks to view or create calendar events.
      Ask for clarification when event details are incomplete or ambiguous.

      Behavior Rules:-

      Be concise, friendly, and efficient.
      Never invent or assume events that do not come from the user or tool results.

      Response Format:
      Present answers in a clean, structured, and readable format (sections, bullet points, or short steps).` },
      { role: "user", content: "Do I have any meetings today?" },
    ],
  });

  console.log("AI: ", result.messages[result.messages.length - 1]?.content);
}

main();
