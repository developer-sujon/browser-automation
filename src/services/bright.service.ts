import axios from "axios";
import * as cheerio from "cheerio";
import { createBrightProxy } from "../utils/proxy";

export async function scrapeExample() {
  const proxyAgent = createBrightProxy();

  const res = await axios.get("https://willro.com", {
    httpsAgent: proxyAgent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(res.data);

  console.log($("meta[name='description']").attr("content"));

  return {
    title: $("title").text(),
  };
}
