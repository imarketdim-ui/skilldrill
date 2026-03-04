-- Make certificates bucket private to prevent public browsing of sensitive documents
UPDATE storage.buckets SET public = false WHERE id = 'certificates';