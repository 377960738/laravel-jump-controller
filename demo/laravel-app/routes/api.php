<?php

use Illuminate\Support\Facades\Route as Router;
use V1_1\Api\System\Dictonary;

Router::name('api_sy_dictionary.')
    ->resource(
        'system/dictionary/index',
        Dictonary::class,
    )
    ->only(['index', 'show']);

Router::apiSingleton('profile', Dictonary::class);

// Exact legacy-style sample: Composer PSR-4 resolves the unimported class.
Route::name('api_sy_dictionary_legacy.')
    ->resource('system/dictionary/legacy', V1_1\Api\System\Dictonary::class);
