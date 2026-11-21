export function publicAssetUrl(projectUrl: string, objectPath: string): string {
  if (!objectPath) return '';
  if (!/^(?:brand\/[a-f0-9]{64}\.png|providers\/[a-z-]+-[a-f0-9]{64}\.(?:svg|png|webp))$/.test(objectPath)) throw new Error('Invalid public branding object path.');
  const project = new URL(projectUrl);
  if (!['https:', 'http:'].includes(project.protocol) || project.username || project.password || project.pathname !== '/' || project.search || project.hash) throw new Error('Invalid Supabase project URL.');
  return `${project.origin}/storage/v1/object/public/site-assets/${objectPath}`;
}

export function getBrandLogoUrl(): string {
  return publicAssetUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_BRAND_LOGO_PATH || '');
}
