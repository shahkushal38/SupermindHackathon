
# 📊 Social Media Performance Analysis

A basic analytics module to analyze engagement data from mock social media accounts. This project leverages **Langflow** for workflow creation, **GPT integration** for insights generation, and **DataStax Astra DB** for database operations.

---

## 🏗️ Project Overview

The goal of this project is to build a streamlined system that fetches, analyzes, and visualizes social media engagement data, providing actionable insights to improve performance. 

### Key Objectives:
1. **Fetch Engagement Data**:  
   Simulate social media engagement metrics (likes, shares, comments, post types) and store them in a DataStax Astra DB database.

2. **Analyze Post Performance**:  
   Build a Langflow workflow that:
   - Accepts post types (e.g., carousel, reels, static images) as input.
   - Queries Astra DB to calculate average engagement metrics for each post type.

3. **Provide Insights**:  
   Use GPT integration in Langflow to generate simple, actionable insights, such as:  
   - "Carousel posts have 20% higher engagement than static posts."
   - "Reels drive 2x more comments compared to other formats."

---

## 🛠️ Tools & Technologies Used

- **[Langflow](https://github.com/logspace-ai/langflow)**: Workflow creation and GPT integration.
- **[DataStax Astra DB](https://www.datastax.com/astra)**: Cloud-native NoSQL database for storing engagement data.
- **Frontend**: Built with [React](https://reactjs.org/) to display visualizations and insights.
- **Backend**: APIs for fetching and analyzing data using [ExpressJS](https://expressjs.com/).
---

## 📋 Features

1. **Data Storage**:
   - Engagement data simulation (e.g., post types, likes, shares, comments).
   - Securely stored in Astra DB.

2. **Post Performance Analysis**:
   - Query engagement metrics by post type using Langflow.
   - Calculate averages for metrics like likes, comments, and shares.

3. **Actionable Insights**:
   - GPT generates insights based on engagement data.
   - Example: "Reels have the highest engagement rate across all formats."

4. **Interactive Frontend**:
   - Visualize insights and engagement metrics through intuitive charts and graphs.
   - Built with React and designed for ease of use.

5. **Backend APIs**:
   - APIs for querying Astra DB and serving data to the frontend.
   - Integration with Langflow workflows.

---

## 📂 Repository Structure

```
📦 social-media-performance-analysis
├── frontend/                # React-based frontend for displaying insights
├── backend/                 # APIs for fetching and analyzing data
│   ├── index.js             # Main API server
│   └── routes/              # API routes
├── langflow_workflows/      # Langflow workflows for data analysis
│   └── analyze_post_type.json
├── datasets/                # Mock engagement datasets
│   └── engagement_data.csv
├── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

1. **Astra DB**:  
   - Create a free database on [DataStax Astra DB](https://www.datastax.com/astra).
   - Note the `Database ID`, `Region`, and `Secure Connect Bundle`.

2. **Langflow**:  
   - Install Langflow locally or use the hosted version.

3. **Dependencies**:  
   - Install Node.js, and npm.

---

### Installation

#### Backend Setup:
1. Clone the repository:
   ```bash
   git clone https://github.com/shahkushal38/SupermindHackathon.git
   cd SupermindHackathon/SuperMind-BackEnd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the backend and frontend server respectively with:
   ```bash
   npm start
      ```

#### Frontend Setup:
1. Navigate to the frontend directory:
   ```bash
   cd SupermindHackathon/SuperMind-FrontEnd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

#### Langflow Setup:
1. Open Langflow and import the workflow file:
   - Go to the `langflow_workflows/` folder.
   - Import `analyze_post_type.json`.

---

### Insights Example
```
- Carousel posts have 20% higher engagement than static posts.
- Reels drive 2x more comments compared to other formats.
```

---

## 🤝 Contributing

We welcome contributions!  
Feel free to open an issue or submit a pull request if you'd like to add features or fix bugs.

---

## 📝 License

This project is licensed under the MIT License.

---

## 📧 Contact

For any questions or suggestions, please contact:  
**Your Name** - [shahkushal38@gmail.com](mailto:shahkushal38@gmail.com)

--- 

Let me know if you'd like to customize further!
