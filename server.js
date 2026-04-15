import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get('/api/models', (req, res) => {
  res.json({
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o']
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, files } = req.body;
    
    let processedMessages = [...messages];
    if (files && files.length > 0 && processedMessages.length > 0) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg.role === 'user') {
        const content = [{ type: 'text', text: lastMsg.content }];
        for (const file of files) {
          if (file.type?.startsWith('image/')) {
            content.push({
              type: 'image_url',
              image_url: { url: `data:${file.type};base64,${file.data}` }
            });
          }
        }
        lastMsg.content = content;
      }
    }

    const stream = await openai.chat.completions.create({
      model: model,
      messages: processedMessages,
      stream: true,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) res.write(content);
    }
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro no servidor');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
