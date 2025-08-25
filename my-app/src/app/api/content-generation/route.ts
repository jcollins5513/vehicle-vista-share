import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContentGenerationRequest {
  vehicleData: {
    year: number;
    make: string;
    model: string;
    price?: number;
    mileage?: number;
    color?: string;
    features?: string[];
    stockNumber: string;
  };
  templateType: 'instagram' | 'facebook' | 'flyer' | 'story';
}

export async function POST(request: Request) {
  let vehicleData: any = null;
  let templateType: string | null = null;
  
  try {
    const body: ContentGenerationRequest = await request.json();
    vehicleData = body.vehicleData;
    templateType = body.templateType;

    if (!vehicleData || !templateType) {
      return NextResponse.json(
        { error: 'Missing required fields: vehicleData and templateType' },
        { status: 400 }
      );
    }

    // Create a prompt based on the template type and vehicle data
    const prompt = createPrompt(vehicleData, templateType);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional automotive marketing copywriter. Create engaging, persuasive content for luxury vehicle sales. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let generatedContent;
    try {
      generatedContent = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', responseText);
      // Fallback to manual parsing or default content
      generatedContent = createFallbackContent(vehicleData);
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
    });

  } catch (error) {
    console.error('Error generating content:', error);
    
    // Return fallback content instead of failing completely
    const fallbackContent = createFallbackContent(vehicleData);
    
    return NextResponse.json({
      success: true,
      content: fallbackContent,
      warning: 'Used fallback content due to API error',
    });
  }
}

function createPrompt(vehicleData: any, templateType: string): string {
  const vehicle = `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`;
  const price = vehicleData.price ? `$${vehicleData.price.toLocaleString()}` : 'Contact for pricing';
  const mileage = vehicleData.mileage ? `${vehicleData.mileage.toLocaleString()} miles` : '';
  const features = vehicleData.features?.slice(0, 5).join(', ') || '';

  const templateInstructions = {
    instagram: 'Create content optimized for Instagram posts - engaging, visual-focused, with relevant hashtags',
    facebook: 'Create content for Facebook posts - informative, community-focused, encouraging engagement',
    flyer: 'Create content for promotional flyers - detailed, professional, highlighting key selling points',
    story: 'Create content for Instagram/Facebook stories - brief, attention-grabbing, action-oriented'
  };

  return `Create marketing content for a ${vehicle} (Stock: ${vehicleData.stockNumber}) priced at ${price} with ${mileage}.

Key features: ${features}
Color: ${vehicleData.color || 'Not specified'}
Template type: ${templateType} - ${templateInstructions[templateType as keyof typeof templateInstructions]}

Please respond with ONLY a valid JSON object in this exact format:
{
  "headline": "Compelling headline (max 60 characters)",
  "description": "Detailed description (100-200 words)",
  "callToAction": "Strong call to action (max 40 characters)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "features": ["feature1", "feature2", "feature3"]
}

Make it compelling, professional, and appropriate for luxury vehicle sales.`;
}

function createFallbackContent(vehicleData: any) {
  if (!vehicleData) {
    return {
      headline: "Luxury Vehicle Available",
      description: "Experience premium quality and exceptional performance with this outstanding vehicle.",
      callToAction: "Schedule Your Test Drive Today!",
      hashtags: ["#LuxuryCars", "#QualityVehicles", "#TestDrive", "#Automotive", "#Premium"],
      features: ["Premium Quality", "Exceptional Performance", "Luxury Features"]
    };
  }

  return {
    headline: `${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Premium Quality`,
    description: `Experience luxury and performance with this stunning ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}. ${vehicleData.mileage ? `With only ${vehicleData.mileage.toLocaleString()} miles, ` : ''}This vehicle offers the perfect combination of style, comfort, and reliability. ${vehicleData.features?.length ? `Features include ${vehicleData.features.slice(0, 3).join(', ')}.` : ''} Don't miss this opportunity to own a premium vehicle.`,
    callToAction: "Schedule Your Test Drive Today!",
    hashtags: [
      "#LuxuryCars", 
      `#${vehicleData.make}`, 
      `#${vehicleData.model}`, 
      "#QualityVehicles", 
      "#TestDrive"
    ],
    features: vehicleData.features?.slice(0, 3) || ["Premium Quality", "Exceptional Performance", "Luxury Features"]
  };
}