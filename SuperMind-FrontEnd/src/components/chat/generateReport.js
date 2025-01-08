import axios from "axios";
import { jsPDF } from 'jspdf';

// If you still get errors, try this alternative import for jsPDF:
// import jsPDF from 'jspdf';

/**
 * Generates a report by sending a user query to the Langflow backend API.
 */
export const generateReport = async (newMessage, userId, projectId, selectedType, sessionId) => {
  if (!newMessage || newMessage.trim().length === 0) {
    return { type: 'error', content: "Please enter a valid message." };
  }

  const axiosConfig = {
    method: 'post',
    url: "http://localhost:3000/run-flow", // Verify this is correct
    data: {
      inputValue: newMessage,
      inputType: "chat",
      outputType: "chat",
      stream: false,
      tweaks: {
        "AstraDBToolComponent-YBisf": {},
        "ChatOutput-XO9ot": {},
        "ChatInput-UvPl5": {},
        "Prompt-3jA5s": {},
        "ParseData-ZLQnJ": {},
        "GroqModel-bU8Um": {},
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000,
    withCredentials: false, // Changed to false since we're allowing all origins
    validateStatus: function (status) {
      return status >= 200 && status < 500; // Accept all responses to handle them manually
    }
  };

  try {
    console.log('Sending request to backend:', axiosConfig.url);
    const response = await axios(axiosConfig);
    
    console.log('Received response:', response.data);

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || "Failed to get response from server");
    }

    // Get the message from the response
    let message = response.data.message;
    let graphData = null;

    // Try to extract graph data from the message
    try {
      const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedData = JSON.parse(jsonMatch[1]);
        if (parsedData.visualizations) {
          graphData = parsedData.visualizations;
          message = message.replace(/```json\n[\s\S]*?\n```/, '');
        }
      }
    } catch (error) {
      console.warn("Failed to parse graph data:", error);
    }

    // Based on the selectedType, format the response appropriately
    switch (selectedType) {
      case 'PDF':
        return generatePDF(message);

      case 'HTML':
        return generateHTML(message);

      case 'MARKDOWN':
        return {
          type: 'markdown',
          content: message,
          format: 'MARKDOWN',
          graphData
        };

      default:
        return {
          type: 'markdown',
          content: message,
          format: 'MARKDOWN',
          graphData
        };
    }
  } catch (error) {
    console.error("Failed to generate report:", error);
    
    // Improved error messages based on error type
    let errorMessage = "Something went wrong, please try again.";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "Request timed out. Please try again.";
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = "Could not connect to server. Please check if the backend server is running.";
    } else if (error.response) {
      errorMessage = error.response.data?.error || "Server error occurred.";
    } else if (error.request) {
      errorMessage = "Could not reach the server. Please check your internet connection.";
    }

    return { 
      type: 'error', 
      content: errorMessage,
      format: 'ERROR'
    };
  }
};

const generatePDF = async (content) => {
  const doc = new jsPDF();
  
  // Configure PDF styling
  doc.setFont('helvetica');
  doc.setFontSize(12);
  
  // Add title
  doc.setFontSize(18);
  doc.text('Social Media Analysis Report', 20, 20);
  doc.setFontSize(12);
  
  // Split content into lines that fit the page width
  const lines = doc.splitTextToSize(content, 170);
  
  // Add content with proper spacing
  let yPosition = 40;
  lines.forEach(line => {
    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 20, yPosition);
    yPosition += 7;
  });

  // Convert to base64
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  
  return {
    content: content,
    format: 'PDF',
    file: pdfBase64
  };
};

const generateHTML = (content) => {
  // Convert markdown to HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Social Media Analysis Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2, h3 { color: #333; }
        .content { margin-top: 20px; }
        .charts { margin: 20px 0; }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <h1>Social Media Analysis Report</h1>
      <div class="content">
        ${content}
      </div>
    </body>
    </html>
  `;

  // Convert to base64
  const htmlBase64 = btoa(html);
  
  return {
    content: content,
    format: 'HTML',
    file: htmlBase64
  };
};