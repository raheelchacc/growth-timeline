import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  Info,
  Loader2,
  Brain,
  Briefcase,
  Zap,
  Target,
  Lightbulb,
  ListChecks,
  Users,
  BarChart2,
  CalendarDays,
  ChevronsRight
} from 'lucide-react';



// Firebase config and App ID (these will be provided by the environment)
// IMPORTANT: Replace with your actual Firebase config if not using the __firebase_config global
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG
  ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG)
  : {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID"
    };

const appId = process.env.REACT_APP_APP_ID || "default-growth-timeline-app";



// Helper to generate a unique ID for new documents if needed
const generateId = () => crypto.randomUUID();

// Horizontal Timeline Visual Component
const HorizontalTimelineVisual = ({ phases }) => {
  if (!phases || phases.length === 0) return null;

  return (
    <div className="mt-16 mb-8 p-6 bg-slate-800/80 rounded-xl shadow-xl border border-slate-700 backdrop-blur-sm">
      <h3 className="text-2xl font-semibold text-sky-300 mb-6 text-center flex items-center justify-center">
        <ChevronsRight className="h-7 w-7 mr-2 text-sky-400" />
        Timeline Overview
      </h3>
      <div className="relative">
        {/* Optional: Add a connecting line if desired, can be complex with responsiveness */}
        {/* <div className="absolute top-1/2 left-0 w-full h-0.5 bg-sky-700/50 -translate-y-1/2 z-0"></div> */}
        
        <div className="flex overflow-x-auto py-4 space-x-4 md:space-x-6 items-stretch relative z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
          {phases.map((phase, index) => (
            <div
              key={index}
              className="flex-none w-64 sm:w-72 bg-slate-700/70 p-4 rounded-lg shadow-lg border border-slate-600 flex flex-col justify-between hover:shadow-sky-500/30 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center mb-3">
                  <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-sky-500 text-white font-bold text-sm mr-3 shadow-md">
                    {index + 1}
                  </span>
                  <h4 className="text-md font-semibold text-sky-300 truncate" title={phase.phaseName}>{phase.phaseName}</h4>
                </div>
                <p className="text-xs text-slate-400 mb-2 flex items-center">
                  <CalendarDays className="inline h-4 w-4 mr-1.5 text-slate-500"/> {phase.duration}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-600/50">
                <p className="text-xs font-medium text-slate-300 mb-1">Key Focus:</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {phase.focusAreas?.slice(0,2).join(', ') + (phase.focusAreas?.length > 2 ? '...' : '') || "N/A"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
        <div className="mt-4 text-center text-sm text-slate-500">
        Scroll horizontally to view all phases.
      </div>
    </div>
  );
};


// Main App Component
const App = () => {
  // Firebase state
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Input form state
  const [growthGoals, setGrowthGoals] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessPosition, setBusinessPosition] = useState('');
  // Timeline state
  const [timelineData, setTimelineData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Can be a string for error messages or an object for more details
  const [apiKey, setApiKey] = useState('AIzaSyCYSXrVo-QABDxPagpw2DI5Y9D55cRolUc'); // User-provided API key for Gemini

  // Initialize Firebase and Auth
useEffect(() => {
  let app;
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase initialization error:", e);
    setError("Failed to initialize Firebase. Please check your Firebase configuration.");
    setIsAuthReady(true);
    return;
  }

  const firestoreDb = getFirestore(app);
  const firebaseAuth = getAuth(app);

  setDb(firestoreDb);
  setAuth(firebaseAuth);

  const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
    if (user) {
      setUserId(user.uid);
    } else {
      try {
        await signInAnonymously(firebaseAuth);
      } catch (authError) {
        console.error("Error during anonymous authentication:", authError);
        setError("Authentication failed. Please ensure anonymous sign-in is enabled in Firebase.");
      }
    }

    setIsAuthReady(true); // ✅ This line is now in the correct place
  });

  return () => unsubscribe();
}, []);


// Half part of code

 // Empty dependency array ensures this runs only once on mount

  // LLM Interaction to generate timeline
  const generateTimeline = async () => {
    if (!growthGoals || !businessType || !businessPosition) {
      setError("Please fill in all fields: Growth Goals, Business Type, and Current Position.");
      return;
    }
    if (!isAuthReady || !auth) {
        setError("Authentication is not ready. Please wait and try again.");
        return;
    }
    if (!db) {
        setError("Database is not initialized. Please wait and try again.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setTimelineData(null);

    const prompt = `
      Analyze the following business information and generate a strategic growth timeline.
      The timeline should be based on common growth models, industry best practices, and patterns observed in similar successful businesses.
      Provide a detailed, actionable, and phased approach.

      Business Type/Industry: ${businessType}
      Current Business Position: ${businessPosition}
      Key Growth Goals: ${growthGoals}

      Please structure your response as a JSON object adhering to the following schema.
      The timeline should include a main title and several distinct phases. Each phase should have a name, suggested duration,
      key objectives, primary focus areas, potential metrics to track, and any relevant notes or advice.
    `;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            timelineTitle: { type: "STRING", description: "A concise title for the overall growth timeline (e.g., 'Strategic Growth Roadmap for [Business Type]')." },
            phases: {
              type: "ARRAY",
              description: "An array of distinct phases or major milestones in the growth timeline.",
              items: {
                type: "OBJECT",
                properties: {
                  phaseName: { type: "STRING", description: "Name of the growth phase (e.g., 'Year 1: Foundation & Early Traction')." },
                  duration: { type: "STRING", description: "Suggested duration for this phase (e.g., 'Months 1-6', 'Q1-Q2 202X')." },
                  keyObjectives: {
                    type: "ARRAY",
                    description: "List of key objectives or activities for this phase (e.g., 'Develop MVP', 'Secure first 10 clients').",
                    items: { type: "STRING" }
                  },
                  focusAreas: {
                    type: "ARRAY",
                    description: "Primary areas of focus during this phase (e.g., 'Product Development', 'Market Research', 'Initial Sales & Marketing').",
                    items: { type: "STRING" }
                  },
                  potentialMetrics: {
                    type: "ARRAY",
                    description: "Key performance indicators or metrics to track progress (e.g., 'User Acquisition Rate', 'Customer Lifetime Value', 'Monthly Recurring Revenue').",
                    items: { type: "STRING" }
                  },
                  notes: { type: "STRING", description: "Any additional notes, advice, warnings, or considerations for this phase based on similar businesses or common pitfalls."}
                },
                required: ["phaseName", "duration", "keyObjectives", "focusAreas", "potentialMetrics", "notes"]
              }
            }
          },
          required: ["timelineTitle", "phases"]
        }
      }
    };
  
    // Use the user-provided API key if available, otherwise it's an empty string for default behavior
    const currentApiKey = apiKey || ""; // If apiKey state is empty, it means use the environment-provided key (if any)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentApiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error format."} })); // Graceful handling of non-JSON error response
        console.error("API Error:", errorData);
        throw new Error(`API request failed with status ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const rawJson = result.candidates[0].content.parts[0].text;
        try {
            const parsedJson = JSON.parse(rawJson);
            setTimelineData(parsedJson);
            // Ensure userId is available before saving
            if (userId) {
                 await saveTimelineToFirestore(parsedJson); 
            } else {
                console.warn("User ID not available when trying to save timeline. It might be saved upon next auth state change if logic is added for it.");
                setError("Timeline generated but could not be saved immediately as user ID was not available. It might be saved later.");
            }
        } catch (jsonParseError) {
            console.error("Error parsing JSON response from AI:", jsonParseError, "Raw JSON:", rawJson);
            setError("Failed to parse the timeline data from AI. The format was unexpected.");
        }
      } else {
        console.error("Unexpected API response structure:", result);
        setError("Failed to generate timeline. The AI returned an unexpected response. Check console for details.");
      }
    } catch (e) {
      console.error("Error generating timeline:", e);
      setError(`An error occurred: ${e.message}. If using your own API key, please ensure it is valid and has the Gemini API enabled. Also, check network connectivity.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save timeline to Firestore
  const saveTimelineToFirestore = async (dataToSave) => {
    // We re-check db and userId here as they might come from state which could be stale if not careful
    // However, generateTimeline already checks for db and auth readiness.
    // The main concern is if userId is set by the time this is called.
    if (!db) {
        setError("Firestore is not initialized. Cannot save timeline.");
        console.error("Firestore (db) is null in saveTimelineToFirestore.");
        return;
    }
    if (!userId) {
        setError("User is not authenticated. Cannot save timeline.");
        console.error("User ID is null in saveTimelineToFirestore.");
        return;
    }
    // isAuthReady check is more for the initial load, by this point userId should be the indicator.

    try {
     const currentAppId = appId;
      const currentUserId = auth.currentUser?.uid; // Get the most current user ID from auth object

      if (!currentUserId) {
        setError("User ID became unavailable before saving. Cannot save timeline.");
        console.error("auth.currentUser.uid is null in saveTimelineToFirestore.");
        return;
      }

      const timelineCollectionPath = `artifacts/${currentAppId}/users/${currentUserId}/timelines`;
      const timelineDocId = generateId(); // Generate a unique ID for the document
      const timelineDocRef = doc(db, timelineCollectionPath, timelineDocId);
    
      await setDoc(timelineDocRef, {
        growthGoals, // from component state
        businessType, // from component state
        businessPosition, // from component state
        timeline: dataToSave, // The structured JSON from the LLM
        createdAt: serverTimestamp(), // Firestore server-side timestamp
        appId: currentAppId, // Store appId for context
        userId: currentUserId, // Store userId for context
      });
      // console.log("Timeline saved to Firestore successfully with ID:", timelineDocId);
      // setError("Timeline generated and saved successfully!"); // Using error state for success message
    } catch (e) {
      console.error("Error saving timeline to Firestore:", e);
      setError("Failed to save timeline to database. Please try again. Error: " + e.message);
    }
  };

  // Simple Modal for messages
  const MessageModal = ({ message, type, onClose }) => {
    if (!message) return null;
    
    const isErrorType = type === 'error';
    const Icon = isErrorType ? AlertTriangle : Info;
    const bgColor = isErrorType ? 'bg-red-800/90 border-red-600' : 'bg-sky-700/90 border-sky-500';
    const textColor = isErrorType ? 'text-red-200' : 'text-sky-200';
    const iconColor = isErrorType ? 'text-red-300' : 'text-sky-300';
    const titleText = isErrorType ? 'Error Occurred' : 'Notification';

    return (
      <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]`}>
        <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${bgColor} text-slate-100 backdrop-blur-md`}>
          <div className="flex items-start">
            <Icon className={`h-7 w-7 mr-3 flex-shrink-0 ${iconColor}`} />
            <div className="flex-1">
              <h3 className={`text-xl font-semibold ${textColor}`}>
                {titleText}
              </h3>
              <p className={`mt-2 text-sm ${isErrorType ? 'text-red-300' : 'text-sky-300'}`}>{message}</p>
            </div>
          </div>
          <div className="mt-6 text-right">
            <button
              onClick={onClose}
              // Dynamically adjust focus ring color based on modal type for better theming
              className={`px-5 py-2 bg-slate-600 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isErrorType ? 'focus:ring-offset-red-800/90 focus:ring-red-400' : 'focus:ring-offset-sky-700/90 focus:ring-sky-400'} transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };


  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
        <p className="ml-4 text-lg text-slate-300">Initializing Application...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      {/* Pass a more specific type to MessageModal if error can also be success/info */}
      {error && <MessageModal message={error} type={error.toLowerCase().includes("success") ? "info" : "error"} onClose={() => setError(null)} />}
      
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center bg-sky-500/10 p-3 rounded-full mb-4">
          <Brain className="h-10 w-10 text-sky-400" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
          Strategic Growth Timeline Generator
        </h1>
        <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
          Input your business details and growth aspirations to generate an AI-powered strategic timeline.
        </p>
        {userId && <p className="mt-2 text-xs text-slate-500">User ID: {userId} (App ID: {appId})</p>}
      </header>

      <div className="max-w-4xl mx-auto bg-slate-800/60 shadow-2xl rounded-xl p-6 sm:p-8 backdrop-blur-lg border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-sky-300 mb-1.5">
                <Briefcase className="inline h-5 w-5 mr-2 align-text-bottom" /> Business Type / Industry
              </label>
              <input
                type="text"
                id="businessType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g., SaaS for small businesses, Local artisan bakery"
                className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500"
              />
            </div>
            <div>
              <label htmlFor="businessPosition" className="block text-sm font-medium text-sky-300 mb-1.5">
                <Zap className="inline h-5 w-5 mr-2 align-text-bottom" /> Current Business Position
              </label>
              <textarea
                id="businessPosition"
                value={businessPosition}
                onChange={(e) => setBusinessPosition(e.target.value)}
                rows="3"
                placeholder="e.g., Startup, 1 yr old, 10 employees, $100k ARR or Established local presence, seeking expansion"
                className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500"
              />
            </div>
            <div>
              <label htmlFor="growthGoals" className="block text-sm font-medium text-sky-300 mb-1.5">
                <Target className="inline h-5 w-5 mr-2 align-text-bottom" /> Key Growth Goals
              </label>
              <textarea
                id="growthGoals"
                value={growthGoals}
                onChange={(e) => setGrowthGoals(e.target.value)}
                rows="3"
                placeholder="e.g., Increase revenue by 50% in 2 years, Expand to 3 new markets, Launch 2 new product lines"
                className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500"
              />
            </div>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-sky-300 mb-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="inline h-5 w-5 mr-2 align-text-bottom" viewBox="0 0 16 16">
                    <path d="M8 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0 1a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7M1.668 8.444a.25.25 0 0 1 0-.888l1.482-.876a.25.25 0 0 1 .33.069l.48 1.12A.25.25 0 0 1 3.89 9.05l-1.12.48a.25.25 0 0 1-.33-.069zM12.332 7.556a.25.25 0 0 1 0 .888l-1.482.876a.25.25 0 0 1-.33-.069l-.48-1.12A.25.25 0 0 1 10.11 6.95l1.12-.48a.25.25 0 0 1 .33.069zM2.5 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m11 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M5 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m6 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                    <path d="M3.5 14a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 1 0v1a.5.5 0 0 1-.5.5m9 0a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 1 0v1a.5.5 0 0 1-.5.5"/>
                  </svg>
                  Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500"
                />
                <p className="mt-1.5 text-xs text-slate-400">Leave blank to use the default API access if available in this environment.</p>
            </div>
          </div>
        
          {/* Action Button and Loading/Intro */}
          <div className="flex flex-col items-center justify-center md:items-start md:justify-start p-6 bg-slate-700/40 rounded-lg border border-slate-600/60 shadow-inner">
            {!timelineData && !isLoading && (
              <div className="text-center md:text-left">
                <Lightbulb className="h-12 w-12 text-yellow-400 mx-auto md:mx-0 mb-4" />
                <h3 className="text-xl font-semibold text-slate-100 mb-2">Ready to Plan Your Growth?</h3>
                <p className="text-slate-300/80 text-sm leading-relaxed">
                  Fill in your business details on the left. Then, click the button below to generate a personalized growth timeline.
                  The AI will analyze your input and suggest a strategic path forward.
                </p>
              </div>
            )}
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-center w-full h-full">
                <Loader2 className="h-12 w-12 animate-spin text-sky-400 mb-4" />
                <p className="text-lg text-sky-300">Generating your timeline...</p>
                <p className="text-sm text-slate-400">The AI is crafting a strategic plan based on your inputs. This may take a moment.</p>
              </div>
            )}
            {!isLoading && (
                <button
                  onClick={generateTimeline}
                  disabled={isLoading || !isAuthReady || !db} // Disable if not ready or already loading
                  className="mt-6 w-full md:w-auto group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg shadow-lg hover:from-sky-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-cyan-500/40"
                >
                  {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        Generating...
                      </>
                  ) : (
                      <>
                        <CalendarDays className="h-5 w-5 mr-3 group-hover:animate-pulse group-hover:scale-110 transition-transform" />
                        Generate Growth Timeline
                      </>
                  )}
                </button>
            )}
          </div>
        </div>

        {/* Timeline Display Section - Detailed Cards */}
        {timelineData && timelineData.phases && timelineData.phases.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
              {timelineData.timelineTitle || "Your Growth Timeline"}
            </h2>
            <p className="text-center text-slate-400 mb-10 max-w-xl mx-auto">Here's a strategic roadmap based on your inputs and AI analysis. Each phase outlines key steps for your journey.</p>
          
            <div className="space-y-10">
              {timelineData.phases.map((phase, index) => (
                <div key={index} className="bg-slate-800/70 p-6 rounded-xl shadow-lg border border-slate-700 hover:shadow-sky-500/20 transition-shadow duration-300 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center mb-5">
                    <span className="flex-shrink-0 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-sky-500 text-white font-bold text-lg sm:text-xl mr-0 sm:mr-5 mb-3 sm:mb-0 shadow-md">
                      {index + 1}
                    </span>
                    <div className="flex-grow">
                      <h3 className="text-2xl font-semibold text-sky-300">{phase.phaseName}</h3>
                      <p className="text-sm text-slate-400 flex items-center mt-1">
                        <CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Duration: {phase.duration}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center">
                        <ListChecks className="h-5 w-5 mr-2.5 text-cyan-400"/> Key Objectives:
                      </h4>
                      <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
                        {phase.keyObjectives?.map((obj, i) => <li key={i}>{obj}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center">
                        <Users className="h-5 w-5 mr-2.5 text-cyan-400"/> Focus Areas:
                      </h4>
                      <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
                        {phase.focusAreas?.map((area, i) => <li key={i}>{area}</li>)}
                      </ul>
                    </div>
                    <div className="md:col-span-2">
                      <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center">
                        <BarChart2 className="h-5 w-5 mr-2.5 text-cyan-400"/> Potential Metrics:
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {phase.potentialMetrics?.map((metric, i) => (
                          <span key={i} className="text-xs bg-slate-700 text-sky-300 px-3 py-1.5 rounded-full shadow-sm border border-slate-600">{metric}</span>
                        ))}
                      </div>
                    </div>
                      <div className="md:col-span-2 mt-3">
                        <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center">
                            <Info className="h-5 w-5 mr-2.5 text-cyan-400"/> Notes & Advice:
                        </h4>
                        <p className="text-sm text-slate-300 bg-slate-700/60 p-4 rounded-md border border-slate-600 leading-relaxed">{phase.notes || "No specific notes for this phase."}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Horizontal Timeline Visual - Placed after detailed cards */}
        {timelineData && timelineData.phases && timelineData.phases.length > 0 && (
          <HorizontalTimelineVisual phases={timelineData.phases} />
        )}

      </div>
      <footer className="text-center mt-16 py-8 border-t border-slate-700/50">
        <p className="text-sm text-slate-500">
          Strategic Growth Timeline Generator &copy; {new Date().getFullYear()}.
          AI-powered insights for strategic planning. App ID: {appId}.
        </p>
      </footer>
    </div>
  );
};

export default App;
