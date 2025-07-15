import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, vehicleData } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const vehicleInfo = vehicleData
      ? `
Vehicle Information:
- Year: ${vehicleData.year}
- Make: ${vehicleData.make}
- Model: ${vehicleData.model}
- Price: $${vehicleData.price?.toLocaleString()}
- Mileage: ${vehicleData.mileage?.toLocaleString()} miles
- Color: ${vehicleData.color}
${vehicleData.description ? `- Description: ${vehicleData.description}` : ""}
`
      : "";

    const systemPrompt = `You are ARIA, an AI automotive assistant for Bentley Supercenter. You're knowledgeable, helpful, and enthusiastic about luxury vehicles. 

${vehicleInfo}

Your role is to:
- Help customers learn about vehicles
- Answer questions about features, pricing, and specifications
- Assist with scheduling test drives and appointments
- Provide financing information
- Be friendly and professional

Keep responses conversational and helpful. If asked about specific vehicle details not provided, acknowledge what you know and offer to connect them with a specialist for more detailed information.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    return NextResponse.json({
      response: aiResponse,
      success: true,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        response:
          "I'm having trouble connecting right now. Please try again in a moment or speak with one of our specialists.",
      },
      { status: 500 },
    );
  }
}
