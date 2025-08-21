import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { vehicleData, templateType } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    if (!vehicleData) {
      return NextResponse.json(
        { error: "Vehicle data is required" },
        { status: 400 },
      );
    }

    const vehicleInfo = `
Vehicle Information:
- Year: ${vehicleData.year}
- Make: ${vehicleData.make}
- Model: ${vehicleData.model}
- Price: $${vehicleData.price?.toLocaleString()}
- Mileage: ${vehicleData.mileage?.toLocaleString()} miles
- Color: ${vehicleData.color}
- Stock Number: ${vehicleData.stockNumber}
${vehicleData.description ? `- Description: ${vehicleData.description}` : ""}
${vehicleData.features ? `- Features: ${vehicleData.features.join(', ')}` : ""}
`;

    const getPromptForTemplate = (type: string) => {
      switch (type) {
        case 'instagram':
          return `Create engaging Instagram post content for this luxury vehicle. Include:
- A catchy, attention-grabbing headline (max 60 characters)
- Compelling description (max 150 characters for Instagram)
- Strong call-to-action
- 5-8 relevant hashtags
- 3 key features to highlight
Make it exciting and luxury-focused.`;

        case 'facebook':
          return `Create compelling Facebook post content for this luxury vehicle. Include:
- An engaging headline that drives interest
- Detailed description (max 200 characters)
- Professional call-to-action
- 3-5 relevant hashtags
- 3-4 key features to highlight
Make it professional yet approachable.`;

        case 'story':
          return `Create dynamic Instagram/Facebook story content for this luxury vehicle. Include:
- Short, punchy headline (max 40 characters)
- Brief, exciting description (max 100 characters)
- Urgent call-to-action
- 3-4 trending hashtags
- 2-3 standout features
Make it urgent and engaging for stories format.`;

        case 'flyer':
          return `Create professional promotional flyer content for this luxury vehicle. Include:
- Professional headline that conveys value
- Detailed description highlighting quality and features
- Clear call-to-action with contact information
- Professional hashtags
- 4-5 key features and benefits
Make it formal and comprehensive for print materials.`;

        default:
          return `Create engaging marketing content for this luxury vehicle. Include a catchy headline, compelling description, strong call-to-action, relevant hashtags, and key features to highlight.`;
      }
    };

    const systemPrompt = `You are a luxury automotive marketing expert for Bentley Supercenter. You create compelling, professional marketing content that highlights the luxury, quality, and value of vehicles.

${vehicleInfo}

Your task is to create structured marketing content. Always respond in this exact JSON format:
{
  "headline": "Engaging headline here",
  "description": "Compelling description here",
  "callToAction": "Strong call-to-action here",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "features": ["Feature 1", "Feature 2", "Feature 3"]
}

Focus on luxury, quality, reliability, and the dealership's reputation. Make the content professional yet exciting.`;

    const userPrompt = getPromptForTemplate(templateType || 'instagram');

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    try {
      // Try to parse the AI response as JSON
      const contentData = JSON.parse(aiResponse);
      
      // Validate the structure
      if (!contentData.headline || !contentData.description || !contentData.callToAction) {
        throw new Error("Invalid content structure");
      }

      return NextResponse.json({
        content: contentData,
        success: true,
      });
    } catch {
      // Fallback: create structured content from plain text response
      const fallbackContent = {
        headline: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Premium Quality Awaits`,
        description: aiResponse || `Experience luxury and performance with this stunning ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}. With only ${vehicleData.mileage?.toLocaleString()} miles, this vehicle offers the perfect combination of style, comfort, and reliability.`,
        callToAction: "Visit Bentley Supercenter Today - Schedule Your Test Drive!",
        hashtags: [
          "#LuxuryCars", 
          "#BentleySupercenter", 
          `#${vehicleData.make?.replace(/\s+/g, '')}`, 
          `#${vehicleData.model?.replace(/\s+/g, '')}`, 
          "#QualityVehicles",
          "#PremiumAutos"
        ],
        features: vehicleData.features?.slice(0, 3) || [
          "Premium Interior",
          "Advanced Safety Features", 
          "Exceptional Performance"
        ]
      };

      return NextResponse.json({
        content: fallbackContent,
        success: true,
        fallback: true,
      });
    }
  } catch (error) {
    console.error("Content generation API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content",
        success: false,
      },
      { status: 500 },
    );
  }
}
