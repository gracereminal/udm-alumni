<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AccountService;
use App\Services\AuditService;
use App\Services\SessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** Staff account management (role:admin), the screen equivalent of app:create-user. */
class UsersController extends Controller
{
    private const SELECT = <<<'SQL'
        SELECT u.user_id AS id, u.email, u.role, u.display_name AS name, u.role_label AS "roleLabel", u.account_status AS status,
               u.college_id AS "collegeId", c.name AS college, u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt",
               u.must_change_password AS "mustChangePassword"
          FROM user_account u LEFT JOIN college c ON c.college_id = u.college_id
        SQL;

    public function __construct(
        private readonly AuditService $audit,
        private readonly SessionService $sessions,
    ) {}

    /** GET /users?role=alumni|dept|admin (default: staff accounts) */
    public function index(Request $request): JsonResponse
    {
        $role = $request->validate(['role' => 'nullable|in:alumni,dept,admin'])['role'] ?? null;
        $rows = DB::select(self::SELECT.($role ? ' WHERE u.role = ?::user_role' : " WHERE u.role <> 'alumni'").' ORDER BY u.role, u.display_name, u.user_id', $role ? [$role] : []);

        return response()->json(['data' => $rows]);
    }

    /** POST /users { email, name, role: dept|admin, college_id, role_label }: returns the one-time password once. */
    public function store(Request $request): JsonResponse
    {
        $b = $request->validate([
            'email' => 'required|email|max:120', 'name' => 'required|string|max:120', 'role' => 'required|in:dept,admin',
            'college_id' => 'nullable|integer|exists:college,college_id', 'role_label' => 'nullable|string|max:60',
        ]);
        if ($b['role'] === 'dept' && empty($b['college_id'])) {
            throw new ApiException(422, 'College accounts need a college.', 'validation', ['college_id' => 'Select the college.']);
        }
        if (DB::table('user_account')->whereRaw('lower(email) = lower(?)', [$b['email']])->exists()) {
            throw new ApiException(409, 'An account with this email already exists.', 'email_taken', ['email' => 'Already in use.']);
        }
        $password = AccountService::oneTimePassword();
        $id = DB::transaction(function () use ($b, $password) {
            $id = (int) DB::table('user_account')->insertGetId([
                'email' => trim($b['email']), 'password_hash' => Hash::make($password), 'role' => $b['role'],
                'college_id' => $b['role'] === 'dept' ? $b['college_id'] : null, 'display_name' => trim($b['name']),
                'role_label' => $b['role_label'] ?? null, 'must_change_password' => true,
            ], 'user_id');
            $this->audit->log('user_created', 'user', $id, null, ['role' => $b['role'], 'via' => 'api']);

            return $id;
        });

        return response()->json(['user' => DB::selectOne(self::SELECT.' WHERE u.user_id = ?', [$id]), 'oneTimePassword' => $password], 201);
    }

    /**
     * PATCH /users/:id { name, role_label, college_id, status: active|disabled, reset_password }. Disabling, a college
     * change or a password reset signs the account out everywhere at once.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $b = $request->validate([
            'name' => 'nullable|string|max:120', 'role_label' => 'nullable|string|max:60', 'college_id' => 'nullable|integer|exists:college,college_id',
            'status' => 'nullable|in:active,disabled', 'reset_password' => 'nullable|boolean',
        ]);
        $actor = $request->user();
        if ($actor instanceof UserAccount && $actor->user_id === $id && ($b['status'] ?? null) === 'disabled') {
            throw new ApiException(422, 'You cannot disable your own account.', 'validation', ['status' => 'You cannot disable your own account.']);
        }
        $password = null;
        DB::transaction(function () use ($id, $b, &$password) {
            $u = DB::selectOne('SELECT * FROM user_account WHERE user_id = ? FOR UPDATE', [$id]) ?? throw ApiException::notFound();
            $set = array_filter([
                'display_name' => isset($b['name']) ? trim($b['name']) : null,
                'role_label' => $b['role_label'] ?? null,
                'college_id' => $u->role === 'dept' ? ($b['college_id'] ?? null) : null,
                'account_status' => $b['status'] ?? null,
            ], fn ($v) => $v !== null);
            if (! empty($b['reset_password'])) {
                $password = AccountService::oneTimePassword();
                $set += ['password_hash' => Hash::make($password), 'must_change_password' => true];
            }
            if ($set !== []) {
                DB::table('user_account')->where('user_id', $id)->update($set);
            }
            $collegeChanged = isset($set['college_id']) && (int) $set['college_id'] !== (int) $u->college_id;
            if (($b['status'] ?? null) === 'disabled' || ! empty($b['reset_password']) || $collegeChanged) {
                $this->sessions->revokeAll($id);
            }
            $this->audit->log('user_updated', 'user', $id, null, ['fields' => array_keys($set), 'reset_password' => ! empty($b['reset_password'])]);
        });

        return response()->json(['user' => DB::selectOne(self::SELECT.' WHERE u.user_id = ?', [$id])] + ($password ? ['oneTimePassword' => $password] : []));
    }
}
