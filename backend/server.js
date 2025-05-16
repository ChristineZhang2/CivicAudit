require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
const PORT = 5060;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Root test route
app.get("/", (req, res) => {
  res.send(`
    <h1>✅ CivicAudit Backend is Running</h1>
    <p>Try sending a POST request to <code>/api/audit</code> or <code>/chat</code> using curl or Postman.</p>
  `);
});


// Simple /chat test route
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message }
      ]
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).send("Something went wrong with /chat");
  }
});

// CivicAudit rubric logic
const rubric = [
  'Does the system show documentation of risk identification, mitigation strategies, and post-deployment monitoring procedures?',
  'Does the documentation show how datasets were selected, audited for bias, and processed with governance safeguards?',
  'Does the system provide technical documentation that meets minimum auditability and traceability standards?',
  'Are clear instructions provided to the deployer, including metrics, limitations, and interpretability guidance?',
  'Does the system allow human supervisors to monitor, override, or intervene in the AI’s operation?',
  'Are technical safeguards in place to ensure consistent, secure performance across contexts?',
  'Has the system been assessed for risks to fundamental rights, and is that assessment documented?'
];

const buildPrompt = (input) => `
You are an AI governance auditor. Evaluate the following system description using these 7 CivicAudit rubric questions:

${rubric.map((q, i) => `${i + 1}. ${q}`).join('\n')}

System Description:
"""
${input}
"""

Instructions:
- Score each question: 0 = not addressed, 1 = partially addressed, 2 = fully addressed.
- For each question, provide a short justification.
- At the end, suggest improvements for any scores below 2.
`;

app.post('/api/audit', async (req, res) => {
  try {
    const input = req.body.input;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful AI governance auditor.' },
        { role: 'user', content: buildPrompt(input) }
      ]
    });
    res.json({ output: completion.choices[0].message.content });
  } catch (err) {
    console.error("Audit error:", err);
    res.status(500).send('Audit failed');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ CivicAudit backend running at http://localhost:${PORT}`);
});

