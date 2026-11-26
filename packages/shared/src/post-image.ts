export const POST_IMAGE_PATH_PREFIX = "/api/v1/files/";

const POST_IMAGE_PATH =
  /^\/api\/v1\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const EXTERNAL_IMAGE_URL = /^https:\/\/[^\s"'()<>\\]+$/;

export function postImagePath(fileId: string): string {
  return `${POST_IMAGE_PATH_PREFIX}${fileId}`;
}

export function postImageId(url: string): string | null {
  return POST_IMAGE_PATH.exec(url)?.[1] ?? null;
}

export function isPostImageUrl(url: string): boolean {
  return POST_IMAGE_PATH.test(url) || EXTERNAL_IMAGE_URL.test(url);
}
