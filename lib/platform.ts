export function isAndroidUserAgent(userAgent: string) {
  return /\bAndroid\b/iu.test(userAgent);
}
