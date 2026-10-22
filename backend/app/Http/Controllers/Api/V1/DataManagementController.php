<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\ImportService;
use App\Services\RecordExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** AI Data Management (role:admin): masterlist import batches, the record export and their audit log. */
class DataManagementController extends Controller
{
    public function __construct(
        private readonly ImportService $imports,
        private readonly RecordExportService $exports,
    ) {}

    /** GET /imports: the batch still in review, if any ({ data: batch | null }). */
    public function current(): JsonResponse
    {
        return response()->json(['data' => $this->imports->current()]);
    }

    /** POST /imports (multipart file): CSV or .xlsx, up to 5 MB and Masterlist::MAX_ROWS rows. */
    public function upload(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:5120'], ['file.max' => 'The file must be 5 MB or smaller.']);

        return response()->json($this->imports->upload($request->file('file'), $this->user($request)), 201);
    }

    /** GET /imports/:id */
    public function show(int $id): JsonResponse
    {
        return response()->json($this->imports->show($id));
    }

    /** DELETE /imports/:id: discards a batch still in review ("Replace file"). */
    public function discard(Request $request, int $id): JsonResponse
    {
        $this->imports->discard($id, $this->user($request));

        return response()->json(['ok' => true]);
    }

    /** POST /imports/:id/validate: "Run AI validation". */
    public function validateBatch(Request $request, int $id): JsonResponse
    {
        return response()->json($this->imports->validate($id, $this->user($request)));
    }

    /** POST /imports/:id/rows/:rowId { action: accept|keep|edit|reject|undo, field, value } */
    public function decide(Request $request, int $id, int $rowId): JsonResponse
    {
        $b = $request->validate([
            'action' => 'required|in:accept,keep,edit,reject,undo',
            'field' => 'required_if:action,edit|nullable|in:'.implode(',', ImportService::EDIT_FIELDS),
            'value' => 'nullable|string|max:200',
        ]);

        return response()->json($this->imports->decide($id, $rowId, $b));
    }

    /** POST /imports/:id/confirm: "Confirm & sync". */
    public function confirm(Request $request, int $id): JsonResponse
    {
        return response()->json($this->imports->confirm($id, $this->user($request)));
    }

    /** POST /imports/:id/rollback: "Roll back this batch". */
    public function rollback(Request $request, int $id): JsonResponse
    {
        return response()->json($this->imports->rollback($id, $this->user($request)));
    }

    /** GET /imports/log?limit */
    public function log(Request $request): JsonResponse
    {
        $limit = (int) ($request->validate(['limit' => 'nullable|integer|between:1,200'])['limit'] ?? 100);

        return response()->json(['data' => $this->imports->log($limit)]);
    }

    /** GET /imports/export?college_id&batch&status&format: { total, rows, colleges, batches } without format, else the file. */
    public function export(Request $request): JsonResponse|Response
    {
        $f = $request->validate([
            'college_id' => 'nullable|integer|min:1',
            'batch' => 'nullable|integer|between:1950,2100',
            'status' => 'nullable|in:'.implode(',', RecordExportService::STATUSES),
            'format' => 'nullable|in:csv,xlsx',
        ]);
        if (empty($f['format'])) {
            return response()->json($this->exports->preview($f));
        }
        $file = $this->exports->file($f, $f['format'], $this->user($request));

        return response($file['body'], 200, [
            'Content-Type' => $file['type'],
            'Content-Disposition' => 'attachment; filename="'.$file['name'].'"',
            'X-Record-Count' => (string) $file['count'],
            'Cache-Control' => 'no-store',
        ]);
    }

    private function user(Request $request): UserAccount
    {
        /** @var UserAccount */
        return $request->user();
    }
}
