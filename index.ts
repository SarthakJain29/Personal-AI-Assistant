import { ChatGroq } from "@langchain/groq";
import { createEvent, getEvents } from "./tools";

const tools = [createEvent, getEvents];

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
}).bindTools(tools);
