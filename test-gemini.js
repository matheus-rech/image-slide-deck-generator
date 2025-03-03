// Test script for Gemini integration
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { analyzeImageWithGemini, summarizeWithGemini } = require('./utils/gemini');

async function testGemini() {
  try {
    console.log("🚀 Starting Gemini API test...");
    
    // Check if API key is set
    if (!process.env.GOOGLE_API_KEY) {
      console.error("❌ GOOGLE_API_KEY not found in environment variables!");
      console.log("Please add your Google API key to the .env.local file:");
      console.log("GOOGLE_API_KEY=your_api_key_here");
      return;
    }
    
    // Test image analysis
    console.log("\n📊 Testing Image Analysis with Gemini...");
    
    // Find a sample image in the project
    let testImage;
    try {
      const files = fs.readdirSync('./public');
      const imageFile = files.find(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
      
      if (imageFile) {
        const imagePath = `./public/${imageFile}`;
        testImage = fs.readFileSync(imagePath, { encoding: 'base64' });
        console.log(`Using test image: ${imagePath}`);
      } else {
        // If no image found, use a placeholder base64 image
        console.log("No image found in public directory, using placeholder image data");
        testImage = "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AkZCg87wCMD+gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAq0lEQVQ4y92UTQ6CMBCFPzTsWUjYG29kj+EJiF5PuDKe2BtIT8AC2Ji4atK3afnJ6HtJm6YzLxmgEwBAlyhjlBhj3AIw+1T38Wgx1s6249RxbB0A+rR18/UfVIDIIyUHWgqG/lyXkZLHVYI5EEVnJGPNGMkYiZaypHPzqQAxDciKYYvEGLvkDFcWKoqT7e+rQNR6I6ovSa1ldz2qWzxUe8HXLyLq3NCLCn1Jqf8QJ3swXFKR8v00AAAAAElFTkSuQmCC";
      }
      
      // Prefix with data URL if not already
      if (!testImage.startsWith('data:')) {
        testImage = `data:image/jpeg;base64,${testImage}`;
      }
      
    } catch (err) {
      console.error("Error loading test image:", err);
      // Use a placeholder base64 image
      console.log("Using placeholder image data instead");
      testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AkZCg87wCMD+gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAq0lEQVQ4y92UTQ6CMBCFPzTsWUjYG29kj+EJiF5PuDKe2BtIT8AC2Ji4atK3afnJ6HtJm6YzLxmgEwBAlyhjlBhj3AIw+1T38Wgx1s6249RxbB0A+rR18/UfVIDIIyUHWgqG/lyXkZLHVYI5EEVnJGPNGMkYiZaypHPzqQAxDciKYYvEGLvkDFcWKoqT7e+rQNR6I6ovSa1ldz2qWzxUe8HXLyLq3NCLCn1Jqf8QJ3swXFKR8v00AAAAAElFTkSuQmCC";
    }
    
    // Analyze the image
    console.log("Analyzing image...");
    const analysisResult = await analyzeImageWithGemini(testImage);
    console.log("\n✅ Image Analysis Result:");
    console.log("------------------------");
    console.log(analysisResult);
    console.log("------------------------\n");
    
    // Test text summarization
    console.log("\n📝 Testing Text Summarization with Gemini...");
    const textToSummarize = analysisResult || "This is a test text that will be summarized into a slide format. It should have a title and some bullet points. The Gemini AI model will process this text and return a formatted slide.";
    
    // Summarize the text
    console.log("Summarizing text...");
    const summaryResult = await summarizeWithGemini(textToSummarize);
    console.log("\n✅ Text Summarization Result:");
    console.log("----------------------------");
    console.log(summaryResult);
    console.log("----------------------------\n");
    
    console.log("🎉 Gemini API test completed successfully!");
    
  } catch (error) {
    console.error("❌ Error testing Gemini API:", error);
  }
}

// Run the test
testGemini();
