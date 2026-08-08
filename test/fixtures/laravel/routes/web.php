<?php

use App\Http\Controllers\OrderController as Orders;

Route::controller(Orders::class)->group(function () {
    Route::get('/orders/{order}', 'show');
});
