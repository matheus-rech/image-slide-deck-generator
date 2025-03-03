import { Configuration, OpenAIApi } from "openai-edge";
import { OpenAIStream } from "ai";
import geminiUtils from "../../../utils/gemini"; // Import geminiUtils
import { analyzeImageWithClaude, summarizeWithClaude } from "../../../utils/anthropic";

export const runtime = "edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || "",
});
const openai = new OpenAIApi(config);

export async function POST(req) {
  try {
    const data = await req.json();
    
    if (!data || !data.images || !Array.isArray(data.images) || data.images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const images = data.images;
    const model = data.model || "openai";
    
    const slides = [];
    
    for (let i = 0; i < images.length; i++) {
      const image_url = images[i];
      
      try {
        // Generate a base message and caption using the AI model
        let base64Image = image_url;
        if (image_url.startsWith('data:')) {
          // It's already a base64 string
          base64Image = image_url;
        } else {
          // Convert URL to base64
          const imageResponse = await fetch(image_url);
          const blob = await imageResponse.blob();
          base64Image = await blobToBase64(blob);
        }
        
        // Generate a contextual message and caption for each image
        const contextInfo = await generateImageContext(base64Image, model);
        const message = contextInfo.message;
        const caption = contextInfo.caption;
        const description = contextInfo.description;
        
        console.log(`Generated message: ${message.substring(0, 50)}...`);
        console.log(`Generated caption: ${caption.substring(0, 50)}...`);
        
        // Step 1: Analyze the image to get full explanation
        let explanation = "";
        let summary = "";
        let title = "";
        let content = "";
        
        if (model === "openai") {
          const result = await processImageWithOpenAI(base64Image, message, caption);
          explanation = result.fullExplanation;
          summary = result.content;
          title = result.title;
        } else if (model === "gemini") {
          const result = await processImageWithGemini(base64Image, message, caption);
          explanation = result.fullExplanation;
          summary = result.content;
          title = result.title;
        } else if (model === "anthropic") {
          explanation = await analyzeImageWithClaude(base64Image);
        }
        
        if (!explanation) {
          throw new Error(`Failed to analyze image with ${model}`);
        }
        
        // Step 2: Summarize explanation into slide content if not already done
        if (model === "anthropic") {
          summary = await summarizeWithClaude(explanation, message, caption);
        }
        
        if (!summary) {
          throw new Error(`Failed to summarize explanation with ${model}`);
        }
        
        // Extract title and content from summary
        if (!title) {
          title = extractTitle(summary);
          content = extractContent(summary);
        } else {
          content = summary;
        }
        
        // Add to slides array
        slides.push({
          title,
          content,
          fullExplanation: explanation,
          originalMessage: message,
          originalCaption: caption
        });
        
      } catch (error) {
        console.error(`Error processing image ${i}:`, error);
        slides.push({
          title: "Error Processing Image",
          content: `There was an error processing this image: ${error.message}`,
          fullExplanation: `Error details: ${error.stack || error.message}`,
          originalMessage: "",
          originalCaption: ""
        });
      }
    }
    
    return new Response(
      JSON.stringify({ slides }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Server error: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper function to generate image context (message and caption)
async function generateImageContext(base64Image, model) {
  console.log("Generating context for image...");
  
  try {
    // Get a brief description of the image to use for context
    let description = "";
    
    if (model === "openai") {
      description = await quickDescribeWithOpenAI(base64Image);
    } else if (model === "gemini") {
      description = await quickDescribeWithGemini(base64Image);
    } else if (model === "anthropic") {
      description = await quickDescribeWithClaude(base64Image);
    }
    
    // Generate a more interesting message and caption based on the description
    const message = `Let's explore the details and significance of this ${description.split(' ').slice(0, 5).join(' ')}...`;
    const caption = description.split('.')[0] + '.';
    
    return { 
      message, 
      caption,
      description 
    };
  } catch (error) {
    console.error("Error generating context:", error);
    // Return default values if something goes wrong
    return { 
      message: "Let's explore the details and significance of this interesting image...", 
      caption: "An interesting visual",
      description: "interesting visual content" 
    };
  }
}

// Quick image description functions for each model
async function quickDescribeWithOpenAI(base64Image) {
  try {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: process.env.OPENAI_API_KEY })
    );
    
    const response = await openai.createChatCompletion({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image in a detailed sentence. Focus on what makes it interesting or noteworthy." },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ],
      max_tokens: 150
    });
    
    const stream = OpenAIStream(response);
    const reader = stream.getReader();
    let result = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }
    
    return result.trim() || "interesting image";
  } catch (error) {
    console.error("Error in quickDescribeWithOpenAI:", error);
    return "interesting image";
  }
}

async function quickDescribeWithGemini(base64Image) {
  try {
    const description = await geminiUtils.quickAnalyzeImageWithGemini(base64Image);
    return description.trim() || "interesting image";
  } catch (error) {
    console.error("Error in quickDescribeWithGemini:", error);
    return "interesting image";
  }
}

async function quickDescribeWithClaude(base64Image) {
  // Simplified version of Claude image description
  return "interesting image"; // Placeholder for Claude implementation
}

// Helper function for OpenAI image explanation
async function explainWithOpenAI(image_url) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Provide a detailed explanation of what's in this image. Describe the objects, context, and any notable elements." },
            {
              type: "image_url",
              image_url: {
                url: image_url,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const data = await response.json();
    console.log("OpenAI Explanation API response:", JSON.stringify(data));

    if (data.error) {
      console.error("OpenAI API error:", data.error);
      return "No explanation generated";
    }

    return data.choices[0]?.message?.content || "No explanation generated";
  } catch (error) {
    console.error("Error explaining with OpenAI:", error);
    return "Error generating explanation";
  }
}

// Helper function for OpenAI summarization
async function summarizeWithOpenAI(explanation, message, caption) {
  try {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: process.env.OPENAI_API_KEY })
    );
    
    const content = `
Image Explanation: ${explanation}
Context: ${message}
Caption: ${caption}

Create a slide based on this image analysis. Format as follows:
# Title That Captures Main Theme

Then create 3-5 bullet points or short paragraphs that highlight the key aspects of the image. Be informative, engaging and educational. Include interesting facts or observations where possible.

The content should be comprehensive enough to stand on its own even if someone couldn't see the image.
`;
    
    const response = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert at creating engaging presentation slides from image analyses." },
        { role: "user", content }
      ],
      max_tokens: 500,
    });
    
    const stream = OpenAIStream(response);
    const reader = stream.getReader();
    let result = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }
    
    return result;
  } catch (error) {
    console.error("Error summarizing with OpenAI:", error);
    // Return a more user-friendly error message
    return `# Analysis of the Image\n\nThis image appears to show ${caption || "interesting content"}.\n\n- The image contains details that would be analyzed further with a working connection to OpenAI.\n- Unfortunately, there was an error connecting to the AI service.\n- Try again or select a different AI model.\n\nError details: ${error.message}`;
  }
}

