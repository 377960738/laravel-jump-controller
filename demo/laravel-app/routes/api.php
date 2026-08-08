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
