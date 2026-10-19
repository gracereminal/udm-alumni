<?php

namespace App\Services;

use App\Exceptions\ApiException;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Uploaded files on the FILESYSTEM_DISK (local in development, s3 = any S3-compatible bucket in production).
 * Keys: public/… (profile photos, job logos, event covers; served by GET /files/public/…) and private/… (proof
 * documents; reachable only through a short-lived signed URL issued after a scope check).
 */
class StorageService
{
    /** Images up to 2 MB, proofs up to 5 MB (plan-backend "Files"). The type is read from the bytes (fileinfo). */
    public const LIMITS = [
        'image' => ['max' => 2 * 1024 * 1024, 'mimes' => ['image/jpeg', 'image/png', 'image/webp'], 'message' => 'Upload a JPG, PNG or WebP image.'],
        'proof' => ['max' => 5 * 1024 * 1024, 'mimes' => ['application/pdf', 'image/jpeg', 'image/png'], 'message' => 'Upload a PDF, JPG or PNG file.'],
    ];

    private const EXT = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];

    /**
     * Checks and stores an upload.
     *
     * @param  'image'|'proof'  $kind
     * @return array{key: string, mime: string, size: int}
     */
    public function store(?UploadedFile $file, string $kind, string $field = 'file'): array
    {
        $limit = self::LIMITS[$kind];
        if ($file === null || ! $file->isValid()) {
            throw new ApiException(422, 'Choose a file to upload.', 'validation', [$field => 'Choose a file to upload.']);
        }
        $size = (int) $file->getSize();
        if ($size > $limit['max']) {
            $mb = $limit['max'] / 1024 / 1024;
            throw new ApiException(422, "File is too large (max {$mb} MB).", 'validation', [$field => "File is too large (max {$mb} MB)."]);
        }
        $mime = (string) $file->getMimeType(); // from the content, not the name or the client's Content-Type
        if (! in_array($mime, $limit['mimes'], true)) {
            throw new ApiException(422, $limit['message'], 'validation', [$field => $limit['message']]);
        }

        $key = sprintf('%s/%s/%s.%s', $kind === 'proof' ? 'private' : 'public', now()->format('Y-m'), Str::uuid(), self::EXT[$mime]);
        if (! $this->disk()->putFileAs(dirname($key), $file, basename($key))) {
            throw new ApiException(500, 'The file could not be saved. Please try again.', 'storage_error');
        }

        return ['key' => $key, 'mime' => $mime, 'size' => $size];
    }

    public function delete(?string $key): void
    {
        if ($key !== null && self::validKey($key)) {
            $this->disk()->delete($key);
        }
    }

    /** Public files are served through the API on the same origin. */
    public static function publicUrl(?string $key): ?string
    {
        return $key === null || $key === '' ? null : '/api/v1/files/'.$key;
    }

    /** A short-lived URL for a private file (default 5 minutes). Call only after the scope check. */
    public function signedUrl(string $key, int $ttlSeconds = 300): string
    {
        if (config('filesystems.default') === 's3') {
            return $this->disk()->temporaryUrl($key, now()->addSeconds($ttlSeconds));
        }

        return URL::temporarySignedRoute('files.private', now()->addSeconds($ttlSeconds), ['path' => substr($key, strlen('private/'))], absolute: false);
    }

    public function response(string $key, bool $private): StreamedResponse
    {
        if (! self::validKey($key) || ! $this->disk()->exists($key)) {
            throw ApiException::notFound();
        }
        $mime = array_search(pathinfo($key, PATHINFO_EXTENSION), self::EXT, true) ?: 'application/octet-stream';

        return $this->disk()->response($key, basename($key), [
            'Content-Type' => $mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => $private ? 'private, no-store' : 'public, max-age=86400, immutable',
            'Cross-Origin-Resource-Policy' => 'same-origin',
        ], 'inline');
    }

    public static function validKey(string $key): bool
    {
        return preg_match('#^(public|private)/[\w\-/.]+$#', $key) === 1 && ! str_contains($key, '..');
    }

    private function disk(): FilesystemAdapter
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk();

        return $disk;
    }
}
