# Image Slide Deck Generator

This application uses AI to analyze images and automatically generate slide decks with titles and content.

## Features

- Upload multiple images
- Generate detailed explanations for each image using AI vision capabilities
- Summarize explanations into concise slides with titles and bullet points
- Navigate through generated slides
- Choose between OpenAI, Google Gemini, or Anthropic Claude models for image analysis
- Improved error handling for all AI models

## Technologies Used

- Next.js 14
- React
- Multiple AI APIs:
  - OpenAI (GPT-4o and GPT-4o-mini)
  - Google Gemini (gemini-2.0-flash) - latest Flash model
  - Anthropic Claude (claude-3-opus and claude-3-haiku)
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- API keys for the AI services you want to use:
  - OpenAI API key with access to GPT-4 Vision
  - (Optional) Google Gemini API key for using Gemini models
  - (Optional) Anthropic API key for using Claude models

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Add your API keys to `.env.local`:

```
# OpenAI API key (required for OpenAI models)
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API key (required for Gemini models)
GOOGLE_API_KEY=your_gemini_api_key_here

# Anthropic Claude API key (required for Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Select which AI model you want to use from the dropdown menu
2. Click on the upload area or drag and drop images
3. Wait for the AI to process the images and generate slides
4. Navigate through the slides using the Previous and Next buttons
5. View the detailed explanation for each slide if needed

## Getting API Keys

### OpenAI API Key
1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Create a new API key and copy it
5. Add it to your `.env.local` file as `OPENAI_API_KEY`

### Google Gemini API Key
1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign up or log in with your Google account
3. Create a new API key and copy it
4. Add it to your `.env.local` file as `GOOGLE_API_KEY`

### Anthropic Claude API Key
1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to the API Keys section
4. Create a new API key and copy it
5. Add it to your `.env.local` file as `ANTHROPIC_API_KEY`

## How It Works

1. Images are encoded as base64 and sent to the API
2. The selected AI model generates detailed explanations for each image:
   - OpenAI uses GPT-4o
   - Google uses Gemini 2.0 Flash
   - Anthropic uses Claude 3 Opus
3. The explanations are then summarized into slide titles and content:
   - OpenAI uses GPT-4o-mini
   - Google uses Gemini 2.0 Flash
   - Anthropic uses Claude 3 Haiku
4. The UI displays the generated slides with navigation controls

## Recent Updates

- Updated OpenAI model from deprecated GPT-4-vision-preview to GPT-4o
- Improved image format handling for all AI models
- Enhanced error handling and graceful degradation for API errors
- Fixed detection logic to properly identify actual errors
