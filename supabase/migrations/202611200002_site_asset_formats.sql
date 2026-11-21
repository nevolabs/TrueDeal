begin;
-- Only deployment-managed site assets accept SVG logos. Browser users still
-- have no write policy here; listing photos and private evidence are unchanged.
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','image/svg+xml']
where id='site-assets';
commit;
