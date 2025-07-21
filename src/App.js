import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // ✅ Add this line just after React
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, serverTimestamp, setDoc, collection, query, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
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
    ChevronsRight,
    History,
    ChevronDown,
    ChevronUp,
    Trash2
} from 'lucide-react';

// --- IMPORTANT FOR LOCAL DEVELOPMENT ---
// 1. Go to your Firebase project settings.
// 2. In the "General" tab, scroll down to "Your apps".
// 3. Find your web app and click on "SDK setup and configuration".
// 4. Select "Config".
// 5. Copy the entire firebaseConfig object and PASTE IT HERE, replacing these placeholder values.
const firebaseConfig = {
     apiKey: "AIzaSyDT0ZWOrHr3DkGj5jYKbHopYx4-8ET1Zqs",
  authDomain: "growth-timeline-chacc.firebaseapp.com",
  projectId: "growth-timeline-chacc",
  storageBucket: "growth-timeline-chacc.firebasestorage.app",
  messagingSenderId: "76721026482",
  appId: "1:76721026482:web:ba7ec801335f27da7b60ab",
  measurementId: "G-SY6Z199V6B"
};

// This logic handles both local development (using the config above)
// and a production environment where variables might be injected globally.
const finalFirebaseConfig = (typeof window !== 'undefined' && window.__firebase_config)
    ? JSON.parse(window.__firebase_config)
    : firebaseConfig;

