"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [slides, setSlides] = useState([]);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [apiCallLogs, setApiCallLogs] = useState([]);
  const [selectedModel, setSelectedModel] = useState("openai");

  const models = [
    { id: "openai", name: "OpenAI GPT-4 Vision" },
    { id: "gemini", name: "Gemini 2.0 Flash" },
    { id: "anthropic", name: "Anthropic Claude" }
  ];

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);
    setSlides([]);
    setApiCallLogs([]);

    try {
      const base64Images = await Promise.all(
        files.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      // Add log entry
      setApiCallLogs(prev => [...prev, `Processing ${base64Images.length} images with ${selectedModel}...`]);

      const response = await fetch('/api/slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          images: base64Images,
          model: selectedModel
        }),
      });

      const data = await response.json();
      
      // Add log entry about API response
      setApiCallLogs(prev => [...prev, `API Response received: ${JSON.stringify(data).substring(0, 100)}...`]);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate slides');
      }

      if (!data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
        throw new Error('No slides were generated from the API');
      }

      setSlides(data.slides);
      setCurrentSlide(0);
    } catch (err) {
      console.error('Error generating slides:', err);
      setError(err.message || 'An error occurred while generating slides');
      setApiCallLogs(prev => [...prev, `Error: ${err.message || 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Safely access slide properties with default values
  const getCurrentSlideTitle = () => {
    if (!slides || !slides[currentSlide]) return "No title available";
    return slides[currentSlide].title || "Untitled Slide";
  };

  const getCurrentSlideContent = () => {
    if (!slides || !slides[currentSlide]) return "";
    return slides[currentSlide].content || "No content available";
  };

  const getCurrentSlideExplanation = () => {
    if (!slides || !slides[currentSlide]) return "No explanation available";
    return slides[currentSlide].fullExplanation || "No explanation available";
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 bg-gradient-to-b from-blue-100 to-white">
      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold text-center mb-4">Image Slide Deck Generator</h1>
        
        <div className="w-full max-w-md">
          <div className="mb-6">
            <label htmlFor="modelSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Select AI Model
            </label>
            <select
              id="modelSelect"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Choose which AI model to use for image analysis
            </p>
          </div>
        </div>
        
        <div className="w-full">
          <label htmlFor="imageUpload" className="block text-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-lg font-medium">Upload images to generate slides</span>
            <p className="text-sm text-gray-500 mt-2">Click to browse or drag and drop</p>
            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading}
            />
          </label>
        </div>

        {isLoading && (
          <div className="w-full text-center p-8">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-lg">Generating slides with {models.find(m => m.id === selectedModel)?.name}...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        )}

        {error && (
          <div className="w-full p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>Error: {error}</p>
          </div>
        )}

        {apiCallLogs.length > 0 && (
          <div className="w-full p-4 bg-gray-100 border rounded-lg mt-4">
            <h3 className="text-lg font-semibold mb-2">API Call Logs:</h3>
            <ul className="list-disc pl-5">
              {apiCallLogs.map((log, index) => (
                <li key={index} className="text-sm text-gray-700">{log}</li>
              ))}
            </ul>
          </div>
        )}

        {slides.length > 0 && (
          <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex justify-between items-center bg-gray-100 p-4">
              <button 
                onClick={goToPrevSlide}
                disabled={currentSlide === 0}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
              >
                Previous
              </button>
              <span className="font-medium">Slide {currentSlide + 1} of {slides.length}</span>
              <button 
                onClick={goToNextSlide}
                disabled={currentSlide === slides.length - 1}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
              >
                Next
              </button>
            </div>
            
            <div className="p-8">
              <h2 className="text-3xl font-bold mb-6 text-center">{getCurrentSlideTitle()}</h2>
              <div className="prose max-w-none">
                {getCurrentSlideContent().split('\n').filter(line => line.trim()).map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Full Explanation:</h3>
                <p className="text-sm text-gray-700">{getCurrentSlideExplanation()}</p>
              </div>
              
              <div className="mt-4 text-right text-sm text-gray-500">
                Generated with: {models.find(m => m.id === selectedModel)?.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