// Helper function for Gemini summarization
async function summarizeWithGemini(explanation, message, caption) {
  try {
    // Using the Gemini model to generate a summary
    const googleAI = initGoogleAI();
    
    const model = googleAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: "You are an expert at creating engaging presentation slides from image analyses.",
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        maxOutputTokens: 800,
      }
    });
    
    const prompt = `
Image Explanation: ${explanation}
Context: ${message}
Caption: ${caption}

Create a slide based on this image analysis. Format as follows:
# Title That Captures Main Theme

Then create 3-5 bullet points or short paragraphs that highlight the key aspects of the image. Be informative, engaging and educational. Include interesting facts or observations where possible.

The content should be comprehensive enough to stand on its own even if someone couldn't see the image.
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();
    
    // If summary is too short, it might be an error or low-quality response
    if (summary.length < 50) {
      console.log("Gemini returned a very short summary, might be low quality:", summary);
      return `# Analysis of the Image\n\nThis image appears to show ${caption || "interesting content"}.\n\n- The image contains elements that would be explained in more detail with proper AI analysis.\n- Unfortunately, the AI generated a limited response.\n- The image appears to be a ${caption || "visual that requires further analysis"}.\n\nTry selecting a different AI model for better results.`;
    }
    
    return summary;
  } catch (error) {
    console.error("Error summarizing with Gemini:", error);
    return `# Analysis of the Image\n\nThis image appears to show ${caption || "interesting content"}.\n\n- The image contains elements that would be analyzed with a working connection to Gemini.\n- Unfortunately, there was an error connecting to the AI service.\n- Try again or select a different AI model.\n\nError details: ${error.message}`;
  }
}

