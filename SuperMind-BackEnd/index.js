const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

class LangflowClient {
  constructor(baseURL, applicationToken) {
    this.baseURL = baseURL;
    this.applicationToken = applicationToken;
  }

  async post(endpoint, body, headers = { "Content-Type": "application/json" }) {
    headers["Authorization"] = `Bearer ${this.applicationToken}`;
    headers["Content-Type"] = "application/json";
    const url = `${this.baseURL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });

      const responseMessage = await response.json();
      if (!response.ok) {
        throw new Error(
          `${response.status} ${response.statusText} - ${JSON.stringify(
            responseMessage
          )}`
        );
      }
      return responseMessage;
    } catch (error) {
      console.error("Request Error:", error.message);
      throw error;
    }
  }

  async initiateSession(
    flowId,
    langflowId,
    inputValue,
    inputType = "chat",
    outputType = "chat",
    stream = false,
    tweaks = {}
  ) {
    const endpoint = `/lf/${langflowId}/api/v1/run/${flowId}?stream=${stream}`;
    return this.post(endpoint, {
      input_value: inputValue,
      input_type: inputType,
      output_type: outputType,
      tweaks: tweaks,
    });
  }

  handleStream(streamUrl, onUpdate, onClose, onError) {
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onUpdate(data);
    };

    eventSource.onerror = (event) => {
      console.error("Stream Error:", event);
      onError(event);
      eventSource.close();
    };

    eventSource.addEventListener("close", () => {
      onClose("Stream closed");
      eventSource.close();
    });

    return eventSource;
  }

  async runFlow(
    flowIdOrName,
    langflowId,
    inputValue,
    inputType = "chat",
    outputType = "chat",
    tweaks = {},
    stream = false,
    onUpdate,
    onClose,
    onError
  ) {
    try {
      const initResponse = await this.initiateSession(
        flowIdOrName,
        langflowId,
        inputValue,
        inputType,
        outputType,
        stream,
        tweaks
      );
      console.log("Init Response:", initResponse);
      if (
        stream &&
        initResponse &&
        initResponse.outputs &&
        initResponse.outputs[0].outputs[0].artifacts.stream_url
      ) {
        const streamUrl =
          initResponse.outputs[0].outputs[0].artifacts.stream_url;
        console.log(`Streaming from: ${streamUrl}`);
        this.handleStream(streamUrl, onUpdate, onClose, onError);
      }
      return initResponse;
    } catch (error) {
      console.error("Error running flow:", error);
      throw error;
    }
  }
}

// Express server setup
const app = express();
app.use(bodyParser.json());

// Configuration
const config = {
  flowIdOrName: process.env.FLOW_ID,
  langflowId: process.env.LANGFLOW_ID,
  applicationToken: process.env.APPLICATION_TOKEN,
  baseURL: process.env.BASE_URL,
};

// Initialize Langflow client
const langflowClient = new LangflowClient(
  config.baseURL,
  config.applicationToken
);

// Default tweaks
const defaultTweaks = {
  "AstraDBToolComponent-YBisf": {},
  "ChatOutput-XO9ot": {},
  "ChatInput-UvPl5": {},
  "Prompt-3jA5s": {},
  "ParseData-ZLQnJ": {},
  "GroqModel-bU8Um": {},
};

// POST endpoint to run the flow
app.post("/run-flow", async (req, res) => {
  try {
    const {
      inputValue,
      inputType = "chat",
      outputType = "chat",
      stream = false,
      tweaks = defaultTweaks,
    } = req.body;

    if (!inputValue) {
      return res.status(400).json({ error: "inputValue is required" });
    }

    const response = await langflowClient.runFlow(
      config.flowIdOrName,
      config.langflowId,
      inputValue,
      inputType,
      outputType,
      tweaks,
      stream,
      (data) => console.log("Received:", data.chunk),
      (message) => console.log("Stream Closed:", message),
      (error) => console.log("Stream Error:", error)
    );

    if (!stream && response && response.outputs) {
      const flowOutputs = response.outputs[0];
      const firstComponentOutputs = flowOutputs.outputs[0];
      const output = firstComponentOutputs.outputs.message;

      return res.json({
        success: true,
        message: output.message.text,
      });
    }

    return res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
