export function validatePublicAppUrl(value: string, env = process.env.NODE_ENV) {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(env !== "production" && local && url.protocol === "http:")) {
    throw new Error("Prayerapp public URL must use HTTPS");
  }
  return url.toString();
}