// Helper function to parse summary into title and content
function parseSummary(summary) {
  const titleMatch = summary.match(/^#\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Slide";
  
  // Remove the title from the content and clean up
  const content = summary
    .replace(/^#\s*.+$/m, '')
    .trim();

  return { title, content };
}

// Helper function for Gemini image explanation and summarization with fallback to OpenAI
async function processImageWithGemini(base64Image, message, caption) {
  console.log("Using AI model: gemini");
  
  try {
    // Generate explanation with Gemini
    const explanation = await geminiUtils.analyzeImageWithGemini(base64Image);
    console.log("Generated explanation with gemini:", explanation.substring(0, 100) + "...");

    // Check if there was an error with Gemini
    if (explanation.startsWith("Error analyzing image with Gemini:")) {
      console.log("Falling back to OpenAI due to Gemini error");
      return processImageWithOpenAI(base64Image, message, caption);
    }
    
    // Generate summary with Gemini
    console.log("Sending text to Gemini for summarization...");
    const summary = await summarizeWithGemini(explanation, message, caption);
    console.log("Received summary from Gemini:", summary.substring(0, 100) + "...");
    
    // Check if there was an error with summarization
    if (summary.startsWith("Error summarizing with Gemini:")) {
      // Try to summarize with OpenAI instead
      console.log("Falling back to OpenAI for summarization");
      const openAiSummary = await summarizeWithOpenAI(explanation, message, caption);
      return {
        title: extractTitle(openAiSummary),
        content: extractContent(openAiSummary),
        fullExplanation: explanation,
        originalMessage: message,
        originalCaption: caption
      };
    }
    
    return {
      title: extractTitle(summary),
      content: extractContent(summary),
      fullExplanation: explanation,
      originalMessage: message,
      originalCaption: caption
    };
  } catch (error) {
    console.error("Error in Gemini processing:", error);
    console.log("Falling back to OpenAI due to exception");
    return processImageWithOpenAI(base64Image, message, caption);
  }
}

// Helper function to extract title from summary
function extractTitle(summary) {
  const titleMatch = summary.match(/^#\s*(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : "Untitled Slide";
}

// Helper function to extract content from summary
function extractContent(summary) {
  return summary
    .replace(/^#\s*.+$/m, '')
    .trim();
}

// Helper function to process image with OpenAI
async function processImageWithOpenAI(base64Image, message, caption) {
  console.log("Using AI model: openai");
  
  try {
    // Generate explanation with OpenAI
    const explanation = await explainWithOpenAI(base64Image);
    console.log("Generated explanation with openai:", explanation.substring(0, 100) + "...");

    // Generate summary with OpenAI
    const summary = await summarizeWithOpenAI(explanation, message, caption);
    console.log("Received summary from OpenAI:", summary.substring(0, 100) + "...");
    
    return {
      title: extractTitle(summary),
      content: extractContent(summary),
      fullExplanation: explanation,
      originalMessage: message,
      originalCaption: caption
    };
  } catch (error) {
    console.error("Error in OpenAI processing:", error);
    throw error;
  }
}

// Helper function to convert blob to base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
