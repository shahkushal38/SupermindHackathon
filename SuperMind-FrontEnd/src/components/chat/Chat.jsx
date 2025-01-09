import React, { useState, useEffect, useRef } from "react";
import { SendIcon, MessageCircleIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateReport } from "../chat/generateReport"; // Adjust path if needed
import GraphVisualizer from '../visualization/GraphVisualizer';

const GRAPH_PROMPT = `
Also, if the response contains any numerical or statistical data, create insightful and creative charts or visualizations in SVG format, ensuring that they can be easily rendered in a ReactMarkdown component for UI display.
Provide the visualization as SVG content directly in the response. Ensure it is clean, structured, and can be embedded in a ReactMarkdown component.


Make the visualizations creative and insightful.
`;

const FORMAT_PROMPT = `
Please provide a creative and visually engaging response using advanced Markdown formatting. Follow these guidelines:

1. 🎯 Start with an eye-catching header using emojis:
   - Use relevant emojis as visual anchors
   - Create a clear, bold main title
   
2. 📝 Structure your content with:
   - Clear hierarchical headings (# ## ###)
   - Short, engaging paragraphs
   - Bulleted or numbered lists for easy scanning
   
3. 💡 Enhance readability with:
   - > Quote blocks for important points
   - \`Code blocks\` with syntax highlighting when needed
   - **Bold** and *italic* text for emphasis
   - [Links](url) when referencing external resources
   
4. 📊 Visual elements:
   - Tables for structured data
   - Horizontal rules (---) to separate sections
   - Checkboxes for actionable items: - [ ] Task
   
5. 🎨 Creative formatting:
   - Use emojis as section markers
   - Add ASCII art when relevant
   - Include "Tips" and "Note" sections with 💭 markers

6. 🔍 Summary:
   - End with key takeaways
   - Add "Related Topics" section
   - Include a "Further Reading" list if applicable

Make the response engaging and easy to scan. Here's my question: 
${GRAPH_PROMPT}
`;

