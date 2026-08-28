import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('FortyGuard API Proxy Server');
});

// Job status polling - forwarded verbatim
app.get('/status/:id', async (req, res) => {
  try {
    const apiKey = "a65c8b5d2ab8235c0138fb2020621e40";

    const response = await fetch(`https://api.fortyguard.com/v1/status/${req.params.id}`, {
      method: 'GET',
      headers: { 'api-key': apiKey }
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: true, message: 'Failed to check job status' });
  }
});

app.post('/heatmap', async (req, res) => {
  try {
    const apiKey = "a65c8b5d2ab8235c0138fb2020621e40";

    console.log('Proxying heatmap request:', {
      polygon: req.body.polygon_aoi,
      date: req.body.date_time
    });

    const response = await fetch('https://api.fortyguard.com/v1/heatmap', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    console.log('FortyGuard response status:', response.status);

    const data = await response.json();
    console.log('FortyGuard response:', data);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: true,
      message: 'Failed to proxy request to FortyGuard API',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/temperature', async (req, res) => {
  try {
    const apiKey = "a65c8b5d2ab8235c0138fb2020621e40";
    const { lat, lon, radius_km = 3 } = req.query;

    console.log('Proxying temperature request:', { lat, lon, radius_km });

    const response = await fetch(
      `https://api.fortyguard.com/v1/temperature?lat=${lat}&lon=${lon}&radius_km=${radius_km}`,
      {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('FortyGuard temperature response status:', response.status);

    const data = await response.json();
    console.log('FortyGuard temperature response:', data);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: true,
      message: 'Failed to proxy request to FortyGuard API',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`FortyGuard proxy server running on http://localhost:${PORT}`);
});