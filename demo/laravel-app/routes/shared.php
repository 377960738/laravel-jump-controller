<?php

use App\Http\Controllers\SharedController;

// Verbatim reproduction from GitHub Issue #3.
Route::name('shared.')->prefix('/shared')->middleware('auth')->controller(SharedController::class)->group(function () {
    Route::get('/states', 'states')->name('states');
    Route::get('/convenios', 'convenios')->name('convenios');
});