// Fetch sessions for given user and project
const fetchSessions = async (userId, projectId) => {
  try {
    const response = await fetch(
      `http://localhost:5000/chats/sessions?user_id=${userId}&project_id=${projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await response.json();
    // Sort sessions so the newest is at the top (descending by created_at)
    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return data;
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return [];
  }
};

// Fetch chats for a given session
const fetchChatsInSession = async (sessionId) => {
  try {
    const response = await fetch(
      `http://localhost:5000/chats/session/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return [];
  }
};

// Convert base64 to Blob URL (used for PDF and DOCX)
const base64ToBlobUrl = (b64Data, contentType) => {
  const byteCharacters = atob(b64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  return URL.createObjectURL(blob);
};

const SuggestionCategories = [
  {
    title: "Engagement Analysis",
    icon: "📊",
    queries: [
      "Analyze the engagement rates across different post types",
      "Show me the correlation between posting time and engagement",
      "What's the average likes and comments per post?",
      "Which type of content gets the most shares?",
    ]
  },
  {
    title: "Content Performance",
    icon: "📈",
    queries: [
      "Which hashtags generate the most engagement?",
      "Compare video vs image post performance",
      "What's the best performing content category?",
      "Analyze post length vs engagement rate",
    ]
  },
  {
    title: "Temporal Analysis",
    icon: "⏰",
    queries: [
      "What are the best posting times?",
      "Show monthly engagement trends",
      "Analyze weekend vs weekday performance",
      "Peak engagement hours analysis",
    ]
  },
  {
    title: "Audience Insights",
    icon: "👥",
    queries: [
      "What type of content drives most user interactions?",
      "Analyze follower growth patterns",
      "Compare audience engagement by platform",
      "Most engaging audience segments",
    ]
  }
];

const ChatInterface = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [selectedType, setSelectedType] = useState("PDF");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const documentTypes = ["PDF", "HTML", "MARKDOWN", "DOCX"];
  const [graphData, setGraphData] = useState(null);
  const [graphsLoading, setGraphsLoading] = useState(false);

  const location = useLocation();
  const userId = location.state?.userId;
  const projectId = location.state?.projectId;

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    // Fetch sessions for the current user and project
    if (userId && projectId) {
      fetchSessions(userId, projectId).then(setSessions);
    }
  }, [userId, projectId]);

  useEffect(() => {
    // Fetch chats when a session is selected
    if (selectedSession && selectedSession.session_id) {
      fetchChatsInSession(selectedSession.session_id).then(fetchedChats => {
        if (fetchedChats && fetchedChats.length > 0) {
          setChats(fetchedChats);
        }
      });
    }
  }, [selectedSession]);

  useEffect(() => {
    // Scroll to bottom of chat whenever chats change
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const processResponseForGraphs = (content) => {
    setGraphsLoading(true);
    try {
      // Look for JSON structure in the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const data = JSON.parse(jsonMatch[1]);
        if (data.visualizations) {
          setGraphData(data.visualizations);
          return content.replace(/```json\n[\s\S]*?\n```/, ''); // Remove JSON from content
        }
      }
      return content;
    } catch (error) {
      console.error('Error processing graphs:', error);
      return content;
    } finally {
      setGraphsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    
    try {
      // Remove any previous error messages
      setChats(prevChats => prevChats.filter(msg => msg.format !== "ERROR"));

      // Append the format prompt to user's message
      const formattedMessage = FORMAT_PROMPT + newMessage;

      const userMsg = { query: newMessage, format: null };
      const typingMsg = { query: "AI is thinking...", format: "TYPING" };

      setChats(prevChats => [...prevChats, userMsg, typingMsg]);
      setNewMessage("");

      const response = await generateReport(
        formattedMessage,
        userId,
        projectId,
        selectedType,
        selectedSession?.session_id
      );

      console.log("Response - ", response)
      // Update graph data if present in response
      if (response.graphData) {
        setGraphData(response.graphData);
      } else {
        setGraphData(null);
      }

      setChats(prev => {
        const withoutTyping = prev.filter(msg => msg.format !== "TYPING");
        return [...withoutTyping, {
          response: response.content,
          format: response.format,
          markdown_content: response.content,
          file: response.file,
          graphs: response.graphData
        }];
      });

      // Fetch updated sessions
      const updatedSessions = await fetchSessions(userId, projectId);
      setSessions(updatedSessions);

      // Update selected session only if none was selected before
      if (!selectedSession && updatedSessions.length > 0) {
          setSelectedSession(updatedSessions[0]);
      }

    } catch (error) {
      console.error("Error generating response:", error);
      
      // Remove typing message and add error message
      setChats(prev => {
        const withoutTyping = prev.filter(msg => msg.format !== "TYPING");
        return [...withoutTyping, {
          query: "Error",
          response: "Sorry, there was an error generating the response. Please try again.",
          format: "ERROR",
          markdown_content: `Error: ${error.message || "Network error occurred. Please check your connection."}`
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = () => {
    // Clear current selection and chats to start fresh
    setSelectedSession(null);
    setChats([]);
  };

  const deleteSessionFromServer = async (sessionId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/chats/session/${sessionId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      return false;
    }
  };

  const deleteSession = async (sessionToDelete) => {
    const success = await deleteSessionFromServer(sessionToDelete.session_id);
    if (!success) return;

    setSessions((prev) =>
      prev.filter(
        (session) => session.session_id !== sessionToDelete.session_id
      )
    );
    if (selectedSession?.session_id === sessionToDelete.session_id) {
      setSelectedSession(null);
      setChats([]);
    }
  };

  // Add this CSS class in your component
  const markdownStyles = {
    table: {
      borderCollapse: 'collapse',
      width: '100%',
      margin: '1rem 0',
    },
    th: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: '0.75rem',
      borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
      textAlign: 'left',
    },
    td: {
      padding: '0.75rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
  };

  const handleSuggestionClick = (query) => {
    setNewMessage(query);
    handleSendMessage();
  };

  // Render each chat object
  // If format is null: user query (right)
  // If format is "TYPING": AI typing (left) only
  // If format is actual (PDF, DOCX, MARKDOWN, HTML): user query (right), AI answer (left)
  const renderChats = () => {
    return chats.map((chat, idx) => {
      if (chat.format === "TYPING") {
        return (
          <div key={idx + "-typing"} className="flex justify-start animate-fadeIn">
            <div className="max-w-xl p-4 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg transition-all duration-300">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                </div>
                <span className="text-gray-400">{chat.query}</span>
              </div>
            </div>
          </div>
        );
      }

      const userMessage = (
        <div key={idx + "-user"} className="flex justify-end animate-slideInRight">
          <div className="max-w-xl p-4 rounded-2xl bg-indigo-600/90 backdrop-blur-lg shadow-lg text-white transition-all duration-300 hover:bg-indigo-600">
            {chat.query}
          </div>
        </div>
      );

      if (!chat.format) {
        return <React.Fragment key={idx}>{userMessage}</React.Fragment>;
      }

      // AI answer
      let answerContent;

      // Extract and parse any JSON graph data from response
      let parsedGraphs = null;
      if (chat.markdown_content) {
        const jsonMatches = chat.markdown_content.match(/\{[\s\S]*?"visualizations"[\s\S]*?\}/g);
        if (jsonMatches) {
          try {
            parsedGraphs = jsonMatches.map(json => JSON.parse(json));
          } catch (e) {
            console.error('Failed to parse graph data:', e);
          }
          // Remove the JSON data from markdown content
          chat.markdown_content = chat.markdown_content.replace(/\{[\s\S]*?"visualizations"[\s\S]*?\}/g, '');
        }
      }

      if (chat.format === "PDF") {
        const url = base64ToBlobUrl(chat.file, "application/pdf");
        answerContent = (
          <div className="max-w-xl p-4 rounded-xl bg-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-indigo-400">PDF Report Available</span>
              <div className="space-x-2">
                <button
                  onClick={() => window.open(url, '_blank')}
                  className="px-3 py-1 bg-indigo-600/50 hover:bg-indigo-600 rounded-lg transition-colors duration-300"
                >
                  View PDF
                </button>
                <a
                  href={url}
                  download="report.pdf"
                  className="px-3 py-1 bg-indigo-600/50 hover:bg-indigo-600 rounded-lg transition-colors duration-300 inline-block"
                >
                  Download PDF
                </a>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {chat.markdown_content}
              </ReactMarkdown>
            </div>
          </div>
        );
      } else if (chat.format === "DOCX") {
        const url = base64ToBlobUrl(
          chat.file,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        answerContent = (
          <div className="max-w-xl p-4 rounded-xl bg-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-indigo-400">DOCX Report Available</span>
              <a
                href={url}
                download="report.docx"
                className="px-3 py-1 bg-indigo-600/50 hover:bg-indigo-600 rounded-lg transition-colors duration-300"
              >
                Download DOCX
              </a>
            </div>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {chat.markdown_content}
              </ReactMarkdown>
            </div>
          </div>
        );
      } else if (chat.format === "MARKDOWN" || chat.format === "HTML") {
        answerContent = (
          <div className="max-w-xl p-4 rounded-xl bg-white/10 backdrop-blur-md">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => (
                    <table style={markdownStyles.table} {...props} />
                  ),
                  th: ({node, ...props}) => (
                    <th style={markdownStyles.th} {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td style={markdownStyles.td} {...props} />
                  ),
                  code: ({node, inline, ...props}) => (
                    <code className={`${inline ? 'bg-gray-800 rounded px-1' : 'block bg-gray-800 p-4 rounded-lg'}`} {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 italic" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="ml-4" {...props} />
                  ),
                  svg: ({node, ...props}) => (
                    <svg {...props} />
                  )
                }}
              >
                {chat.markdown_content}
              </ReactMarkdown>
              {parsedGraphs && parsedGraphs.map((graphData, index) => (
                <div key={`graph-${idx}-${index}`} className="mt-4">
                  {graphData.visualizations.map((graph, graphIdx) => (
                    <div key={`viz-${idx}-${index}-${graphIdx}`} className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">{graph.title}</h3>
                      <GraphVisualizer graphData={graph} type={graph.type} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      }

      const aiMessage = (
        <div key={idx + "-ai"} className="flex justify-start animate-slideInLeft">
          <div className="max-w-xl w-full">
            {answerContent}
          </div>
        </div>
      );

      return (
        <React.Fragment key={idx}>
          {userMessage}
          {aiMessage}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white flex">
      {/* Sidebar */}
      <div className="w-80 bg-white/5 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col shadow-2xl transition-all duration-300">
        <a href="/project" className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors duration-300 mb-6 group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 25 25"
            className="w-5 h-5 mr-2 transform transition-transform group-hover:-translate-x-1"
            fill="currentColor"
          >
            <path d="M24 12.001H2.914l5.294-5.295-.707-.707L1 12.501l6.5 6.5.707-.707-5.293-5.293H24v-1z" />
          </svg>
          <span className="text-lg">Projects</span>
        </a>

        <button
          onClick={createNewSession}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600/90 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl mb-6"
        >
          <PlusIcon size={20} />
          <span>New Chat</span>
        </button>

        <div className="space-y-4 mt-2 flex-1 overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-semibold text-gray-200 px-2">Chat History</h3>
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className={`flex justify-between items-center
                p-4 rounded-xl cursor-pointer
                transition-all duration-300
                ${
                  selectedSession?.session_id === session.session_id
                    ? "bg-indigo-600/20 shadow-lg border border-indigo-500/30"
                    : "hover:bg-white/5 border border-transparent"
                }
              `}
              onClick={() => setSelectedSession(session)}
            >
              <div className="flex items-center space-x-3">
                <MessageCircleIcon size={20} className="text-indigo-400" />
                <span className="text-sm font-medium">{session.title.slice(0,20).concat("...")}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session);
                }}
                className="text-red-400 hover:text-red-300 transition-colors duration-300 p-1 rounded-lg hover:bg-red-500/10"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {chats.length > 0 ? (
            <>{renderChats()}</>
          ) : (
            <div className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
              <div className="text-center space-y-4 mb-12">
                <div className="text-6xl mb-4">💡</div>
                <h3 className="text-2xl font-semibold text-gray-300">
                  Ready to Analyze Your Social Media Performance?
                </h3>
                <p className="text-gray-400">
                  Choose from our suggested queries or type your own question
                </p>
              </div>
              
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                {SuggestionCategories.map((category, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 hover:border-indigo-500/50 transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-2xl">{category.icon}</span>
                      <h4 className="text-lg font-medium text-gray-200">
                        {category.title}
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {category.queries.map((query, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSuggestionClick(query)}
                          className="w-full text-left p-2 rounded-lg text-sm text-gray-300 hover:bg-indigo-600/20 hover:text-white transition-all duration-300 flex items-center space-x-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                          <span>{query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-400">
                  Pro tip: You can combine multiple aspects in your question for deeper insights
                </p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex space-x-4">
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="bg-gray-700/50 hover:bg-gray-700 text-white px-4 py-3 w-40 rounded-xl flex items-center justify-between transition-all duration-300 border border-white/10"
              >
                {selectedType.toUpperCase()}
                <svg
                  className={`ml-2 transform transition-transform duration-300 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M1.5 6.5l6 6 6-6H1.5z" />
                </svg>
              </button>

              {isDropdownOpen && (
                <ul className="absolute z-10 bottom-full left-0 mb-2 bg-gray-700/90 backdrop-blur-xl rounded-xl shadow-xl w-40 border border-white/10 overflow-hidden">
                  {documentTypes.map((type) => (
                    <li
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className="px-4 py-3 text-white hover:bg-indigo-600/50 cursor-pointer transition-colors duration-300"
                    >
                      {type.toUpperCase()}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
              disabled={isLoading}
            />

            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-indigo-600/90 hover:bg-indigo-600 text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:shadow-lg"
            >
              <SendIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;