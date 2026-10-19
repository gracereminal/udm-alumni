<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * An error with a status and the API's error shape: { error, code?, fields? }.
 * Thrown from services and controllers; rendered in bootstrap/app.php.
 */
class ApiException extends RuntimeException
{
    /**
     * @param  array<string, string>|null  $fields  form field id => message, shown inline by the client
     */
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly ?string $errorCode = null,
        public readonly ?array $fields = null,
    ) {
        parent::__construct($message);
    }

    /** @return array{error: string, code?: string, fields?: array<string, string>} */
    public function body(): array
    {
        return array_filter([
            'error' => $this->getMessage(),
            'code' => $this->errorCode,
            'fields' => $this->fields,
        ], fn ($v) => $v !== null);
    }

    public static function notFound(string $message = 'Not found.'): self
    {
        return new self(404, $message, 'not_found');
    }

    public static function forbidden(string $message = 'You do not have access to this resource.'): self
    {
        return new self(403, $message, 'forbidden');
    }

    public static function conflict(string $message, ?string $code = 'conflict'): self
    {
        return new self(409, $message, $code);
    }
}
