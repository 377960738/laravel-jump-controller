<?php

use App\Http\Controllers\InvokableReportController;
use App\Http\Controllers\InheritedOrderController;
use App\Http\Controllers\OrderController as Orders;
use App\Http\Controllers\{PhotoController, PostController};

Route::get('/orders', [Orders::class, 'index']);
Route::get('/inherited-orders', [InheritedOrderController::class, 'inheritedIndex']);

Route::get(
    '/orders/{order}',
    [Orders::class, 'show'],
)->name('orders.show');

Route::match(['get', 'post'], '/reports', [Orders::class, 'report']);
Route::post('/reports/run', InvokableReportController::class);

Route::resource('photos', PhotoController::class)->only(['index', 'show']);

Route::apiResources([
    'photos' => PhotoController::class,
    'posts' => PostController::class,
]);
