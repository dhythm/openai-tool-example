import "dotenv/config";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function run() {
  const response = await client.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search_preview" }],
    input: "What was a positive news story from today?",
    // instructions: "You are a helpful assistant.",
  });

  console.log(
    "------------------------------\n",
    response,
    "\n------------------------------"
  );

  const chatCompletion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: "東京の現在の天気を摂氏で教えて下さい。" },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "getCurrentWeather",
          description: "指定した場所の現在の天気を取得します。",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "天気を取得する場所（例：東京）",
              },
              format: {
                type: "string",
                description: "音頭の単位",
                enum: ["celsius", "fahrenheit"],
              },
            },
            required: ["location", "format"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "getCurrentWeather" } },
  });

  const toolCalls = chatCompletion.choices[0].message.tool_calls;
  if (!toolCalls) {
    throw new Error("toolCalls is undefined");
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    if (functionName === "getCurrentWeather") {
      console.log(args);
    }

    messages.push({
      role: "tool",
      content: `${args["location"]}の現在の天気は晴れ、25${args["format"]}です。`,
      tool_call_id: toolCall.id,
    });
  }

  const responseWithToolCalls = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  console.log(
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n",
    responseWithToolCalls.choices[0].message.content,
    "\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  );
}

run();
