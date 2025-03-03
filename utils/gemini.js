const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Google Generative AI with API key
const initGoogleAI = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Google API key is not defined");
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
 * Analyzes an image using Google's Gemini model
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Detailed explanation of the image
 */
async function analyzeImageWithGemini(base64Image) {
  try {
    // Initialize Google AI
    const googleAI = initGoogleAI();
    
    // Get the Gemini 2.0 Flash model
    const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Extract data and MIME type from data URL
    const { data, mimeType } = extractBase64FromDataUrl(base64Image);
    
    if (!data) {
      throw new Error("Invalid image data");
    }
    
    // Prepare image part for the prompt
    const imageParts = [
      {
        inlineData: {
          data: data,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ];
    
    // Create a prompt with text and image
    const result = await model.generateContent([
      "Provide a detailed explanation of what's in this image. Describe the objects, context, and any notable elements.",
      ...imageParts,
    ]);
    
    // Get the response text
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    return "Error analyzing image with Gemini: " + error.message;
  }
}

/**
 * Summarizes text into a slide format using Gemini
 * @param {string} text - Text to summarize
 * @returns {Promise<string>} - Summarized content in slide format
 */
async function summarizeWithGemini(text) {
  try {
    // Initialize Google AI
    const googleAI = initGoogleAI();
    
    // Get the Gemini 2.0 Flash model for text
    const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create a prompt
    const prompt = `Generate a slide from this explanation. 
    Format your response with a # Title at the top, followed by 3-5 bullet points of content:
    
    ${text}`;
    
    // Generate content
    const result = await model.generateContent(prompt);
    
    // Get the response text
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error summarizing with Gemini:", error);
    return "Error summarizing with Gemini: " + error.message;
  }
}

module.exports = {
  analyzeImageWithGemini,
  summarizeWithGemini,
};