const appId = (typeof window !== 'undefined' && window.__app_id) || finalFirebaseConfig.appId || 'default-growth-timeline-app';


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
                <div className="flex overflow-x-auto py-4 space-x-4 md:space-x-6 items-stretch relative z-10 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
                    {phases.map((phase, index) => (
                        <div
                            key={index}
                            className="flex-none w-64 sm:w-72 bg-slate-700/70 p-4 rounded-lg shadow-lg border border-slate-600 flex flex-col justify-between hover:shadow-sky-500/30 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div>
                                <div className="flex items-center mb-3">
                                    <span className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${phase.completed ? 'bg-green-500' : 'bg-sky-500'} text-white font-bold text-sm mr-3 shadow-md`}>
                                        {index + 1}
                                    </span>
                                    <h4 className="text-md font-semibold text-sky-300 truncate" title={phase.phaseName}>{phase.phaseName}</h4>
                                </div>
                                <p className="text-xs text-slate-400 mb-2 flex items-center">
                                    <CalendarDays className="inline h-4 w-4 mr-1.5 text-slate-500" /> {phase.duration}
                                </p>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-600/50">
                                <p className="text-xs font-medium text-slate-300 mb-1">Key Focus:</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {phase.focusAreas?.slice(0, 2).join(', ') + (phase.focusAreas?.length > 2 ? '...' : '') || "N/A"}
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

// History Panel Component
const HistoryPanel = ({ history, onLoad, isVisible, toggleVisibility, onDelete }) => {
    if (!history || history.length === 0) return null;

    return (
        <div className="max-w-4xl mx-auto my-8">
            <button
                onClick={toggleVisibility}
                className="w-full flex justify-between items-center text-left p-4 bg-slate-800/60 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors duration-200"
            >
                <div className="flex items-center">
                    <History className="h-6 w-6 mr-3 text-sky-400" />
                    <h2 className="text-xl font-semibold text-slate-100">Generation History</h2>
                </div>
                {isVisible ? <ChevronUp className="h-6 w-6 text-slate-400" /> : <ChevronDown className="h-6 w-6 text-slate-400" />}
            </button>
            {isVisible && (
                <div className="mt-2 p-4 bg-slate-800/80 rounded-b-lg border border-t-0 border-slate-700">
                    <ul className="space-y-3">
                        {history.map((item) => (
                            <li key={item.id} className="flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors duration-150 group">
                                <button onClick={() => onLoad(item)} className="flex-grow text-left">
                                    <p className="font-semibold text-sky-300">{item.timeline.timelineTitle}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                    </p>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                    className="p-2 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete history item"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
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
    const [currentTimelineId, setCurrentTimelineId] = useState(null); // To track the ID of the displayed timeline
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiKey, setApiKey] = useState('AIzaSyCYSXrVo-QABDxPagpw2DI5Y9D55cRolUc');

    // History State
    const [history, setHistory] = useState([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(true);


    // Initialize Firebase and Auth
    useEffect(() => {
        let app;
        try {
            app = initializeApp(finalFirebaseConfig);
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
                    if (typeof window !== 'undefined' && window.__initial_auth_token) {
                        await signInWithCustomToken(firebaseAuth, window.__initial_auth_token);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (authError) {
                    console.error("Error during authentication:", authError);
                    setError(`Authentication failed: ${authError.message}. Please ensure your Firebase config is correct and anonymous sign-in is enabled.`);
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    // Function to fetch history from Firestore
    const fetchHistory = useCallback(async () => {
        if (!db || !userId) return;
        try {
            const timelineCollectionPath = `artifacts/${appId}/users/${userId}/timelines`;
            const q = query(collection(db, timelineCollectionPath));
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (historyData.every(item => item.createdAt)) {
                historyData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            }
            setHistory(historyData);
        } catch (e) {
            console.error("Error fetching history:", e);
            setError("Could not load generation history. Check Firestore rules.");
        }
    }, [db, userId]);

    // Effect to fetch history once auth is ready
    useEffect(() => {
        if (isAuthReady && userId) {
            fetchHistory();
        }
    }, [isAuthReady, userId, fetchHistory]);


    // LLM Interaction to generate timeline
    const generateTimeline = async () => {
        if (!growthGoals || !businessType || !businessPosition) {
            setError("Please fill in all fields.");
            return;
        }
        if (!isAuthReady || !auth || !db) {
            setError("Application is not ready. Please wait.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setTimelineData(null);
        setCurrentTimelineId(null);

        const prompt = `Analyze the following business information and generate a strategic growth timeline. Provide a detailed, actionable, and phased approach. Business Type/Industry: ${businessType}, Current Business Position: ${businessPosition}, Key Growth Goals: ${growthGoals}. Please structure your response as a JSON object.`;
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
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error format." } }));
                throw new Error(`API request failed: ${errorData?.error?.message || 'Unknown error'}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
                const rawJson = result.candidates[0].content.parts[0].text;
                const parsedJson = JSON.parse(rawJson);
                // Add completion status to each phase
                const timelineWithCompletion = {
                    ...parsedJson,
                    phases: parsedJson.phases.map(phase => ({ ...phase, completed: false }))
                };
                setTimelineData(timelineWithCompletion);
                if (userId) {
                    await saveTimelineToFirestore(timelineWithCompletion);
                }
            } else {
                setError("Failed to generate timeline. The AI returned an unexpected response.");
            }
        } catch (e) {
            console.error("Error generating timeline:", e);
            setError(`An error occurred: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Save timeline to Firestore and update history
    const saveTimelineToFirestore = async (dataToSave) => {
        if (!db || !userId) return;

        const timelineDocId = generateId();
        setCurrentTimelineId(timelineDocId); // Set the ID for the newly generated timeline

        const newHistoryItem = {
            id: timelineDocId,
            growthGoals,
            businessType,
            businessPosition,
            timeline: dataToSave,
            createdAt: new Date(),
            appId,
            userId,
        };
        setHistory(prevHistory => [newHistoryItem, ...prevHistory]);

        try {
            const timelineCollectionPath = `artifacts/${appId}/users/${userId}/timelines`;
            const timelineDocRef = doc(db, timelineCollectionPath, timelineDocId);
            const dataForFirestore = { ...newHistoryItem, createdAt: serverTimestamp() };
            delete dataForFirestore.id;
            await setDoc(timelineDocRef, dataForFirestore);
        } catch (e) {
            console.error("Error saving timeline to Firestore:", e);
            setError("Timeline saved for this session, but failed to save to the cloud.");
        }
    };
    
    // Load a timeline from history
    const loadTimelineFromHistory = (historyItem) => {
        setGrowthGoals(historyItem.growthGoals);
        setBusinessType(historyItem.businessType);
        setBusinessPosition(historyItem.businessPosition);
        setTimelineData(historyItem.timeline);
        setCurrentTimelineId(historyItem.id); // Track the ID of the loaded timeline
        setIsHistoryVisible(false);
    };

    // Delete a timeline from history
    const deleteTimelineFromFirestore = async (timelineId) => {
        if (!db || !userId) {
            setError("Database not ready. Cannot delete.");
            return;
        }
        
        // Optimistically remove from UI
        setHistory(prevHistory => prevHistory.filter(item => item.id !== timelineId));
        if (currentTimelineId === timelineId) {
            setTimelineData(null);
            setCurrentTimelineId(null);
        }

        try {
            const timelineDocRef = doc(db, `artifacts/${appId}/users/${userId}/timelines`, timelineId);
            await deleteDoc(timelineDocRef);
        } catch (e) {
            console.error("Error deleting timeline from Firestore:", e);
            setError("Failed to delete timeline from the cloud. Please refresh.");
            // Optional: Add the item back to the UI on failure
            fetchHistory();
        }
    };
    
    // Toggle completion status of a phase
    const togglePhaseCompletion = async (phaseIndex) => {
        if (!db || !userId || !currentTimelineId || !timelineData) return;

        // Create a deep copy to avoid state mutation issues
        const newTimelineData = JSON.parse(JSON.stringify(timelineData));
        const newPhases = newTimelineData.phases;
        newPhases[phaseIndex].completed = !newPhases[phaseIndex].completed;

        // Update UI immediately
        setTimelineData(newTimelineData);

        // Update the document in Firestore
        try {
            const timelineDocRef = doc(db, `artifacts/${appId}/users/${userId}/timelines`, currentTimelineId);
            await updateDoc(timelineDocRef, {
                'timeline.phases': newPhases
            });

            // Also update the local history state so it's consistent without a refetch
            setHistory(prevHistory => prevHistory.map(item => 
                item.id === currentTimelineId 
                ? { ...item, timeline: { ...item.timeline, phases: newPhases } } 
                : item
            ));

        } catch (e) {
            console.error("Error updating phase completion:", e);
            setError("Failed to save completion status. Please try again.");
            // Optional: Revert UI on failure
            const revertedData = JSON.parse(JSON.stringify(newTimelineData));
            revertedData.phases[phaseIndex].completed = !revertedData.phases[phaseIndex].completed;
            setTimelineData(revertedData);
        }
    };


    // Simple Modal for messages
    const MessageModal = ({ message, type, onClose }) => {
        if (!message) return null;
        const isErrorType = type === 'error';
        const Icon = isErrorType ? AlertTriangle : Info;
        const bgColor = isErrorType ? 'bg-red-800/90 border-red-600' : 'bg-sky-700/90 border-sky-500';
        return (
            <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]`}>
                <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md ${bgColor} text-slate-100 backdrop-blur-md`}>
                    <div className="flex items-start">
                        <Icon className={`h-7 w-7 mr-3 flex-shrink-0 ${isErrorType ? 'text-red-300' : 'text-sky-300'}`} />
                        <div className="flex-1">
                            <h3 className={`text-xl font-semibold ${isErrorType ? 'text-red-200' : 'text-sky-200'}`}>{isErrorType ? 'Error' : 'Notification'}</h3>
                            <p className={`mt-2 text-sm ${isErrorType ? 'text-red-300' : 'text-sky-300'}`}>{message}</p>
                        </div>
                    </div>
                    <div className="mt-6 text-right">
                        <button onClick={onClose} className={`px-5 py-2 bg-slate-600 text-slate-100 text-sm font-medium rounded-lg hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isErrorType ? 'focus:ring-offset-red-800/90 focus:ring-red-400' : 'focus:ring-offset-sky-700/90 focus:ring-sky-400'} transition-colors`}>Close</button>
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
            {error && <MessageModal message={error} type="error" onClose={() => setError(null)} />}

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
                {userId && <p className="mt-2 text-xs text-slate-500">User ID: {userId}</p>}
            </header>
            
            <div className="max-w-4xl mx-auto bg-slate-800/60 shadow-2xl rounded-xl p-6 sm:p-8 backdrop-blur-lg border border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="businessType" className="block text-sm font-medium text-sky-300 mb-1.5"><Briefcase className="inline h-5 w-5 mr-2 align-text-bottom" /> Business Type / Industry</label>
                            <input type="text" id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g., SaaS for small businesses" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="businessPosition" className="block text-sm font-medium text-sky-300 mb-1.5"><Zap className="inline h-5 w-5 mr-2 align-text-bottom" /> Current Business Position</label>
                            <textarea id="businessPosition" value={businessPosition} onChange={(e) => setBusinessPosition(e.target.value)} rows="3" placeholder="e.g., Startup, 1 yr old, $100k ARR" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="growthGoals" className="block text-sm font-medium text-sky-300 mb-1.5"><Target className="inline h-5 w-5 mr-2 align-text-bottom" /> Key Growth Goals</label>
                            <textarea id="growthGoals" value={growthGoals} onChange={(e) => setGrowthGoals(e.target.value)} rows="3" placeholder="e.g., Increase revenue by 50% in 2 years" className="w-full px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                    </div>

                    {/* Action Button and Loading/Intro */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-700/40 rounded-lg border border-slate-600/60 shadow-inner">
                        {!timelineData && !isLoading && (
                            <div className="text-center">
                                <Lightbulb className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-slate-100 mb-2">Ready to Plan Your Growth?</h3>
                                <p className="text-slate-300/80 text-sm leading-relaxed">Fill in your details and click the button to generate a timeline.</p>
                            </div>
                        )}
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center text-center w-full h-full">
                                <Loader2 className="h-12 w-12 animate-spin text-sky-400 mb-4" />
                                <p className="text-lg text-sky-300">Generating your timeline...</p>
                            </div>
                        )}
                        {!isLoading && (
                            <button onClick={generateTimeline} disabled={isLoading || !isAuthReady || !db} className="mt-6 w-full group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg shadow-lg hover:from-sky-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
                                <CalendarDays className="h-5 w-5 mr-3" /> Generate Growth Timeline
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <HistoryPanel history={history} onLoad={loadTimelineFromHistory} isVisible={isHistoryVisible} toggleVisibility={() => setIsHistoryVisible(!isHistoryVisible)} onDelete={deleteTimelineFromFirestore} />

            {/* Timeline Display Section */}
            {timelineData && timelineData.phases && (
                <div className="max-w-4xl mx-auto mt-8">
                    <div className="bg-slate-800/60 shadow-2xl rounded-xl p-6 sm:p-8 backdrop-blur-lg border border-slate-700">
                        <h2 className="text-3xl font-bold text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
                            {timelineData.timelineTitle || "Your Growth Timeline"}
                        </h2>
                        <p className="text-center text-slate-400 mb-10 max-w-xl mx-auto">Here's a strategic roadmap based on your inputs and AI analysis.</p>

                        <div className="space-y-10">
                            {timelineData.phases.map((phase, index) => (
                                <div key={index} className="bg-slate-800/70 p-6 rounded-xl shadow-lg border border-slate-700">
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-center">
                                            <span className={`flex-shrink-0 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full ${phase.completed ? 'bg-green-500' : 'bg-sky-500'} text-white font-bold text-lg sm:text-xl mr-5 shadow-md`}>
                                                {index + 1}
                                            </span>
                                            <div>
                                                <h3 className="text-2xl font-semibold text-sky-300">{phase.phaseName}</h3>
                                                <p className="text-sm text-slate-400 flex items-center mt-1"><CalendarDays className="h-4 w-4 mr-1.5 text-slate-500" /> Duration: {phase.duration}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center pl-4">
                                            <input type="checkbox" checked={!!phase.completed} onChange={() => togglePhaseCompletion(index)} className="h-6 w-6 rounded bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><ListChecks className="h-5 w-5 mr-2.5 text-cyan-400" /> Key Objectives:</h4>
                                            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
                                                {phase.keyObjectives?.map((obj, i) => <li key={i}>{obj}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><Users className="h-5 w-5 mr-2.5 text-cyan-400" /> Focus Areas:</h4>
                                            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
                                                {phase.focusAreas?.map((area, i) => <li key={i}>{area}</li>)}
                                            </ul>
                                        </div>
                                        <div className="md:col-span-2">
                                            <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><BarChart2 className="h-5 w-5 mr-2.5 text-cyan-400" /> Potential Metrics:</h4>
                                            <div className="flex flex-wrap gap-2.5">
                                                {phase.potentialMetrics?.map((metric, i) => <span key={i} className="text-xs bg-slate-700 text-sky-300 px-3 py-1.5 rounded-full shadow-sm border border-slate-600">{metric}</span>)}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 mt-3">
                                            <h4 className="text-lg font-semibold text-slate-200 mb-2.5 flex items-center"><Info className="h-5 w-5 mr-2.5 text-cyan-400" /> Notes & Advice:</h4>
                                            <p className="text-sm text-slate-300 bg-slate-700/60 p-4 rounded-md border border-slate-600 leading-relaxed">{phase.notes || "No specific notes."}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <HorizontalTimelineVisual phases={timelineData.phases} />
                    </div>
                </div>
            )}

            <footer className="text-center mt-16 py-8 border-t border-slate-700/50">
                <p className="text-sm text-slate-500">
                    Strategic Growth Timeline Generator &copy; {new Date().getFullYear()}. App ID: {appId}.
                </p>
            </footer>
        </div>
    );
};

export default App;
