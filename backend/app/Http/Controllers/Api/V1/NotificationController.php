<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Support\Lists;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** The topbar bell: own notifications only. Read state is a column, so it follows the user across devices. */
class NotificationController extends Controller
{
    /** GET /notifications?unread=1&page&per_page (the client polls every 30–60 s) */
    public function index(Request $request): JsonResponse
    {
        $uid = $this->uid($request);
        $onlyUnread = in_array($request->query('unread'), ['1', 'true'], true);
        [$page, $per] = Lists::paging($request, 30);
        $q = DB::table('notification')->where('user_id', $uid)->when($onlyUnread, fn ($q) => $q->whereNull('read_at'));
        $total = (clone $q)->count();
        $rows = $q->orderByDesc('created_at')->orderByDesc('notification_id')->forPage($page, $per)->get();
        $unread = DB::table('notification')->where('user_id', $uid)->whereNull('read_at')->count();

        return response()->json(Lists::out($rows->map(self::out(...)), $total, $page, $per, ['unread' => $unread]));
    }

    /** POST /notifications/:id/read */
    public function read(Request $request, int $id): JsonResponse
    {
        $row = DB::selectOne('UPDATE notification SET read_at = COALESCE(read_at, now()) WHERE notification_id = ? AND user_id = ? RETURNING *', [$id, $this->uid($request)]);

        return $row === null ? throw ApiException::notFound() : response()->json(self::out($row));
    }

    /** POST /notifications/read-all */
    public function readAll(Request $request): JsonResponse
    {
        return response()->json(['ok' => true, 'updated' => DB::update('UPDATE notification SET read_at = now() WHERE user_id = ? AND read_at IS NULL', [$this->uid($request)])]);
    }

    /** @return array<string, mixed> */
    private static function out(object $n): array
    {
        return ['id' => (int) $n->notification_id, 'type' => $n->type, 'title' => $n->title, 'body' => $n->message, 'to' => $n->link_url,
            'createdAt' => $n->created_at, 'readAt' => $n->read_at, 'read' => $n->read_at !== null];
    }

    private function uid(Request $request): int
    {
        $user = $request->user();

        return $user instanceof UserAccount ? $user->user_id : throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
    }
}
