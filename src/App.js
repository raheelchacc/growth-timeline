import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { Briefcase, Target, CalendarDays, Zap, CheckCircle, AlertTriangle, Loader2, Save, ListChecks, Lightbulb, Users, BarChart2, Info, Brain, ChevronsRight, Trash2 } from 'lucide-react';

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

const HorizontalTimelineVisual = ({ phases }) => {
    if (!phases || phases.length === 0) return null;
    return (
        <div className="mt-16 mb-8 p-6 bg-slate-800/80 rounded-xl shadow-xl border border-slate-700 backdrop-blur-sm">
          <h3 className="text-2xl font-semibold text-sky-300 mb-6 text-center flex items-center justify-center">
            <ChevronsRight className="h-7 w-7 mr-2 text-sky-400" />
            Timeline Overview
          </h3>
          <div className="relative">
            <div className="flex overflow-x-auto py-4 space-x-4 md:space-x-6 items-stretch relative z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
              {phases.map((phase, index) => (
                <div key={index} className="flex-none w-64 sm:w-72 bg-slate-700/70 p-4 rounded-lg shadow-lg border border-slate-600 flex flex-col justify-between hover:shadow-sky-500/30 transition-all duration-300 transform hover:-translate-y-1">
                  <div>
                    <div className="flex items-center mb-3">
                      <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-sky-500 text-white font-bold text-sm mr-3 shadow-md">{index + 1}</span>
                      <h4 className="text-md font-semibold text-sky-300 truncate" title={phase.phaseName}>{phase.phaseName}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 flex items-center"><CalendarDays className="inline h-4 w-4 mr-1.5 text-slate-500"/> {phase.duration}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-600/50">
                    <p className="text-xs font-medium text-slate-300 mb-1">Key Focus:</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{phase.focusAreas?.slice(0,2).join(', ') + (phase.focusAreas?.length > 2 ? '...' : '') || "N/A"}</p>
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

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [growthGoals, setGrowthGoals] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [businessPosition, setBusinessPosition] = useState('');
    
    const [timelineData, setTimelineData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiKey, setApiKey] = useState('');

    const [savedTimelines, setSavedTimelines] = useState([]);
    
    // This state is required for the delete confirmation
    const [confirmingDelete, setConfirmingDelete] = useState(null); 

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);
        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (authError) {
                    console.error("Authentication error:", authError);
                    setError("Authentication failed.");
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!db || !userId) return;
        
        // The 'query', 'collection', and 'onSnapshot' functions are used here
        const timelineCollectionPath = `artifacts/${appId}/users/${userId}/timelines`;
        const q = query(collection(db, timelineCollectionPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const timelinesData = [];
            querySnapshot.forEach((doc) => {
                timelinesData.push({ id: doc.id, ...doc.data() });
            });
            timelinesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setSavedTimelines(timelinesData);
        }, (error) => {
            console.error("Error fetching saved timelines:", error);
            setError("Could not fetch previously saved timelines.");
        });

        return () => unsubscribe();
    }, [db, userId]);

    const generateTimeline = async () => {
        if (!growthGoals || !businessType || !businessPosition) {
            setError("Please fill in all fields.");
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

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                timelineTitle: { type: "STRING" },
                phases: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      phaseName: { type: "STRING" },
                      duration: { type: "STRING" },
                      keyObjectives: { type: "ARRAY", items: { type: "STRING" } },
                      focusAreas: { type: "ARRAY", items: { type: "STRING" } },
                      potentialMetrics: { type: "ARRAY", items: { type: "STRING" } },
                      notes: { type: "STRING" }
                    },
                    required: ["phaseName", "duration", "keyObjectives", "focusAreas", "potentialMetrics", "notes"]
                  }
                }
              },
              required: ["timelineTitle", "phases"]
            }
          }
        };
        
        const currentApiKey = apiKey || "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentApiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API request failed: ${errorData?.error?.message || 'Unknown error'}`);
            }
            const result = await response.json();
            if (result.candidates?.[0]?.content?.parts?.[0]) {
                const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
                setTimelineData(parsedJson);
                await saveTimelineToFirestore(parsedJson);
            } else {
                throw new Error("Unexpected API response structure.");
            }
        } catch (e) {
            setError(`An error occurred: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const saveTimelineToFirestore = async (dataToSave) => {
        if (!db || !userId) return;
        try {
            const timelineCollectionPath = `artifacts/${appId}/users/${userId}/timelines`;
            const timelineDocRef = doc(collection(db, timelineCollectionPath), generateId());
            await setDoc(timelineDocRef, {
                growthGoals, businessType, businessPosition,
                timeline: dataToSave,
                createdAt: serverTimestamp(),
                appId, userId,
            });
        } catch (e) {
            setError("Failed to save timeline.");
        }
    };
    
    const handleDeleteTimeline = async (timelineId) => {
        if (!db || !userId || !timelineId) return;
        
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/timelines`, timelineId);
        try {
            await deleteDoc(docRef);
            // If the deleted timeline was being viewed, clear the view
            if (timelineData && timelineData.id === timelineId) {
                setTimelineData(null);
            }
        } catch (error) {
            console.error("Error deleting timeline: ", error);
            setError("Failed to delete timeline.");
        }
        setConfirmingDelete(null);
    };


    const MessageModal = ({ message, type, onClose }) => {
        if (!message) return null;
        const Icon = type === 'error' ? AlertTriangle : Info;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
            <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${type === 'error' ? 'bg-red-800/90 border-red-600' : 'bg-sky-700/90 border-sky-500'} text-slate-100 backdrop-blur-md`}>
              <div className="flex items-start">
                  <Icon className={`h-7 w-7 mr-3 flex-shrink-0 ${type === 'error' ? 'text-red-300' : 'text-sky-300'}`} />
                  <div className="flex-1">
                      <h3 className={`text-xl font-semibold ${type === 'error' ? 'text-red-200' : 'text-sky-200'}`}>{type === 'error' ? 'Error Occurred' : 'Notification'}</h3>
                      <p className={`mt-2 text-sm ${type === 'error' ? 'text-red-300' : 'text-sky-300'}`}>{message}</p>
                  </div>
              </div>
              <div className="mt-6 text-right">
                  <button onClick={onClose} className="px-5 py-2 bg-slate-600 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">Close</button>
              </div>
            </div>
          </div>
        );
    };
    
    const DeleteConfirmationModal = ({ onConfirm, onCancel }) => {
        if (!confirmingDelete) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[101]">
                <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-100">Confirm Deletion</h3>
                    <p className="text-sm text-slate-400 mt-2">Are you sure you want to delete this timeline? This action cannot be undone.</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onCancel} className="px-4 py-2 bg-slate-600 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 transition-colors">Delete</button>
                    </div>
                </div>
            </div>
        );
    }


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
            {error && <MessageModal message={error} type="error" onClose={() => setError(null)} />}
            <DeleteConfirmationModal 
                onConfirm={() => handleDeleteTimeline(confirmingDelete)}
                onCancel={() => setConfirmingDelete(null)}
            />
            
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
                {/* --- Form Inputs and Action Button Section --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="businessType" className="block text-sm font-medium text-sky-300 mb-1.5"><Briefcase className="inline h-5 w-5 mr-2 align-text-bottom" /> Business Type / Industry</label>
                            <input type="text" id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g., SaaS for small businesses" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500" />
                        </div>
                        <div>
                            <label htmlFor="businessPosition" className="block text-sm font-medium text-sky-300 mb-1.5"><Zap className="inline h-5 w-5 mr-2 align-text-bottom" /> Current Business Position</label>
                            <textarea id="businessPosition" value={businessPosition} onChange={(e) => setBusinessPosition(e.target.value)} rows="3" placeholder="e.g., Startup, 1 yr old, 10 employees, $100k ARR" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500" />
                        </div>
                        <div>
                            <label htmlFor="growthGoals" className="block text-sm font-medium text-sky-300 mb-1.5"><Target className="inline h-5 w-5 mr-2 align-text-bottom" /> Key Growth Goals</label>
                            <textarea id="growthGoals" value={growthGoals} onChange={(e) => setGrowthGoals(e.target.value)} rows="3" placeholder="e.g., Increase revenue by 50% in 2 years" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500" />
                        </div>
                        <div>
                          <label htmlFor="apiKey" className="block text-sm font-medium text-sky-300 mb-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="inline h-5 w-5 mr-2 align-text-bottom" viewBox="0 0 16 16"><path d="M8 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0 1a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7M1.668 8.444a.25.25 0 0 1 0-.888l1.482-.876a.25.25 0 0 1 .33.069l.48 1.12A.25.25 0 0 1 3.89 9.05l-1.12.48a.25.25 0 0 1-.33-.069zM12.332 7.556a.25.25 0 0 1 0 .888l-1.482.876a.25.25 0 0 1-.33-.069l-.48-1.12A.25.25 0 0 1 10.11 6.95l1.12-.48a.25.25 0 0 1 .33.069zM2.5 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m11 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M5 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m6 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/><path d="M3.5 14a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 1 0v1a.5.5 0 0 1-.5.5m9 0a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 1 0v1a.5.5 0 0 1-.5.5"/></svg> Gemini API Key (Optional)</label>
                          <input type="password" id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Gemini API key" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 shadow-sm hover:border-slate-500"/>
                          <p className="mt-1.5 text-xs text-slate-400">Leave blank to use the default API access.</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center md:items-start md:justify-start p-6 bg-slate-700/40 rounded-lg border border-slate-600/60 shadow-inner">
                        {!timelineData && !isLoading && (
                            <div className="text-center md:text-left">
                                <Lightbulb className="h-12 w-12 text-yellow-400 mx-auto md:mx-0 mb-4" />
                                <h3 className="text-xl font-semibold text-slate-100 mb-2">Ready to Plan Your Growth?</h3>
                                <p className="text-slate-300/80 text-sm leading-relaxed">Fill in your business details on the left, then click below to generate a personalized growth timeline.</p>
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center text-center w-full h-full">
                                <Loader2 className="h-12 w-12 animate-spin text-sky-400 mb-4" />
                                <p className="text-lg text-sky-300">Generating your timeline...</p>
                                <p className="text-sm text-slate-400">The AI is crafting a strategic plan. This may take a moment.</p>
                            </div>
                        )}
                        {!isLoading && (
                            <button onClick={generateTimeline} disabled={isLoading || !isAuthReady || !db} className="mt-6 w-full md:w-auto group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg shadow-lg hover:from-sky-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-cyan-500/40">
                                <CalendarDays className="h-5 w-5 mr-3 group-hover:animate-pulse group-hover:scale-110 transition-transform" />
                                Generate Growth Timeline
                            </button>
                        )}
                    </div>
                </div>

                {/* Saved Timelines Section */}
                {savedTimelines.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-700/50">
                        <h3 className="text-2xl font-semibold text-center text-sky-300 mb-6">Your Saved Timelines</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedTimelines.map((timeline) => (
                                <div key={timeline.id} className="bg-slate-700/50 p-4 rounded-lg shadow-md border border-slate-600 flex flex-col justify-between hover:border-sky-500 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200 truncate" title={timeline.businessType}>{timeline.businessType || 'Untitled Timeline'}</p>
                                        <p className="text-xs text-slate-400 mt-1">Goals: <span className="italic">{timeline.growthGoals?.substring(0, 40) || 'N/A'}...</span></p>
                                        <p className="text-xs text-slate-500 mt-2">Saved: {timeline.createdAt ? new Date(timeline.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-4">
                                        <button onClick={() => { setTimelineData(timeline.timeline); document.getElementById('timeline-results-section')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex-grow text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400">View</button>
                                        <button onClick={() => setConfirmingDelete(timeline.id)} className="p-2 bg-red-800/50 hover:bg-red-800/80 rounded-lg text-red-300 transition-colors"><Trash2 className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div id="timeline-results-section">
                    {timelineData && timelineData.phases && timelineData.phases.length > 0 && (
                        <div className="mt-12">
                            <h2 className="text-3xl font-bold text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">{timelineData.timelineTitle || "Your Growth Timeline"}</h2>
                            <p className="text-center text-slate-400 mb-10 max-w-xl mx-auto">Here's a strategic roadmap based on your inputs and AI analysis.</p>
                            <div className="space-y-10">
                                {timelineData.phases.map((phase, index) => (
                                    <div key={index} className="bg-slate-800/70 p-6 rounded-xl shadow-lg border border-slate-700 hover:shadow-sky-500/20 transition-shadow duration-300 backdrop-blur-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center mb-5">
                                            <span className="flex-shrink-0 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-sky-500 text-white font-bold text-lg sm:text-xl mr-0 sm:mr-5 mb-3 sm:mb-0 shadow-md">{index + 1}</span>
                                            <div className="flex-grow">
                                                <h3 className="text-2xl font-semibold text-sky-300">{phase.phaseName}</h3>
                                                <p className="text-sm text-slate-400 flex items-center mt-1"><CalendarDays className="h-4 w-4 mr-1.5 text-slate-500"/> Duration: {phase.duration}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><ListChecks className="h-5 w-5 mr-2.5 text-cyan-400"/> Key Objectives:</h4>
                                                <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">{phase.keyObjectives?.map((obj, i) => <li key={i}>{obj}</li>)}</ul>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><Users className="h-5 w-5 mr-2.5 text-cyan-400"/> Focus Areas:</h4>
                                                <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">{phase.focusAreas?.map((area, i) => <li key={i}>{area}</li>)}</ul>
                                            </div>
                                            <div className="md:col-span-2">
                                                <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><BarChart2 className="h-5 w-5 mr-2.5 text-cyan-400"/> Potential Metrics:</h4>
                                                <div className="flex flex-wrap gap-2.5">{phase.potentialMetrics?.map((metric, i) => (<span key={i} className="text-xs bg-slate-700 text-sky-300 px-3 py-1.5 rounded-full shadow-sm border border-slate-600">{metric}</span>))}</div>
                                            </div>
                                            <div className="md:col-span-2 mt-3">
                                                <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><Info className="h-5 w-5 mr-2.5 text-cyan-400"/> Notes & Advice:</h4>
                                                <p className="text-sm text-slate-300 bg-slate-700/60 p-4 rounded-md border border-slate-600 leading-relaxed">{phase.notes || "No specific notes for this phase."}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {timelineData && timelineData.phases && timelineData.phases.length > 0 && (
                        <HorizontalTimelineVisual phases={timelineData.phases} />
                    )}
                </div>
            </div>

            <footer className="text-center mt-16 py-8 border-t border-slate-700/50">
                <p className="text-sm text-slate-500">
                  Strategic Growth Timeline Generator &copy; {new Date().getFullYear()}.
                </p>
            </footer>
        </div>
    );
};

export default App;
