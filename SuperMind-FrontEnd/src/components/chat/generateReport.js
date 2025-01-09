import axios from "axios";
import { jsPDF } from "jspdf";

// If you still get errors, try this alternative import for jsPDF:
// import jsPDF from 'jspdf';

/**
 * Generates a report by sending a user query to the Langflow backend API.
 */
export const generateReport = async (
  newMessage,
  userId,
  projectId,
  selectedType,
  sessionId
) => {
  if (!newMessage || newMessage.trim().length === 0) {
    return { type: "error", content: "Please enter a valid message." };
  }

  const axiosConfig = {
    method: "post",
    url: `${process.env.REACT_APP_BACKEND_URL}/run-flow`,
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
      },
    },
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 30000,
    withCredentials: false, // Changed to false since we're allowing all origins
    validateStatus: function (status) {
      return status >= 200 && status < 500; // Accept all responses to handle them manually
    },
  };

  try {
    console.log("Sending request to backend:", axiosConfig.url);
    const response = await axios(axiosConfig);

    console.log("Received response:", response.data);

    if (!response.data || !response.data.success) {
      throw new Error(
        response.data?.error || "Failed to get response from server"
      );
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
          message = message.replace(/```json\n[\s\S]*?\n```/, "");
        }
      }
    } catch (error) {
      console.warn("Failed to parse graph data:", error);
    }

    // Based on the selectedType, format the response appropriately
    switch (selectedType) {
      case "PDF":
        return generatePDF(message);

      case "HTML":
        return generateHTML(message);

      case "MARKDOWN":
        return {
          type: "markdown",
          content: message,
          format: "MARKDOWN",
          graphData,
        };

      default:
        return {
          type: "markdown",
          content: message,
          format: "MARKDOWN",
          graphData,
        };
    }
  } catch (error) {
    console.error("Failed to generate report:", error);

    // Improved error messages based on error type
    let errorMessage = "Something went wrong, please try again.";

    if (error.code === "ECONNABORTED") {
      errorMessage = "Request timed out. Please try again.";
    } else if (error.code === "ERR_NETWORK") {
      errorMessage =
        "Could not connect to server. Please check if the backend server is running.";
    } else if (error.response) {
      errorMessage = error.response.data?.error || "Server error occurred.";
    } else if (error.request) {
      errorMessage =
        "Could not reach the server. Please check your internet connection.";
    }

    return {
      type: "error",
      content: errorMessage,
      format: "ERROR",
    };
  }
};

const generatePDF = async (content) => {
  const doc = new jsPDF();
  doc.setFont("helvetica");

  // Remove emojis and replace with text equivalents
  const emojiMap = {
    "📊": "[Graph]",
    "🕒️": "[Time]",
    "📈": "[Trend]",
    "💡": "[Insight]",
    "📝": "[Note]",
    "💭": "[Thought]",
    "🔍": "[Search]",
  };

  const cleanContent = content.replace(
    /[📊🕒️📈💡📝💭🔍]/g,
    (match) => emojiMap[match] || match
  );

  // Rest of the PDF generation logic
  const sections = cleanContent.split("###").filter(Boolean);
  let yPosition = 20;

  const formatText = (text, size, isBold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
  };

  const processTable = (tableContent, startY) => {
    const rows = tableContent
      .split("\n")
      .filter((row) => row.includes("|"))
      .map((row) =>
        row
          .split("|")
          .filter(Boolean)
          .map((cell) => cell.trim())
      );

    if (rows.length === 0) return startY;

    const columnWidths = Array(rows[0].length).fill(170 / rows[0].length);
    let currentY = startY;

    // Draw table lines
    rows.forEach((row, rowIndex) => {
      if (currentY > 280) {
        doc.addPage();
        currentY = 20;
      }

      let xPosition = 20;
      formatText(row[0], 10, rowIndex === 0);

      // Draw cells
      row.forEach((cell, cellIndex) => {
        // Draw cell border
        doc.rect(xPosition - 2, currentY - 5, columnWidths[cellIndex], 8);
        // Draw cell text
        doc.text(cell, xPosition, currentY);
        xPosition += columnWidths[cellIndex];
      });

      currentY += 10;
    });

    return currentY + 5;
  };

  // Title with icon replacement
  formatText("Social Media Analysis Report", 24, true);
  doc.text("[Graph] Social Media Analysis Report", 20, yPosition);
  yPosition += 20;

  sections.forEach((section) => {
    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }

    const lines = section.split("\n").filter(Boolean);

    lines.forEach((line) => {
      if (line.includes("**")) {
        const title = line.replace(/\*\*/g, "").trim();
        formatText(title, 14, true);
        doc.text(title, 20, yPosition);
        yPosition += 10;
        return;
      }

      if (line.includes("|")) {
        const tableContent = lines.filter((l) => l.includes("|")).join("\n");
        yPosition = processTable(tableContent, yPosition);
        return;
      }

      if (line.trim().startsWith("*")) {
        formatText(line.replace("*", "•").trim(), 12);
        const bulletText = line.replace("*", "•").trim();
        doc.text(bulletText, 25, yPosition);
        yPosition += 7;
        return;
      }

      if (line.trim()) {
        formatText(line.trim(), 12);
        const textLines = doc.splitTextToSize(line.trim(), 170);
        textLines.forEach((textLine) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(textLine, 20, yPosition);
          yPosition += 7;
        });
      }
    });

    yPosition += 5;
  });

  return {
    content,
    format: "PDF",
    file: doc.output("datauristring").split(",")[1],
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
    format: "HTML",
    file: htmlBase64,
  };
};
