const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Google Generative AI with API key
const initGoogleAI = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Google API key is not defined in environment variables (GOOGLE_API_KEY)");
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Extracts the base64 data from a data URL
 * @param {string} dataUrl - The data URL
 * @returns {Object} - The extracted base64 data and MIME type
 */
function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl) return { data: null, mimeType: null };
  
  // Handle if it's already just base64 data without a data URL prefix
  if (!dataUrl.includes(';base64,')) {
    return { data: dataUrl, mimeType: 'image/jpeg' }; // Assume JPEG if no prefix
  }
  
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid data URL format');
  }
  
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

/**
 * Generates descriptive tags for an image using Gemini model
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Array<string>>} - Array of tags that describe the image
 */
async function generateImageTags(base64Image) {
  try {
    // Initialize Google AI
    const googleAI = initGoogleAI();
    
    // Extract data and MIME type from data URL
    const { data, mimeType } = extractBase64FromDataUrl(base64Image);
    
    if (!data) {
      throw new Error("Invalid image data");
    }
    
    // Define the system instruction to get relevant tags
    const systemInstruction = `
      You are an expert in tagging images that specializes in identifying objects, scenes, colors, and contexts.
      Your job is to extract relevant keywords from a photo that will help describe what's in the image.
      Extract only tags that are obviously present in the image.
      Return the keywords as a JSON array of strings.
    `;
    
    // Get the Gemini 2.0 Flash model with system instruction
    const model = googleAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 800,
      }
    });
    
    // Prepare image part for the prompt
    const imagePart = {
      inlineData: {
        data: data,
        mimeType: mimeType || "image/jpeg",
      },
    };
    
    console.log("Sending image to Gemini for tag generation...");
    
    // Generate content with just the image
    const result = await model.generateContent(imagePart);
    
    // Get the response text and parse it as JSON
    const response = await result.response;
    const responseText = response.text().trim();
    
    // Try to parse as JSON, if not possible, extract tags from text
    try {
      // If the response is a JSON array, parse it directly
      if (responseText.startsWith('[') && responseText.endsWith(']')) {
        return JSON.parse(responseText);
      }
      
      // If it's a JSON object with a tags field, extract that
      if (responseText.includes('"tags"')) {
        const jsonObj = JSON.parse(responseText);
        if (Array.isArray(jsonObj.tags)) {
          return jsonObj.tags;
        }
      }
      
      // Otherwise, split by commas and clean up the text
      return responseText
        .replace(/[\[\]"\{\}]/g, '')
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } catch (parseError) {
      console.warn("Could not parse tags as JSON, extracting from text:", parseError);
      // Fall back to simple text processing - remove quotes and brackets, split by commas
      return responseText
        .replace(/[\[\]"\{\}]/g, '')
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
  } catch (error) {
    console.error("Error generating image tags with Gemini:", error);
    return ["Error: " + error.message];
  }
}

/**
 * Analyzes an image using Google's Gemini model
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Detailed explanation of the image
 */
async function analyzeImageWithGemini(base64Image) {
  const MAX_RETRIES = 2;
  let retryCount = 0;
  
  async function attemptAnalysis() {
    try {
      // Initialize Google AI
      const googleAI = initGoogleAI();
      
      // Get the Gemini 2.0 Flash model with system instruction
      const model = googleAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: "You are an expert image analyst that provides detailed and accurate descriptions of images.",
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          maxOutputTokens: 1000,
        }
      });
      
      // Extract data and MIME type from data URL
      const { data, mimeType } = extractBase64FromDataUrl(base64Image);
      
      if (!data) {
        throw new Error("Invalid image data");
      }
      
      // Prepare image part for the prompt
      const imagePart = {
        inlineData: {
          data: data,
          mimeType: mimeType || "image/jpeg",
        },
      };
      
      // Create a prompt with text and image
      console.log("Sending image to Gemini for analysis...");
      const result = await model.generateContent([
        "Provide a detailed explanation of what's in this image. Describe the objects, context, colors, and any notable elements in detail. If there's text in the image, include it in your analysis.",
        imagePart,
      ]);
      
      // Get the response text
      const response = await result.response;
      const responseText = response.text();
      
      console.log("Received response from Gemini:", responseText.substring(0, 100) + "...");
      return responseText;
    } catch (error) {
      console.error(`Error analyzing image with Gemini (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES && (
          error.message.includes("fetch failed") || 
          error.message.includes("network") || 
          error.message.includes("timeout") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ETIMEDOUT")
        )) {
        retryCount++;
        console.log(`Retrying Gemini API call (${retryCount}/${MAX_RETRIES})...`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return attemptAnalysis();
      }
      
      // Provide more specific error message based on error type
      if (error.message.includes("API key")) {
        return "Error analyzing image with Gemini: Invalid or missing API key. Please check your environment variables.";
      } else if (error.message.includes("permission") || error.message.includes("access")) {
        return "Error analyzing image with Gemini: Permission denied. Your API key may not have access to this model.";
      } else if (error.message.includes("quota") || error.message.includes("limit")) {
        return "Error analyzing image with Gemini: API quota exceeded. Please try again later.";
      } else if (error.message.includes("network") || error.message.includes("connect") || error.message.includes("fetch failed")) {
        return "Error analyzing image with Gemini: Network error. Please check your internet connection or try a different AI model. Error details: " + error.message;
      } else {
        return "Error analyzing image with Gemini: " + error.message;
      }
    }
  }
  
  return attemptAnalysis();
}

/**
 * Quickly analyzes an image to generate a brief description (for captions)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Brief description of the image
 */
async function quickAnalyzeImageWithGemini(base64Image) {
  try {
    // Initialize Google AI
    const googleAI = initGoogleAI();
    
    // Get the Gemini 2.0 Flash model
    const model = googleAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 50,
      }
    });
    
    // Extract data and MIME type from data URL
    const { data, mimeType } = extractBase64FromDataUrl(base64Image);
    
    if (!data) {
      throw new Error("Invalid image data");
    }
    
    // Prepare image part for the prompt
    const imagePart = {
      inlineData: {
        data: data,
        mimeType: mimeType || "image/jpeg",
      },
    };
    
    // Create a prompt with text and image
    const result = await model.generateContent([
      "Describe this image in a single brief sentence. Keep it under 15 words. No introduction or commentary, just a direct description.",
      imagePart,
    ]);
    
    // Get the response text
    const response = await result.response;
    const responseText = response.text();
    
    return responseText;
  } catch (error) {
    console.error("Error quickly analyzing image with Gemini:", error);
    return "interesting image";
  }
}

/**
 * Summarizes text into a slide format using Gemini
 * @param {string} text - Text to summarize
 * @param {string} message - Original message associated with the image
 * @param {string} caption - Original caption associated with the image
 * @returns {Promise<string>} - Summarized content in slide format
 */
async function summarizeWithGemini(text, message = "", caption = "") {
  try {
    // Initialize Google AI
    const googleAI = initGoogleAI();
    
    // Get the Gemini 2.0 Flash model with system instruction
    const model = googleAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: "You are an expert at creating informative slides that incorporate all relevant context.",
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 500,
      }
    });
    
    // Create a prompt with specific instructions for formatting
    const prompt = `Generate a slide from this explanation. 
    Format your response with a # Title at the top, followed by 3-5 bullet points of content.
    
    Make the title concise but descriptive, and keep bullet points brief but informative.
    
    IMPORTANT: You must directly incorporate the original message and caption into the slide content itself.
    Don't just append them or list them separately - integrate their meaning and context into both the title
    and bullet points as appropriate.
    
    Original Message: ${message}
    Original Caption: ${caption}
    
    Explanation:
    ${text}`;
    
    // Generate content
    console.log("Sending text to Gemini for summarization...");
    const result = await model.generateContent(prompt);
    
    // Get the response text
    const response = await result.response;
    const responseText = response.text();
    
    console.log("Received summary from Gemini:", responseText.substring(0, 100) + "...");
    return responseText;
  } catch (error) {
    console.error("Error summarizing with Gemini:", error);
    
    // Provide more specific error message based on error type
    if (error.message.includes("API key")) {
      return "Error summarizing with Gemini: Invalid or missing API key. Please check your environment variables.";
    } else if (error.message.includes("permission") || error.message.includes("access")) {
      return "Error summarizing with Gemini: Permission denied. Your API key may not have access to this model.";
    } else if (error.message.includes("quota") || error.message.includes("limit")) {
      return "Error summarizing with Gemini: API quota exceeded. Please try again later.";
    } else if (error.message.includes("network") || error.message.includes("connect")) {
      return "Error summarizing with Gemini: Network error. Please check your internet connection.";
    } else {
      return "Error summarizing with Gemini: " + error.message;
    }
  }
}

module.exports = {
  analyzeImageWithGemini,
  summarizeWithGemini,
  generateImageTags,
  quickAnalyzeImageWithGemini
};
