const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCJlG13t1Q5S8DJn6tFghWNw';
const CHANNEL_HANDLE = (process.env.YOUTUBE_HANDLE || 'IEA-ESCALADA').replace(/^@/, '');

const decodeXml = value => String(value || '')
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'");

function parseDateFromTitle(title) {
  const m = String(title || '').match(/\((\d{1,2})\/(\d{1,2})\/(\d{4})\)/);
  if (!m) return '';
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = m[3];
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

async function fetchFromChannelPage() {
  const response = await fetch(`https://www.youtube.com/@${CHANNEL_HANDLE}/videos`, {
    headers: {
      'Accept-Language': 'es-AR,es;q=0.9',
    },
  });
  if (!response.ok) throw new Error(`YouTube channel page respondió ${response.status}`);
  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!match) throw new Error('No se encontró ytInitialData en la página del canal.');

  const data = JSON.parse(match[1]);
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const videos = [];

  for (const tab of tabs) {
    const contents = tab?.tabRenderer?.content?.richGridRenderer?.contents;
    if (!Array.isArray(contents)) continue;

    for (const item of contents) {
      const content = item?.richItemRenderer?.content;
      const lvm = content?.lockupViewModel;
      const vr = content?.videoRenderer;

      if (lvm?.contentId) {
        const videoId = lvm.contentId;
        const title = lvm.metadata?.lockupMetadataViewModel?.title?.content || '';
        const parts = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts || [];
        const relativeDate = parts[parts.length - 1]?.text?.content || '';
        const published = parseDateFromTitle(title);
        if (videoId && title) {
          videos.push({
            videoId,
            title,
            published,
            date: relativeDate,
            href: `https://www.youtube.com/watch?v=${videoId}`,
          });
        }
      } else if (vr?.videoId) {
        const videoId = vr.videoId;
        const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
        const relativeDate = vr.publishedTimeText?.simpleText || '';
        const published = parseDateFromTitle(title);
        if (videoId && title) {
          videos.push({
            videoId,
            title,
            published,
            date: relativeDate,
            href: `https://www.youtube.com/watch?v=${videoId}`,
          });
        }
      }
    }
    if (videos.length > 0) break;
  }

  return videos;
}

async function fetchFromRss() {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  if (!response.ok) throw new Error(`YouTube RSS respondió ${response.status}`);
  const xml = await response.text();
  const videos = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  entries.forEach(entry => {
    const videoId = decodeXml(entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]);
    const title = decodeXml(entry.match(/<title>(.*?)<\/title>/s)?.[1]);
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || parseDateFromTitle(title);
    if (videoId && title) {
      videos.push({
        videoId,
        title,
        published,
        href: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  });
  videos.sort((a, b) => b.published.localeCompare(a.published));
  return videos;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).json({});
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    let videos = [];
    try {
      videos = await fetchFromChannelPage();
    } catch {
      videos = await fetchFromRss();
    }
    if (!videos.length) {
      videos = await fetchFromRss();
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      channelId: CHANNEL_ID,
      updatedAt: new Date().toISOString(),
      videos: videos.slice(0, 8),
    });
  } catch (error) {
    console.error('YouTube API error:', error);
    return res.status(502).json({ error: 'No se pudieron obtener los videos recientes.' });
  }
}
