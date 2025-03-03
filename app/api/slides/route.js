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
    const { images, model = "openai", messages = [], captions = [] } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return Response.json({ error: "No images provided" }, { status: 400 });
    }

    // Validate model selection
    const validModels = ["openai", "gemini", "anthropic"];
    if (!validModels.includes(model)) {
      return Response.json({ error: `Invalid model selected. Choose from: ${validModels.join(', ')}` }, { status: 400 });
    }

    console.log(`Using AI model: ${model}`);
    const slides = [];

    // Process each image sequentially
    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i];
      const message = messages[i] || ""; // Get message for this image if available
      const caption = captions[i] || ""; // Get caption for this image if available
      
      try {
        // Make sure the base64 image is properly formatted
        const image_url = base64Image.startsWith('data:') 
          ? base64Image 
          : `data:image/jpeg;base64,${base64Image}`;

        let explanation = "";
        let summary = "";

        // Step 1: Generate detailed explanation using selected model
        if (model === "openai") {
          explanation = await explainWithOpenAI(image_url);
        } else if (model === "gemini") {
          const result = await processImageWithGemini(base64Image, message, caption);
          explanation = result.fullExplanation;
          summary = result.content;
        } else if (model === "anthropic") {
          explanation = await analyzeImageWithClaude(base64Image);
        }

        // Better error detection - check if explanation starts with 'Error' instead of just containing the word
        const isExplanationError = explanation.startsWith("Error") || explanation === "No explanation generated";
        if (isExplanationError) {
          console.error(`Error generating explanation with ${model}:`, explanation);
          // Add error slide
          slides.push({
            title: "Error Processing Image",
            content: "There was an error processing this image. Please try again with another image or select a different AI model.",
            fullExplanation: explanation,
            originalMessage: message,
            originalCaption: caption
          });
          continue; // Skip to next image
        }

        console.log(`Generated explanation with ${model}:`, explanation.substring(0, 100) + "...");

        // Step 2: Summarize explanation into slide content
        if (model === "openai") {
          summary = await summarizeWithOpenAI(explanation, message, caption);
        } else if (model === "anthropic") {
          summary = await summarizeWithClaude(explanation, message, caption);
        }

        // Better error detection for summary
        const isSummaryError = summary.startsWith("Error");
        if (isSummaryError) {
          console.error(`Error generating summary with ${model}:`, summary);
          // Add error slide but with the explanation
          slides.push({
            title: "Error Creating Slide",
            content: "There was an error creating this slide. Here's the raw explanation instead.",
            fullExplanation: explanation,
            originalMessage: message,
            originalCaption: caption
          });
          continue; // Skip to next image
        }

        console.log(`Generated summary with ${model}:`, summary.substring(0, 100) + "...");

        // Step 3: Extract title and content from the summary
        const { title, content } = parseSummary(summary);

        // Add the slide
        slides.push({
          title,
          content,
          fullExplanation: explanation,
          originalMessage: message,
          originalCaption: caption
        });
      } catch (error) {
        console.error(`Error processing individual image with ${model}:`, error);
        
        // Add error slide
        slides.push({
          title: "Error Processing Image",
          content: "There was an error processing this image. Please try again with another image or select a different AI model.",
          fullExplanation: error.message || "Unknown error",
          originalMessage: message,
          originalCaption: caption
        });
      }
    }

    // Return the slides
    return Response.json({ slides });
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: error.message || "An error occurred processing the images" },
      { status: 500 }
    );
  }
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
async function summarizeWithOpenAI(explanation, message = "", caption = "") {
  try {
    const summaryResponse = await openai.createChatCompletion({
      model: "gpt-4o-mini", // Using gpt-4o-mini for summarization
      messages: [
        {
          role: "system",
          content: "You are a slide deck assistant. Create concise slides that incorporate all relevant context into the content."
        },
        {
          role: "user",
          content: `Generate a slide from this explanation. Format your response with a # Title at the top, followed by 3-5 bullet points of content.

IMPORTANT: You must directly incorporate the original message and caption into the slide content itself.
Don't just append them or list them separately - integrate their meaning and context into both the title
and bullet points as appropriate.

Original Message: ${message}
Original Caption: ${caption}

Explanation:
${explanation}`
        },
      ],
      max_tokens: 400
    });

    // Extract the summary from the response with safer accessing
    const summaryData = await summaryResponse.json();
    
    // Log the complete response for debugging
    console.log("OpenAI Summary API response:", JSON.stringify(summaryData));
    
    // Safer property access
    return summaryData && 
           summaryData.choices && 
           summaryData.choices.length > 0 && 
           summaryData.choices[0].message && 
           summaryData.choices[0].message.content 
      ? summaryData.choices[0].message.content 
      : "No summary generated";
  } catch (error) {
    console.error("Error in summarizeWithOpenAI:", error);
    throw error;
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
    const summary = await geminiUtils.summarizeWithGemini(explanation, message, caption);
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
