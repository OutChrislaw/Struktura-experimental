<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SkillController;
use App\Http\Controllers\Api\UserController;
use App\Models\Role;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Stateless JSON API consumed by the Next.js frontend. Authentication is
| via Sanctum bearer tokens.
|
*/

Route::prefix('v1')->group(function () {
    // ---- Public ----
    Route::post('/login', [AuthController::class, 'login']);

    // ---- Authenticated ----
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        // Roles are read-only system data; any authenticated user may list them.
        Route::get('/roles', [RoleController::class, 'index']);

        // User & Role Management — Admin only.
        Route::middleware('role:'.Role::ADMIN)->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::get('/users/{user}', [UserController::class, 'show']);
            Route::match(['put', 'patch'], '/users/{user}', [UserController::class, 'update']);
            Route::patch('/users/{user}/deactivate', [UserController::class, 'deactivate']);
            Route::patch('/users/{user}/activate', [UserController::class, 'activate']);

            // System Administrator console data.
            Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
            Route::get('/admin/projects', [AdminController::class, 'projects']);
            Route::get('/admin/phases', [AdminController::class, 'phases']);
            Route::get('/admin/assignments', [AdminController::class, 'assignments']);
            Route::get('/admin/resources', [AdminController::class, 'resources']);
            Route::get('/admin/audit/events', [AdminController::class, 'auditEvents']);
            Route::get('/admin/audit/logins', [AdminController::class, 'auditLogins']);
            Route::get('/admin/audit/db', [AdminController::class, 'auditDb']);
            Route::get('/admin/database', [AdminController::class, 'database']);
            Route::get('/admin/system', [AdminController::class, 'system']);
            Route::get('/admin/search', [AdminController::class, 'search']);

            // Skill catalog (system reference data).
            Route::get('/skills', [SkillController::class, 'index']);
            Route::post('/skills', [SkillController::class, 'store']);
            Route::put('/skills/{skill}', [SkillController::class, 'update']);
            Route::delete('/skills/{skill}', [SkillController::class, 'destroy']);
        });
    });
});
