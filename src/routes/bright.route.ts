import { Hono } from "hono";
import { scrapeExample } from "../services/bright.service";

const brightRoute = new Hono();

brightRoute.get("/bright-test", async (c) => {
  try {
    const data = await scrapeExample();

    return c.json({
      success: true,
      scrapedFrom: "Bright Data",
      ...data,
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: err.message,
      },
      500
    );
  }
});

export default brightRoute;
