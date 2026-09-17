const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCJlG13t1Q5S8DJn6tFghWNw';

const decodeXml = value => String(value || '')
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'");

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
    if (!response.ok) throw new Error(`YouTube respondió ${response.status}`);
    const xml = await response.text();
    const videos = [];
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    entries.forEach(entry => {
      const videoId = decodeXml(entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]);
      const title = decodeXml(entry.match(/<title>(.*?)<\/title>/s)?.[1]);
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';
      if (videoId && title) videos.push({
        videoId,
        title,
        published,
        href: `https://www.youtube.com/watch?v=${videoId}`,
      });
    });
    videos.sort((a, b) => b.published.localeCompare(a.published));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ channelId: CHANNEL_ID, updatedAt: new Date().toISOString(), videos: videos.slice(0, 4) });
  } catch (error) {
    console.error('YouTube API error:', error);
    return res.status(502).json({ error: 'No se pudieron obtener los videos recientes.' });
  }
}
