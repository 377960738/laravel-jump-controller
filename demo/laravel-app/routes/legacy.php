<?php

Route::get('/legacy/users', 'Admin\\UserController@index');
Route::post('/legacy/users', 'Admin\\UserController::store');

Route::any('/legacy/home', [Home\\Index::class, 'index']);
