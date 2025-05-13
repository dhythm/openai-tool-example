import "dotenv/config";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

async function run() {
  //   const response = await client.responses.create({
  //     model: "gpt-4o-mini",
  //     tools: [{ type: "web_search_preview" }],
  //     input: "What was a positive news story from today?",
  //     // instructions: "You are a helpful assistant.",
  //   });

  //   console.log(
  //     "------------------------------\n",
  //     response,
  //     "\n------------------------------"
  //   );

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: "東京の現在の天気を摂氏で教えて下さい。" },
  ];

  const chatCompletion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
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
                description: "温度の単位",
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

  // アシスタントのメッセージを追加
  messages.push(chatCompletion.choices[0].message);

  for (const toolCall of toolCalls) {
    const args = JSON.parse(toolCall.function.arguments);

    // ツールの応答をメッセージ履歴に追加
    messages.push({
      role: "tool",
      content: await fetchWeather("tokyo", args["format"]),
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

async function fetchWeather(location: string, format: string) {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    location
  )}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const weatherResponse = await fetch(weatherUrl);
  const weatherData = await weatherResponse.json();

  const weather = {
    temperature: weatherData.current_weather.temperature,
    windSpeed: weatherData.current_weather.wind_speed,
    weatherCondition:
      WEATHER_CONDITIONS[
        weatherData.current_weather
          .weathercode as keyof typeof WEATHER_CONDITIONS
      ],
    location: name,
  };

  return `${weather.location}の現在の天気は${weather.weatherCondition}で、${weather.temperature}${format}です。`;
}

/**
  "0": "Clear sky",
  "1": "Mainly clear",
  "2": "Partly cloudy",
  "3": "Overcast",
  "45": "Fog and depositing rime fog",
  "48": "Fog and depositing rime fog",
  "51": "Drizzle: Light intensity",
  "53": "Drizzle: Moderate intensity",
  "55": "Drizzle: Dense intensity",
  "56": "Freezing Drizzle: Light intensity",
  "57": "Freezing Drizzle: Dense intensity",
  "61": "Rain: Slight intensity",
  "63": "Rain: Moderate intensity",
  "65": "Rain: Heavy intensity",
  "66": "Freezing Rain: Light intensity",
  "67": "Freezing Rain: Heavy intensity",
  "71": "Snow fall: Slight intensity",
  "73": "Snow fall: Moderate intensity",
  "75": "Snow fall: Heavy intensity",
  "77": "Snow grains",
  "80": "Rain showers: Slight intensity",
  "81": "Rain showers: Moderate intensity",
  "82": "Rain showers: Violent intensity",
  "85": "Snow showers: Slight intensity",
  "86": "Snow showers: Heavy intensity",
  "95": "Thunderstorm: Slight or moderate",
  "96": "Thunderstorm with slight hail",
  "99": "Thunderstorm with heavy hail"
 */
const WEATHER_CONDITIONS = {
  "0": "快晴",
  "1": "おおむね晴れ",
  "2": "晴れ時々曇り",
  "3": "くもり",
  "45": "霧",
  "48": "着氷性の霧",
  "51": "霧雨",
  "53": "霧雨",
  "55": "強い霧雨",
  "56": "弱い着氷性の霧雨",
  "57": "着氷性の霧雨",
  "61": "弱い雨",
  "63": "雨",
  "65": "強い雨",
  "66": "弱い凍雨",
  "67": "凍雨",
  "71": "弱い雪",
  "73": "雪",
  "75": "強い雪",
  "77": "雪粒",
  "80": "弱いにわか雨",
  "81": "にわか雨",
  "82": "強いにわか雨",
  "85": "弱いにわか雪",
  "86": "にわか雪",
  "95": "雷雨",
  "96": "雷雨（ひょうを伴う）",
  "99": "激しい雷雨（ひょうを伴う）",
};

run();
