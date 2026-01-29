# LiveIn - AI Voice Co-Host for Live Shopping

LiveIn is a real-time AI voice co-host application designed for live shopping streams. It combines a **React frontend** for screen capture and OCR (Tesseract.js) with a **secure Node.js backend** that handles Google Gemini API interactions for visual recognition and high-fidelity text-to-speech.

## Features

- **Real-time Screen OCR**: Reads viewer comments directly from your live stream dashboard using Tesseract.js.
- **Secure AI Processing**: Backend proxy ensures API keys remain secure and handles Gemini API interactions.
- **Visual Product Recognition**: Uses Gemini 1.5 Flash Vision to identify products on screen.
- **High-Fidelity AI Voice**: Uses Gemini 2.5 TTS for natural, human-like responses (with browser TTS fallback).
- **Multi-API Key Support**: Supports inputting multiple keys in the UI to rotate and manage quota limits.
- **Inventory Management**: Built-in dashboard to manage product specs for context-aware AI answers.

## Prerequisites

- **Node.js**: Version 18 (LTS) or 20 (LTS).
- **Google AI Studio API Key**: Get one from [aistudio.google.com](https://aistudio.google.com).

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/marketingadscastle-netizen/X00P090A.git
   ```

2. **Navigate to the project folder**
   ```bash
   cd X00P090A
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment (Optional)**
   You can either input API keys in the web UI ("Config" button) or set a default server-side key.
   
   Create a `.env` file in the root directory:
   ```bash
   # Create .env file
   type nul > .env
   ```
   Add your API Key:
   ```env
   API_KEY=your_actual_api_key_here
   ```

5. **Run the Application**
   This starts the backend server (port 3001) and the Vite frontend (port 3000) simultaneously.
   ```bash
   npm run dev
   ```
   
6. **Open in Browser**
   - The terminal will show a local URL, usually `http://localhost:3000`.
   - Open that link in Chrome or Edge.

## Usage Guide

1. Click **Config** (top right) to verify your API Key connection.
2. Allow microphone and screen recording permissions when prompted.
3. Click **Capture Screen** -> select the window/tab containing your live stream chat and video.
4. Align the **Green Box** over the chat area and **Blue Box** over the product video feed.
5. Click **Lock & Start Scan**.
6. Click **Start Host** to begin the AI interaction.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, Cors
- **AI & Processing**: 
  - Google Gemini API (via Backend SDK)
  - Tesseract.js (Client-side OCR)
  - Web Audio API (PCM Streaming)
