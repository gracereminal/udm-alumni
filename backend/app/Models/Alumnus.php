<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per person (alumnus). Records, Directory, Profile and the Survey are all views of it.
 * Changes go through services that also write record_review and audit_log (sync rule 7).
 *
 * @property int $alumni_id
 * @property int|null $user_id
 * @property int|null $program_id
 * @property int $year_graduated
 */
class Alumnus extends Model
{
    protected $table = 'alumnus';

    protected $primaryKey = 'alumni_id';

    protected $guarded = ['alumni_id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'is_indigenous' => 'boolean',
            'directory_opt_in' => 'boolean',
            'show_email' => 'boolean',
            'show_mobile' => 'boolean',
            'archived_at' => 'datetime',
            'privacy_consent_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<UserAccount, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(UserAccount::class, 'user_id', 'user_id');
    }
}
