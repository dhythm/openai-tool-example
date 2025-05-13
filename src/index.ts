import "dotenv/config";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function run() {
  console.log("Hello, TypeScript!");
}

run();
