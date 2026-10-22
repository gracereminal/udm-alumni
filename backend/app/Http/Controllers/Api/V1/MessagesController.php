<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The Messages widget (role:alumni,dept,admin). Who may see or write a thread is decided by MessageService. */
class MessagesController extends Controller
{
    public function __construct(private readonly MessageService $messages) {}

    /** GET /messages/threads (the client polls every 20 s while signed in) */
    public function index(Request $request): JsonResponse
    {
        $threads = $this->messages->threads($this->user($request));

        return response()->json(['data' => $threads, 'meta' => ['unread' => array_sum(array_column($threads, 'unread'))]]);
    }

    /** POST /messages/threads { channel: office|college|admin, alumni_id? }: finds or starts a conversation. */
    public function open(Request $request): JsonResponse
    {
        $b = $request->validate(['channel' => 'required|in:office,college,admin', 'alumni_id' => 'nullable|integer|min:1']);

        return response()->json($this->messages->open($this->user($request), $b['channel'], isset($b['alumni_id']) ? (int) $b['alumni_id'] : null));
    }

    /** GET /messages/threads/:id: the messages, oldest first; marks the thread read. */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->messages->thread($this->user($request), $id));
    }

    /** POST /messages/threads/:id/messages { body } (throttle:messages) */
    public function send(Request $request, int $id): JsonResponse
    {
        $b = $request->validate(['body' => 'required|string|max:2000']);

        return response()->json($this->messages->send($this->user($request), $id, $b['body']), 201);
    }

    private function user(Request $request): UserAccount
    {
        $user = $request->user();

        return $user instanceof UserAccount ? $user : throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
    }
}
