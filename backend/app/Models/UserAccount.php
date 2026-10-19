<?php

namespace App\Models;

use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * A sign-in for any role (user_account). Alumni have one alumnus row; staff (dept, admin) have none.
 *
 * @property int $user_id
 * @property string $email
 * @property string $password_hash
 * @property string $role alumni | dept | admin
 * @property int|null $college_id
 * @property string $display_name
 * @property string|null $role_label
 * @property string $account_status pending | active | disabled
 * @property bool $must_change_password
 * @property int $failed_login_count
 * @property Carbon|null $locked_until
 * @property Carbon|null $last_login_at
 */
class UserAccount extends Model implements AuthenticatableContract
{
    use Authenticatable;

    protected $table = 'user_account';

    protected $primaryKey = 'user_id';

    protected $guarded = ['user_id', 'created_at', 'updated_at'];

    protected $hidden = ['password_hash'];

    protected function casts(): array
    {
        return [
            'must_change_password' => 'boolean',
            'locked_until' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function getRememberTokenName(): string
    {
        return '';
    }

    /** @return HasOne<Alumnus, $this> */
    public function alumnus(): HasOne
    {
        return $this->hasOne(Alumnus::class, 'user_id', 'user_id');
    }
}
