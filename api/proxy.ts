import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const urlObj = new URL(targetUrl);
    // Add all other query parameters to the target URL
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'url') {
        urlObj.searchParams.set(key, String(value));
      }
    });

    const finalUrl = urlObj.toString();
    console.log(`Proxying request to: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get("content-type");
    const text = await response.text();

    if (text.includes("指令碼已完成") || text.includes("Script completed but did not return")) {
      console.warn("GAS Error detected in response:", text);
      return res.status(500).json({ 
        error: "Google Script Error", 
        details: "Script completed without returning a value. Check your GAS code logic and parameters.",
        raw: text 
      });
    }

    if (contentType && contentType.includes("application/json")) {
      try {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.parse(text));
      } catch (e) {
        res.status(200).send(text);
      }
    } else {
      res.status(200).send(text);
    }
  } catch (error: any) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: "Failed to fetch from target", details: error.message });
  }
}
