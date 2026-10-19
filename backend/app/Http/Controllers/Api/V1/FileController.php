<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\StorageService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves stored files on the API's own origin. public/… is open (photos, logos, covers); private/… (proof documents)
 * needs a valid, unexpired relative signature, issued only after a scope check (see StorageService::signedUrl).
 */
class FileController extends Controller
{
    public function __construct(private readonly StorageService $storage) {}

    /** GET /files/public/{path} */
    public function public(string $path): StreamedResponse
    {
        return $this->storage->response("public/{$path}", false);
    }

    /** GET /files/private/{path}?expires&signature (signed:relative middleware) */
    public function private(string $path): StreamedResponse
    {
        return $this->storage->response("private/{$path}", true);
    }
}
