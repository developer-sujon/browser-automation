import { HttpsProxyAgent } from "https-proxy-agent";
import type { AxiosProxyConfig } from "axios";

export function createBrightProxy() {
  const user = process.env.BRIGHT_USER ?? process.env.BRIGHT_DATA_USERNAME;
  const pass = process.env.BRIGHT_PASS ?? process.env.BRIGHT_DATA_PASSWORD;
  const host =
    process.env.BRIGHT_HOST ??
    process.env.BRIGHT_DATA_HOST ??
    "zproxy.lum-superproxy.io";
  const port =
    process.env.BRIGHT_PORT ?? process.env.BRIGHT_DATA_PORT ?? "22225";

  const proxyUrl = new URL(`http://${host}:${port}`);
  proxyUrl.username = user ?? "";
  proxyUrl.password = pass ?? "";

  return new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
}

export function getAxiosProxyConfig(): AxiosProxyConfig {
  const user = process.env.BRIGHT_USER ?? process.env.BRIGHT_DATA_USERNAME;
  const pass = process.env.BRIGHT_PASS ?? process.env.BRIGHT_DATA_PASSWORD;
  const host =
    process.env.BRIGHT_HOST ?? process.env.BRIGHT_DATA_HOST ?? "zproxy.lum-superproxy.io";
  const port = Number(process.env.BRIGHT_PORT ?? process.env.BRIGHT_DATA_PORT ?? "22225");

  return {
    protocol: "http",
    host,
    port,
    auth: { username: user ?? "", password: pass ?? "" },
  };
}
