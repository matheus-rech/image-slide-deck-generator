const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic with API key
const initAnthropic = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not defined");
  }
  return new Anthropic({ apiKey });
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
 * Analyzes an image using Anthropic's Claude model
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Detailed explanation of the image
 */
async function analyzeImageWithClaude(base64Image) {
  try {
    // Initialize Anthropic client
    const anthropic = initAnthropic();
    
    // Extract data and MIME type from data URL
    const { data, mimeType } = extractBase64FromDataUrl(base64Image);
    
    if (!data) {
      throw new Error("Invalid image data");
    }
    
    // Create the image block for Claude
    const imageBlock = {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType || "image/jpeg",
        data: data
      }
    };
    
    // Make request to Claude
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Provide a detailed explanation of what's in this image. Describe the objects, context, and any notable elements."
            },
            imageBlock
          ]
        }
      ],
    });
    
    // Return the response content
    return message.content[0].text;
  } catch (error) {
    console.error("Error analyzing image with Claude: ", error);
    return "Error analyzing image with Claude: " + (error.message || "Unknown error");
  }
}

/**
 * Summarizes text into a slide format using Claude
 * @param {string} text - Text to summarize
 * @returns {Promise<string>} - Summarized content in slide format
 */
async function summarizeWithClaude(text) {
  try {
    // Initialize Anthropic client
    const anthropic = initAnthropic();
    
    // Create prompt for summarization
    const prompt = `Generate a slide from this explanation. 
    Format your response with a # Title at the top, followed by 3-5 bullet points of content:
    
    ${text}`;
    
    // Make request to Claude
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text", 
              text: prompt
            }
          ]
        }
      ],
    });
    
    // Return the response content
    return message.content[0].text;
  } catch (error) {
    console.error("Error summarizing with Claude: ", error);
    return "Error summarizing with Claude: " + (error.message || "Unknown error");
  }
}

module.exports = {
  analyzeImageWithClaude,
  summarizeWithClaude,
};
