// Simple script to test the API with a local image
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Check if we need to install node-fetch
    try {
      require('node-fetch');
    } catch (error) {
      console.log('Installing node-fetch...');
      require('child_process').execSync('npm install --no-save node-fetch@2');
    }

    // Use a real image URL for better testing
    const imageUrl = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxleHBsb3JlLWZlZWR8MXx8fGVufDB8fHx8&w=600&q=80';
    
    // Fetch the image from URL
    console.log('Fetching test image...');
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    console.log('Testing API with OpenAI model...');
    // Test with OpenAI model
    const responseOpenAI = await fetch('http://localhost:3000/api/slides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [base64Image],
        model: 'openai'
      }),
    });
    
    const dataOpenAI = await responseOpenAI.json();
    console.log('OpenAI API Response:', JSON.stringify(dataOpenAI).substring(0, 150) + '...');
    
    console.log('\nTesting API with Gemini model...');
    // Test with Gemini model
    const responseGemini = await fetch('http://localhost:3000/api/slides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [base64Image],
        model: 'gemini'
      }),
    });
    
    const dataGemini = await responseGemini.json();
    console.log('Gemini API Response:', JSON.stringify(dataGemini).substring(0, 150) + '...');
    
    console.log('\nTesting API with Claude model...');
    // Test with Claude model
    const responseClaude = await fetch('http://localhost:3000/api/slides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [base64Image],
        model: 'anthropic'
      }),
    });
    
    const dataClaude = await responseClaude.json();
    console.log('Claude API Response:', JSON.stringify(dataClaude).substring(0, 150) + '...');
    
    console.log('\nAPI test completed. Check the responses above.');
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
